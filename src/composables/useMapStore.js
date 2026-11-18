import { computed, reactive, ref, watch } from 'vue'
import { createInitialCampusData } from '../data/hospitalDemoData'
import { findNearestNodeOnFloor } from '../engine/pathfinding'
import { validateCampusGraph } from '../engine/mapAudit'
import { useHistory } from './useHistory'
import { useRouteSimulation } from './useRouteSimulation'

const STORAGE_KEY = 'idgrow.editormap.state.v3'

function loadSavedCampus() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.buildings) && parsed.buildings.length > 0) {
        return parsed
      }
    }
  } catch {
    // fallback to demo data
  }
  return createInitialCampusData()
}

export function useMapStore() {
  const campus = reactive(loadSavedCampus())

  // Top-level separated views: 'editor' | 'finder' | 'porter'
  const appMode = ref('editor')
  const activeBuildingId = ref(campus.buildings[0]?.id || 101)
  const activeFloorId = ref(campus.buildings[0]?.floors[0]?.id || 1001)

  // Editor tools: 'select' | 'hand' | 'room' | 'rack' | 'door' | 'node' | 'edge' | 'portal'
  const activeTool = ref('select')
  const activeRouteDrawType = ref('bersama') // 'umum' | 'steril' | 'bersama'

  const snapToGrid = ref(true)
  const gridSize = ref(20)
  const showCorridorGraph = ref(true)
  const showBlueprint = ref(true)

  const rightInspectorTab = ref('design') // 'design' | 'audit'

  const selection = ref(null)
  const edgeDraftFromNodeId = ref(null)
  const rackModalTargetId = ref(null)
  const validationIssues = ref([])

  watch(
    campus,
    (val) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      } catch {
        // ignore quota errors
      }
    },
    { deep: true }
  )

  const history = useHistory(campus, selection)

  const activeBuilding = computed(
    () => campus.buildings.find((b) => b.id === activeBuildingId.value) || campus.buildings[0] || null
  )

  const activeFloor = computed(() => {
    for (const b of campus.buildings) {
      const f = b.floors.find((fl) => fl.id === activeFloorId.value)
      if (f) return f
    }
    return activeBuilding.value?.floors?.[0] || null
  })

  const allAnchors = computed(() => {
    const list = []
    for (const b of campus.buildings) {
      for (const f of b.floors) {
        for (const n of f.nav_nodes || []) {
          list.push({
            floorId: f.id,
            nodeId: n.id,
            x: n.x,
            y: n.y,
            label: `${b.kode} • ${f.kode_lantai} — ${n.label || n.id}`
          })
        }
      }
    }
    return list
  })

  const selectedEntity = computed(() => {
    if (!selection.value || !activeFloor.value) return null
    const f = activeFloor.value
    const { type, id } = selection.value
    if (type === 'room') return f.rooms.find((r) => r.id === id) || null
    if (type === 'rack') return f.racks.find((r) => r.id === id) || null
    if (type === 'node') return f.nav_nodes.find((n) => n.id === id) || null
    if (type === 'edge') return f.edges.find((e) => e.id === id) || null
    return null
  })

  const rackModalTarget = computed(() => {
    if (!rackModalTargetId.value) return null
    for (const b of campus.buildings) {
      for (const f of b.floors) {
        const rk = f.racks.find((r) => r.id === rackModalTargetId.value)
        if (rk) {
          const room = f.rooms.find((rm) => rm.id === rk.ruangan_id || rm.masterRoomId === rk.ruangan_id)
          return { building: b, floor: f, room, rack: rk }
        }
      }
    }
    return null
  })

  function snap(val) {
    if (!snapToGrid.value) return Math.round(val)
    const g = gridSize.value || 20
    return Math.round(val / g) * g
  }

  function selectBuilding(buildingId) {
    activeBuildingId.value = buildingId
    const b = campus.buildings.find((x) => x.id === buildingId)
    if (b && b.floors.length > 0) activeFloorId.value = b.floors[0].id
    selection.value = null
  }

  function selectFloor(floorId) {
    for (const b of campus.buildings) {
      const f = b.floors.find((fl) => fl.id === floorId)
      if (f) {
        activeBuildingId.value = b.id
        activeFloorId.value = f.id
        selection.value = null
        edgeDraftFromNodeId.value = null
        return
      }
    }
  }

  const routeSim = useRouteSimulation(campus, activeFloorId, selectFloor)

  function addFloor(buildingId, namaLantai) {
    const b = campus.buildings.find((x) => x.id === buildingId)
    if (!b) return
    history.pushSnapshot()
    const order = b.floors.length + 1
    const id = Date.now()
    b.floors.push({
      id,
      building_asset_id: b.id,
      nama_lantai: namaLantai || `Lantai ${order}`,
      kode_lantai: `${b.kode}-L${order}`,
      level_order: order,
      status: 'draft',
      pixelsPerMeter: 20,
      width: 1000,
      height: 620,
      image_url: null,
      image_opacity: 0.35,
      rooms: [],
      racks: [],
      nav_nodes: [],
      edges: []
    })
    activeFloorId.value = id
  }

  function toggleFloorPublishStatus(floorId) {
    for (const b of campus.buildings) {
      const f = b.floors.find((fl) => fl.id === floorId)
      if (f) {
        history.pushSnapshot()
        f.status = f.status === 'published' ? 'draft' : 'published'
        return
      }
    }
  }

  function findContainingRoom(floor, x, y) {
    if (!floor) return null
    return floor.rooms.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null
  }

  /**
   * 1. Buat kotak Area Ruangan generik (belum di-link; dipilih lewat Combobox di Properti)
   */
  function createRoomElement(rect) {
    const f = activeFloor.value
    if (!f) return null
    history.pushSnapshot()
    const id = Date.now()
    const room = {
      id,
      masterRoomId: null,
      kode: 'AREA-RUANG',
      nama: 'Area Ruangan (Pilih di Properti)',
      is_medis: false,
      x: snap(rect.x),
      y: snap(rect.y),
      w: Math.max(80, snap(rect.w)),
      h: Math.max(60, snap(rect.h)),
      doors: []
    }
    f.rooms.push(room)
    selection.value = { type: 'room', id: room.id }
    rightInspectorTab.value = 'design'
    return room
  }

  /**
   * Hubungkan kotak Area Ruangan ke Master Ruangan Worklist via Combobox Properti
   */
  function bindRoomToMaster(canvasRoomId, masterRoomId) {
    const f = activeFloor.value
    const b = activeBuilding.value
    if (!f || !b) return
    const room = f.rooms.find((r) => r.id === canvasRoomId)
    const master = (b.masterRooms || []).find((m) => m.id === Number(masterRoomId))
    if (!room || !master) return

    history.pushSnapshot()
    const prevMasterId = room.masterRoomId
    const prevName = room.nama
    room.masterRoomId = master.id
    room.kode = master.kode
    room.nama = master.nama
    room.is_medis = Boolean(master.is_medis)

    // Sinkronkan rak yang berada di dalam kotak ruangan ini
    for (const rk of f.racks) {
      if (rk.x + rk.w / 2 >= room.x && rk.x + rk.w / 2 <= room.x + room.w && rk.y + rk.h / 2 >= room.y && rk.y + rk.h / 2 <= room.y + room.h) {
        rk.ruangan_id = master.id
      }
    }

    // Sinkronkan titik rute / pintu yang berada di dalam/tepi ruangan ini
    const pad = 14
    for (const n of f.nav_nodes) {
      const isBoundToRoom = n.roomId === room.id || (prevMasterId && n.roomId === prevMasterId)
      const isInsideBox =
        n.x >= room.x - pad && n.x <= room.x + room.w + pad && n.y >= room.y - pad && n.y <= room.y + room.h + pad
      if (isBoundToRoom || isInsideBox) {
        n.roomId = master.id
        if (n.kind === 'door' && (!prevName || n.label === `Pintu ${prevName}`)) {
          n.label = `Pintu ${master.nama}`
        } else if (n.kind === 'room' && (!prevName || n.label === `Titik ${prevName}`)) {
          n.label = `Titik ${master.nama}`
        }
      }
    }
  }

  function syncRoomMoved(room, oldX, oldY) {
    const f = activeFloor.value
    if (!f || !room) return
    const dx = room.x - oldX
    const dy = room.y - oldY
    if (dx === 0 && dy === 0) return

    for (const d of room.doors || []) {
      d.x = snap(d.x + dx)
      d.y = snap(d.y + dy)
    }

    const pad = 14
    const refId = room.masterRoomId || room.id
    for (const n of f.nav_nodes) {
      const wasInsideOld =
        n.x >= oldX - pad && n.x <= oldX + room.w + pad && n.y >= oldY - pad && n.y <= oldY + room.h + pad
      if (wasInsideOld && (n.kind === 'room' || n.kind === 'door' || n.roomId === refId || n.roomId === room.id)) {
        n.x = snap(n.x + dx)
        n.y = snap(n.y + dy)
      }
    }
  }

  /**
   * 2. Buat kotak Element Penyimpanan generik (belum di-link; dipilih lewat Combobox di Properti)
   */
  function createStorageElement(x, y, preset = {}) {
    const f = activeFloor.value
    if (!f) return null
    history.pushSnapshot()
    const sx = snap(x - 48)
    const sy = snap(y - 22)
    const room = findContainingRoom(f, x, y)
    const id = Date.now()
    const rack = {
      id,
      masterStorageId: null,
      uuid: `draft-stg-${id}`,
      kode: 'AREA-RAK',
      nama: 'Area Penyimpanan (Pilih di Properti)',
      rackType: preset.rackType || 'rak',
      is_medis: room ? Boolean(room.is_medis) : true,
      ruangan_id: room ? (room.masterRoomId || room.id) : null,
      x: sx,
      y: sy,
      w: preset.w || 100,
      h: preset.h || 44,
      rotation: 0,
      rows: preset.rows || 3,
      cols: preset.cols || 4,
      slots: []
    }
    f.racks.push(rack)
    selection.value = { type: 'rack', id: rack.id }
    rightInspectorTab.value = 'design'
    return rack
  }

  /**
   * Hubungkan kotak Penyimpanan ke Master Storage Asset Worklist via Combobox Properti
   */
  function bindStorageToMaster(canvasRackId, masterStorageId) {
    const f = activeFloor.value
    if (!f) return
    const rack = f.racks.find((r) => r.id === canvasRackId)
    const master = (campus.masterStorages || []).find((s) => s.id === Number(masterStorageId))
    if (!rack || !master) return

    history.pushSnapshot()
    rack.masterStorageId = master.id
    rack.uuid = master.uuid
    rack.kode = master.kode
    rack.nama = master.nama
    rack.rackType = master.rackType || 'rak'
    rack.is_medis = Boolean(master.is_medis)
    rack.rows = master.rows || rack.rows
    rack.cols = master.cols || rack.cols
  }

  function addDoorAt(x, y) {
    const f = activeFloor.value
    if (!f) return null
    let targetRoom = null
    let bestDist = Infinity
    for (const r of f.rooms) {
      const cx = Math.max(r.x, Math.min(x, r.x + r.w))
      const cy = Math.max(r.y, Math.min(y, r.y + r.h))
      const d = Math.hypot(x - cx, y - cy)
      if (d < bestDist) {
        bestDist = d
        targetRoom = { room: r, dx: snap(cx), dy: snap(cy) }
      }
    }
    if (!targetRoom || bestDist > 60) return null
    history.pushSnapshot()
    const door = { id: `d-${Date.now()}`, x: targetRoom.dx, y: targetRoom.dy }
    targetRoom.room.doors.push(door)

    const doorNodeId = `nd-${Date.now()}`
    const doorNode = {
      id: doorNodeId,
      label: `Pintu ${targetRoom.room.nama}`,
      x: targetRoom.dx,
      y: targetRoom.dy,
      kind: 'door',
      routeType: activeRouteDrawType.value || 'bersama',
      roomId: targetRoom.room.masterRoomId || targetRoom.room.id,
      accessible: true
    }
    const nearestCorridor = findNearestNodeOnFloor(f, targetRoom.dx, targetRoom.dy)
    f.nav_nodes.push(doorNode)
    if (nearestCorridor) {
      f.edges.push({
        id: `e-${Date.now()}`,
        from: doorNodeId,
        to: nearestCorridor.id,
        routeType: doorNode.routeType,
        accessible: true
      })
    }
    selection.value = { type: 'node', id: doorNodeId }
    return door
  }

  function addNavNodeAt(x, y, kind = 'corridor', preset = {}) {
    const f = activeFloor.value
    if (!f) return null
    history.pushSnapshot()
    const sx = snap(x)
    const sy = snap(y)
    const room = findContainingRoom(f, sx, sy)
    const id = `n-${Date.now()}`
    const num = f.nav_nodes.length + 1
    const routeType = preset.routeType || activeRouteDrawType.value || 'bersama'
    const node = {
      id,
      label:
        preset.label ||
        (kind === 'portal' ? `Lift / Portal ${num}` : room ? `Titik ${room.nama}` : `Titik Rute ${num}`),
      x: sx,
      y: sy,
      kind: room && kind === 'corridor' ? 'room' : kind,
      routeType,
      roomId: room ? (room.masterRoomId || room.id) : null,
      portalType: kind === 'portal' ? preset.portalType || 'elevator' : undefined,
      portalGroup: kind === 'portal' ? preset.portalGroup || 'LIFT-UTAMA' : undefined,
      accessible: preset.portalType === 'stairs' ? false : true
    }
    f.nav_nodes.push(node)
    selection.value = { type: 'node', id }
    return node
  }

  function connectNodes(fromId, toId) {
    const f = activeFloor.value
    if (!f || !fromId || !toId || fromId === toId) return
    const exists = f.edges.some(
      (e) => (e.from === fromId && e.to === toId) || (e.from === toId && e.to === fromId)
    )
    if (exists) return
    history.pushSnapshot()
    const nA = f.nav_nodes.find((n) => n.id === fromId)
    const nB = f.nav_nodes.find((n) => n.id === toId)
    const edge = {
      id: `e-${Date.now()}`,
      from: fromId,
      to: toId,
      routeType: activeRouteDrawType.value || 'bersama',
      accessible: nA?.accessible !== false && nB?.accessible !== false
    }
    f.edges.push(edge)
    selection.value = { type: 'edge', id: edge.id }
  }

  function deleteSelected() {
    if (!selection.value || !activeFloor.value) return
    const f = activeFloor.value
    const { type, id } = selection.value
    history.pushSnapshot()
    if (type === 'room') {
      const removed = f.rooms.find((r) => r.id === id)
      f.rooms = f.rooms.filter((r) => r.id !== id)
      f.racks.forEach((rk) => {
        if (rk.ruangan_id === id || (removed?.masterRoomId && rk.ruangan_id === removed.masterRoomId)) {
          rk.ruangan_id = null
        }
      })
    } else if (type === 'rack') {
      f.racks = f.racks.filter((r) => r.id !== id)
    } else if (type === 'node') {
      f.nav_nodes = f.nav_nodes.filter((n) => n.id !== id)
      f.edges = f.edges.filter((e) => e.from !== id && e.to !== id)
    } else if (type === 'edge') {
      f.edges = f.edges.filter((e) => e.id !== id)
    }
    selection.value = null
  }

  function updateBlueprint(imageUrl) {
    if (!activeFloor.value) return
    history.pushSnapshot()
    activeFloor.value.image_url = imageUrl
  }

  function runValidation() {
    validationIssues.value = validateCampusGraph(campus)
    rightInspectorTab.value = 'audit'
    return validationIssues.value
  }

  function resetDemoData() {
    routeSim.resetRouteState()
    localStorage.removeItem(STORAGE_KEY)
    const fresh = createInitialCampusData()
    campus.outlet = fresh.outlet
    campus.masterStorages = fresh.masterStorages
    campus.buildings = fresh.buildings
    campus.porterTasks = fresh.porterTasks
    activeBuildingId.value = campus.buildings[0].id
    activeFloorId.value = campus.buildings[0].floors[0].id
    selection.value = null
    history.clearHistory()
    validationIssues.value = []
  }

  function replaceCampusData(imported) {
    routeSim.resetRouteState()
    history.pushSnapshot()
    campus.outlet = imported.outlet
    campus.buildings = imported.buildings
    if (imported.porterTasks?.length) campus.porterTasks = imported.porterTasks
    activeBuildingId.value = campus.buildings[0]?.id || null
    activeFloorId.value = campus.buildings[0]?.floors[0]?.id || null
    selection.value = null
  }

  return {
    campus,
    appMode,
    activeBuildingId,
    activeFloorId,
    activeBuilding,
    activeFloor,
    allAnchors,
    activeTool,
    activeRouteDrawType,
    snapToGrid,
    gridSize,
    showCorridorGraph,
    showBlueprint,
    rightInspectorTab,
    selection,
    selectedEntity,
    edgeDraftFromNodeId,
    rackModalTargetId,
    rackModalTarget,
    validationIssues,
    ...history,
    ...routeSim,
    snap,
    selectBuilding,
    selectFloor,
    addFloor,
    toggleFloorPublishStatus,
    findContainingRoom,
    createRoomElement,
    bindRoomToMaster,
    syncRoomMoved,
    createStorageElement,
    bindStorageToMaster,
    addDoorAt,
    addNavNodeAt,
    connectNodes,
    deleteSelected,
    updateBlueprint,
    runValidation,
    resetDemoData,
    replaceCampusData
  }
}
