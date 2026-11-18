import { uid } from '@/core/id'
import type { Building, Floor, MapDocument, MapMeta, Room, RoomCategory } from '@/types/map'

export const DOC_VERSION = 2
export const STORAGE_KEY_DOC = 'idgrow.editormap.document'
export const STORAGE_KEY_PREFS = 'idgrow.editormap.prefs'

export const DEFAULT_FLOOR_SIZE = { width: 1600, height: 1100 }

export function createFloor(buildingId: string, name: string, code: string, level: number): Floor {
  return {
    id: uid('fl'),
    buildingId,
    name,
    code,
    level,
    pixelsPerMeter: 20,
    size: { ...DEFAULT_FLOOR_SIZE },
    background: null,
    walls: [],
    rooms: [],
    doors: [],
    nodes: [],
    edges: [],
    pins: [],
  }
}

export function createBuilding(name: string, code: string): Building {
  const id = uid('bd')
  return {
    id,
    name,
    code,
    floors: [createFloor(id, 'Lantai 1', `${code}-L1`, 1)],
  }
}

export function createRoom(name: string, category: RoomCategory, polygon: Room['polygon']): Room {
  return {
    id: uid('rm'),
    name,
    code: '',
    category,
    note: '',
    polygon,
  }
}

export function createEmptyDocument(): MapDocument {
  const building = createBuilding('Gedung Utama', 'GU')
  const now = new Date().toISOString()
  return {
    version: DOC_VERSION,
    id: uid('doc'),
    meta: {
      name: 'Peta Rumah Sakit',
      organization: '',
      address: '',
      description: '',
    },
    buildings: [building],
    links: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function findFloor(doc: MapDocument, floorId: string): Floor | undefined {
  for (const building of doc.buildings) {
    const floor = building.floors.find((f) => f.id === floorId)
    if (floor) return floor
  }
  return undefined
}

export function findBuildingOfFloor(doc: MapDocument, floorId: string): Building | undefined {
  return doc.buildings.find((b) => b.floors.some((f) => f.id === floorId))
}

export function floorLabel(doc: MapDocument, floorId: string): string {
  const building = findBuildingOfFloor(doc, floorId)
  const floor = findFloor(doc, floorId)
  if (!floor) return 'Lantai tidak ditemukan'
  return building ? `${building.name} · ${floor.name}` : floor.name
}

export function emptyMeta(): MapMeta {
  return { name: '', organization: '', address: '', description: '' }
}
