export interface Vec2 {
  x: number
  y: number
}

export type EntityKind = 'wall' | 'room' | 'door' | 'node' | 'edge' | 'pin' | 'link'

export type NavNodeType = 'walk' | 'junction' | 'door' | 'entrance' | 'stair' | 'lift' | 'ramp'

export type RoomCategory =
  | 'rawat-inap'
  | 'poliklinik'
  | 'igd'
  | 'penunjang'
  | 'farmasi'
  | 'administrasi'
  | 'toilet'
  | 'lainnya'

export type LinkKind = 'stair' | 'lift' | 'ramp' | 'escalator' | 'bridge'

export type WallKind = 'luar' | 'dinding' | 'partisi'

export interface BackgroundImage {
  src: string
  width: number
  height: number
  opacity: number
}

export interface Wall {
  id: string
  kind: WallKind
  thickness: number
  points: Vec2[]
}

export interface Room {
  id: string
  name: string
  code: string
  category: RoomCategory
  note: string
  polygon: Vec2[]
}

export interface Door {
  id: string
  position: Vec2
  width: number
  rotation: number
}

export interface NavNode {
  id: string
  type: NavNodeType
  label: string
  position: Vec2
}

export interface NavEdge {
  id: string
  from: string
  to: string
}

export interface Pin {
  id: string
  label: string
  category: RoomCategory
  note: string
  position: Vec2
  nodeId: string | null
}

export interface Floor {
  id: string
  buildingId: string
  name: string
  code: string
  level: number
  /** skala gambar: berapa piksel mewakili 1 meter */
  pixelsPerMeter: number
  size: { width: number; height: number }
  background: BackgroundImage | null
  walls: Wall[]
  rooms: Room[]
  doors: Door[]
  nodes: NavNode[]
  edges: NavEdge[]
  pins: Pin[]
}

export interface Building {
  id: string
  name: string
  code: string
  floors: Floor[]
}

export interface VerticalLink {
  id: string
  kind: LinkKind
  label: string
  fromFloorId: string
  fromNodeId: string
  toFloorId: string
  toNodeId: string
}

export interface MapMeta {
  name: string
  organization: string
  address: string
  description: string
}

export interface MapDocument {
  version: 2
  id: string
  meta: MapMeta
  buildings: Building[]
  links: VerticalLink[]
  createdAt: string
  updatedAt: string
}

export interface Selection {
  kind: EntityKind
  id: string
}

export const ROOM_CATEGORY_LABEL: Record<RoomCategory, string> = {
  'rawat-inap': 'Rawat Inap',
  poliklinik: 'Poliklinik',
  igd: 'IGD',
  penunjang: 'Penunjang Medis',
  farmasi: 'Farmasi',
  administrasi: 'Administrasi',
  toilet: 'Toilet',
  lainnya: 'Lainnya',
}

export const NAV_NODE_LABEL: Record<NavNodeType, string> = {
  walk: 'Jalur',
  junction: 'Percabangan',
  door: 'Pintu',
  entrance: 'Pintu Masuk',
  stair: 'Tangga',
  lift: 'Lift',
  ramp: 'Ramp',
}

export const LINK_KIND_LABEL: Record<LinkKind, string> = {
  stair: 'Tangga',
  lift: 'Lift',
  ramp: 'Ramp',
  escalator: 'Eskalator',
  bridge: 'Jembatan Penghubung',
}

export const WALL_KIND_LABEL: Record<WallKind, string> = {
  luar: 'Dinding Luar',
  dinding: 'Dinding',
  partisi: 'Partisi',
}

export const VERTICAL_NODE_TYPES: NavNodeType[] = ['stair', 'lift', 'ramp']
