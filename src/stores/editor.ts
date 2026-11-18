import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  Building,
  Floor,
  MapDocument,
  Room,
  Selection,
  VerticalLink,
  Wall,
  NavNode,
  Pin,
} from '@/types/map'
import {
  createBuilding,
  createEmptyDocument,
  createFloor,
  findBuildingOfFloor,
  findFloor,
  floorLabel,
} from '@/core/document'
import { loadDocument, loadPrefs, saveDocument, savePrefs, type EditorPrefs } from '@/core/persistence'
import { parseDocument } from '@/core/portability'
import { uid } from '@/core/id'
import seedRs from '@/data/seed-rs.json'

export type ToolId = 'select' | 'pan' | 'wall' | 'room' | 'door' | 'node' | 'pin'

/** Dua cara pakai aplikasi: penyusun peta (editor) atau pengunjung (pencari rute). */
export type AppMode = 'editor' | 'route'

export interface DraftState {
  tool: ToolId
  points: { x: number; y: number }[]
}

const MAX_HISTORY = 60

export const useEditorStore = defineStore('editor', () => {
  const doc = ref<MapDocument>(createEmptyDocument())
  const activeFloorId = ref<string>(doc.value.buildings[0].floors[0].id)
  const selection = ref<Selection | null>(null)
  const tool = ref<ToolId>('select')
  const prefs = reactive<EditorPrefs>(loadPrefs())
  const zoom = ref(1)
  const pointer = ref({ x: 0, y: 0 })
  const ready = ref(false)
  const dirty = ref(false)
  const mode = ref<AppMode>('editor')
  const draft = reactive<DraftState>({ tool: 'select', points: [] })

  const past = ref<string[]>([])
  const future = ref<string[]>([])
  let txnSnapshot: string | null = null

  const activeFloor = computed<Floor | undefined>(() => findFloor(doc.value, activeFloorId.value))
  const activeBuilding = computed<Building | undefined>(() =>
    findBuildingOfFloor(doc.value, activeFloorId.value),
  )
  const activeFloorName = computed(() =>
    activeFloorId.value ? floorLabel(doc.value, activeFloorId.value) : '-',
  )

  const allFloors = computed(() => {
    const list: { building: Building; floor: Floor }[] = []
    for (const building of doc.value.buildings) {
      for (const floor of building.floors) list.push({ building, floor })
    }
    return list
  })

  const selectedRoom = computed<Room | null>(() => {
    if (selection.value?.kind !== 'room' || !activeFloor.value) return null
    return activeFloor.value.rooms.find((r) => r.id === selection.value?.id) ?? null
  })

  const selectedWall = computed<Wall | null>(() => {
    if (selection.value?.kind !== 'wall' || !activeFloor.value) return null
    return activeFloor.value.walls.find((w) => w.id === selection.value?.id) ?? null
  })

  const selectedNode = computed<NavNode | null>(() => {
    if (selection.value?.kind !== 'node' || !activeFloor.value) return null
    return activeFloor.value.nodes.find((n) => n.id === selection.value?.id) ?? null
  })

  const selectedPin = computed<Pin | null>(() => {
    if (selection.value?.kind !== 'pin' || !activeFloor.value) return null
    return activeFloor.value.pins.find((p) => p.id === selection.value?.id) ?? null
  })

  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)

  function snapshot(): string {
    return JSON.stringify(doc.value)
  }

  function restore(json: string): void {
    doc.value = JSON.parse(json) as MapDocument
    if (!findFloor(doc.value, activeFloorId.value)) {
      const first = doc.value.buildings[0]?.floors[0]
      if (first) activeFloorId.value = first.id
    }
  }

  function markSaved(): void {
    dirty.value = false
    void persist()
  }

  async function persist(): Promise<void> {
    try {
      await saveDocument(doc.value)
    } catch {
      // penyimpanan lokal gagal (mis. mode privat) — editor tetap bisa dipakai
    }
  }

  /** Perubahan tunggal dengan dukungan undo. */
  function mutate(fn: () => void): void {
    const before = snapshot()
    fn()
    past.value.push(before)
    if (past.value.length > MAX_HISTORY) past.value.shift()
    future.value = []
    doc.value.updatedAt = new Date().toISOString()
    dirty.value = true
    void persist()
  }

  /** Untuk operasi drag: simpan snapshot sekali di awal, commit di akhir. */
  function beginTransaction(): void {
    if (txnSnapshot === null) txnSnapshot = snapshot()
  }

  function endTransaction(changed = true): void {
    if (txnSnapshot === null) return
    if (changed) {
      past.value.push(txnSnapshot)
      if (past.value.length > MAX_HISTORY) past.value.shift()
      future.value = []
      doc.value.updatedAt = new Date().toISOString()
      dirty.value = true
      void persist()
    }
    txnSnapshot = null
  }

  function undo(): void {
    const previous = past.value.pop()
    if (!previous) return
    future.value.push(snapshot())
    restore(previous)
    dirty.value = true
    void persist()
  }

  function redo(): void {
    const next = future.value.pop()
    if (!next) return
    past.value.push(snapshot())
    restore(next)
    dirty.value = true
    void persist()
  }

  function setTool(next: ToolId): void {
    tool.value = next
    draft.points = []
    draft.tool = next
  }

  function select(next: Selection | null): void {
    selection.value = next
  }

  function setActiveFloor(floorId: string): void {
    activeFloorId.value = floorId
    selection.value = null
    draft.points = []
  }

  function updatePrefs(patch: Partial<EditorPrefs>): void {
    Object.assign(prefs, patch)
    savePrefs({ ...prefs })
  }

  // ---------- Gedung & lantai ----------
  function addBuilding(name: string, code: string): Building {
    const building = createBuilding(name, code)
    mutate(() => {
      doc.value.buildings.push(building)
    })
    activeFloorId.value = building.floors[0].id
    return building
  }

  function renameBuilding(buildingId: string, name: string, code: string): void {
    mutate(() => {
      const building = doc.value.buildings.find((b) => b.id === buildingId)
      if (!building) return
      building.name = name
      building.code = code
    })
  }

  function removeBuilding(buildingId: string): void {
    mutate(() => {
      const building = doc.value.buildings.find((b) => b.id === buildingId)
      if (!building) return
      const floorIds = new Set(building.floors.map((f) => f.id))
      doc.value.links = doc.value.links.filter(
        (l) => !floorIds.has(l.fromFloorId) && !floorIds.has(l.toFloorId),
      )
      doc.value.buildings = doc.value.buildings.filter((b) => b.id !== buildingId)
    })
    if (!findFloor(doc.value, activeFloorId.value)) {
      const first = doc.value.buildings[0]?.floors[0]
      activeFloorId.value = first ? first.id : ''
    }
  }

  function addFloor(buildingId: string, name: string, code: string, level: number): void {
    const floor = createFloor(buildingId, name, code, level)
    mutate(() => {
      const building = doc.value.buildings.find((b) => b.id === buildingId)
      if (!building) return
      building.floors.push(floor)
      building.floors.sort((a, b) => a.level - b.level)
    })
    activeFloorId.value = floor.id
  }

  function updateFloor(floorId: string, patch: Partial<Pick<Floor, 'name' | 'code' | 'level'>>): void {
    mutate(() => {
      const floor = findFloor(doc.value, floorId)
      if (!floor) return
      Object.assign(floor, patch)
      const building = findBuildingOfFloor(doc.value, floorId)
      building?.floors.sort((a, b) => a.level - b.level)
    })
  }

  function removeFloor(floorId: string): void {
    mutate(() => {
      const building = findBuildingOfFloor(doc.value, floorId)
      if (!building || building.floors.length <= 1) return
      building.floors = building.floors.filter((f) => f.id !== floorId)
      doc.value.links = doc.value.links.filter(
        (l) => l.fromFloorId !== floorId && l.toFloorId !== floorId,
      )
    })
    if (!findFloor(doc.value, activeFloorId.value)) {
      const first = doc.value.buildings[0]?.floors[0]
      activeFloorId.value = first ? first.id : ''
    }
  }

  function updateFloorSize(width: number, height: number): void {
    mutate(() => {
      const floor = activeFloor.value
      if (!floor) return
      floor.size = { width: Math.max(200, width), height: Math.max(200, height) }
    })
  }

  function setBackground(src: string, width: number, height: number): void {
    mutate(() => {
      const floor = activeFloor.value
      if (!floor) return
      floor.background = { src, width, height, opacity: 0.85 }
      floor.size = { width, height }
    })
  }

  function updateBackground(patch: Partial<{ opacity: number }>): void {
    mutate(() => {
      const floor = activeFloor.value
      if (!floor?.background) return
      Object.assign(floor.background, patch)
    })
  }

  function removeBackground(): void {
    mutate(() => {
      const floor = activeFloor.value
      if (!floor) return
      floor.background = null
    })
  }

  // ---------- Entitas lantai ----------
  function addWall(points: { x: number; y: number }[], kind: Wall['kind'] = 'dinding'): void {
    if (points.length < 2) return
    mutate(() => {
      activeFloor.value?.walls.push({
        id: uid('wl'),
        kind,
        thickness: kind === 'luar' ? 14 : kind === 'partisi' ? 6 : 10,
        points: points.map((p) => ({ ...p })),
      })
    })
  }

  function addRoom(polygon: { x: number; y: number }[], category: Room['category'] = 'lainnya'): void {
    if (polygon.length < 3) return
    let index = 1
    const existing = activeFloor.value?.rooms.length ?? 0
    index = existing + 1
    const room: Room = {
      id: uid('rm'),
      name: `Ruangan ${index}`,
      code: '',
      category,
      note: '',
      polygon: polygon.map((p) => ({ ...p })),
    }
    mutate(() => {
      activeFloor.value?.rooms.push(room)
    })
    selection.value = { kind: 'room', id: room.id }
  }

  function updateRoom(roomId: string, patch: Partial<Room>): void {
    mutate(() => {
      const room = activeFloor.value?.rooms.find((r) => r.id === roomId)
      if (!room) return
      Object.assign(room, patch)
    })
  }

  function addNode(x: number, y: number, type: NavNode['type'] = 'walk'): NavNode | null {
    const floor = activeFloor.value
    if (!floor) return null
    const node: NavNode = {
      id: uid('nd'),
      type,
      label: '',
      position: { x, y },
    }
    mutate(() => {
      floor.nodes.push(node)
    })
    selection.value = { kind: 'node', id: node.id }
    return node
  }

  function updateNode(nodeId: string, patch: Partial<NavNode>): void {
    mutate(() => {
      const node = activeFloor.value?.nodes.find((n) => n.id === nodeId)
      if (!node) return
      Object.assign(node, patch)
    })
  }

  function addEdge(from: string, to: string): void {
    if (from === to) return
    const floor = activeFloor.value
    if (!floor) return
    const exists = floor.edges.some(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
    )
    if (exists) return
    mutate(() => {
      floor.edges.push({ id: uid('eg'), from, to })
    })
  }

  function addPin(x: number, y: number, nodeId: string | null): void {
    const floor = activeFloor.value
    if (!floor) return
    const pin: Pin = {
      id: uid('pn'),
      label: `Lokasi ${floor.pins.length + 1}`,
      category: 'lainnya',
      note: '',
      position: { x, y },
      nodeId,
    }
    mutate(() => {
      floor.pins.push(pin)
      if (nodeId) {
        const exists = floor.edges.some(
          (e) =>
            (e.from === pin.id && e.to === nodeId) || (e.from === nodeId && e.to === pin.id),
        )
        if (!exists) floor.edges.push({ id: uid('eg'), from: pin.id, to: nodeId })
      }
    })
    selection.value = { kind: 'pin', id: pin.id }
  }

  function updatePin(pinId: string, patch: Partial<Pin>): void {
    mutate(() => {
      const floor = activeFloor.value
      const pin = floor?.pins.find((p) => p.id === pinId)
      if (!floor || !pin) return
      const previousNode = pin.nodeId
      Object.assign(pin, patch)
      if (patch.nodeId !== undefined && previousNode !== pin.nodeId) {
        floor.edges = floor.edges.filter((e) => e.from !== pin.id && e.to !== pin.id)
        if (pin.nodeId) {
          floor.edges.push({ id: uid('eg'), from: pin.id, to: pin.nodeId })
        }
      }
    })
  }

  function addDoor(x: number, y: number, rotation = 0): void {
    mutate(() => {
      activeFloor.value?.doors.push({
        id: uid('dr'),
        position: { x, y },
        width: 60,
        rotation,
      })
    })
  }

  function updateDoor(doorId: string, patch: { width?: number; rotation?: number }): void {
    mutate(() => {
      const door = activeFloor.value?.doors.find((d) => d.id === doorId)
      if (!door) return
      Object.assign(door, patch)
    })
  }

  function removeEntity(kind: Selection['kind'], id: string): void {
    const floor = activeFloor.value
    if (!floor) return
    mutate(() => {
      switch (kind) {
        case 'wall':
          floor.walls = floor.walls.filter((w) => w.id !== id)
          break
        case 'room':
          floor.rooms = floor.rooms.filter((r) => r.id !== id)
          break
        case 'door':
          floor.doors = floor.doors.filter((d) => d.id !== id)
          break
        case 'node':
          floor.nodes = floor.nodes.filter((n) => n.id !== id)
          floor.edges = floor.edges.filter((e) => e.from !== id && e.to !== id)
          floor.pins = floor.pins.map((p) => (p.nodeId === id ? { ...p, nodeId: null } : p))
          doc.value.links = doc.value.links.filter(
            (l) =>
              !(l.fromFloorId === floor.id && l.fromNodeId === id) &&
              !(l.toFloorId === floor.id && l.toNodeId === id),
          )
          break
        case 'edge':
          floor.edges = floor.edges.filter((e) => e.id !== id)
          break
        case 'pin':
          floor.pins = floor.pins.filter((p) => p.id !== id)
          floor.edges = floor.edges.filter((e) => e.from !== id && e.to !== id)
          break
        case 'link':
          doc.value.links = doc.value.links.filter((l) => l.id !== id)
          break
      }
    })
    if (selection.value?.kind === kind && selection.value.id === id) selection.value = null
  }

  function removeSelection(): void {
    if (!selection.value) return
    removeEntity(selection.value.kind, selection.value.id)
  }

  // ---------- Penghubung antar lantai ----------
  function addVerticalLink(link: Omit<VerticalLink, 'id' | 'label'> & { label?: string }): void {
    const fromFloor = findFloor(doc.value, link.fromFloorId)
    const toFloor = findFloor(doc.value, link.toFloorId)
    const fromNode = fromFloor?.nodes.find((n) => n.id === link.fromNodeId)
    const toNode = toFloor?.nodes.find((n) => n.id === link.toNodeId)
    const label =
      link.label ??
      `${fromNode?.label || fromNode?.type || 'Node'} → ${toNode?.label || toNode?.type || 'Node'}`
    mutate(() => {
      doc.value.links.push({ ...link, id: uid('lk'), label })
    })
  }

  function updateVerticalLink(linkId: string, patch: Partial<VerticalLink>): void {
    mutate(() => {
      const link = doc.value.links.find((l) => l.id === linkId)
      if (!link) return
      Object.assign(link, patch)
    })
  }

  function replaceDocument(next: MapDocument): void {
    past.value.push(snapshot())
    if (past.value.length > MAX_HISTORY) past.value.shift()
    future.value = []
    doc.value = next
    const first = next.buildings[0]?.floors[0]
    activeFloorId.value = first ? first.id : ''
    selection.value = null
    dirty.value = true
    void persist()
  }

  function newDocument(): void {
    replaceDocument(createEmptyDocument())
  }

  function updateMeta(patch: Partial<MapDocument['meta']>): void {
    mutate(() => {
      Object.assign(doc.value.meta, patch)
    })
  }

  function setPointer(x: number, y: number): void {
    pointer.value = { x, y }
  }

  function setMode(next: AppMode): void {
    mode.value = next
    selection.value = null
    draft.points = []
    if (next === 'route') {
      tool.value = 'select'
      draft.tool = 'select'
    }
  }

  /** Muat dokumen contoh bawaan (seed) — dipakai saat pertama kali dibuka. */
  function loadSeedDocument(): MapDocument | null {
    return parseDocument(seedRs)
  }

  /** Ganti dokumen aktif dengan contoh RS bawaan. */
  function useSeedDocument(): void {
    const seed = loadSeedDocument()
    if (!seed) return
    doc.value = seed
    const first = seed.buildings[0]?.floors[0]
    activeFloorId.value = first ? first.id : ''
    selection.value = null
    past.value = []
    future.value = []
    dirty.value = false
    void persist()
  }

  async function init(): Promise<void> {
    const stored = await loadDocument()
    if (stored) {
      doc.value = stored
      const first = stored.buildings[0]?.floors[0]
      if (first) activeFloorId.value = first.id
      dirty.value = false
    } else {
      const seed = loadSeedDocument()
      if (seed) {
        doc.value = seed
        const first = seed.buildings[0]?.floors[0]
        if (first) activeFloorId.value = first.id
        dirty.value = false
      }
    }
    ready.value = true
  }

  watch(
    () => prefs.gridSize,
    () => savePrefs({ ...prefs }),
  )

  return {
    doc,
    activeFloorId,
    activeFloor,
    activeBuilding,
    activeFloorName,
    allFloors,
    selection,
    selectedRoom,
    selectedWall,
    selectedNode,
    selectedPin,
    tool,
    prefs,
    zoom,
    pointer,
    ready,
    dirty,
    mode,
    draft,
    canUndo,
    canRedo,
    init,
    markSaved,
    mutate,
    beginTransaction,
    endTransaction,
    undo,
    redo,
    setTool,
    select,
    setActiveFloor,
    updatePrefs,
    addBuilding,
    renameBuilding,
    removeBuilding,
    addFloor,
    updateFloor,
    removeFloor,
    updateFloorSize,
    setBackground,
    updateBackground,
    removeBackground,
    addWall,
    addRoom,
    updateRoom,
    addNode,
    updateNode,
    addEdge,
    addPin,
    updatePin,
    addDoor,
    updateDoor,
    removeEntity,
    removeSelection,
    addVerticalLink,
    updateVerticalLink,
    replaceDocument,
    newDocument,
    updateMeta,
    setPointer,
    setMode,
    loadSeedDocument,
    useSeedDocument,
  }
})
