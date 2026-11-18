import type { NavNodeType, RoomCategory, WallKind } from '@/types/map'

/** Palet mengikuti docs/standar_desain_ui.md (prima): primer #3db6bc, netral slate. */
export const COLORS = {
  primary: '#3db6bc',
  primaryDark: '#349fa4',
  primarySoft: 'rgba(61, 182, 188, 0.14)',
  slate900: '#0f172a',
  slate700: '#334155',
  slate500: '#64748b',
  slate400: '#94a3b8',
  slate300: '#cbd5e1',
  slate200: '#e2e8f0',
  slate100: '#f1f5f9',
  white: '#ffffff',
  danger: '#e11d48',
  warning: '#f59e0b',
  success: '#059669',
  info: '#0284c7',
} as const

export const WALL_COLOR: Record<WallKind, string> = {
  luar: COLORS.slate900,
  dinding: COLORS.slate700,
  partisi: COLORS.slate400,
}

export const ROOM_FILL: Record<RoomCategory, string> = {
  'rawat-inap': 'rgba(96, 165, 250, 0.20)',
  poliklinik: 'rgba(52, 211, 153, 0.20)',
  igd: 'rgba(248, 113, 113, 0.22)',
  penunjang: 'rgba(167, 139, 250, 0.20)',
  farmasi: 'rgba(251, 191, 36, 0.22)',
  administrasi: 'rgba(148, 163, 184, 0.20)',
  toilet: 'rgba(34, 211, 238, 0.20)',
  lainnya: 'rgba(203, 213, 225, 0.16)',
}

export const ROOM_STROKE: Record<RoomCategory, string> = {
  'rawat-inap': '#3b82f6',
  poliklinik: '#10b981',
  igd: '#ef4444',
  penunjang: '#8b5cf6',
  farmasi: '#d97706',
  administrasi: '#64748b',
  toilet: '#0891b2',
  lainnya: '#94a3b8',
}

export const NODE_COLOR: Record<NavNodeType, string> = {
  walk: COLORS.slate500,
  junction: COLORS.info,
  door: '#9333ea',
  entrance: COLORS.success,
  stair: COLORS.warning,
  lift: '#2563eb',
  ramp: '#0d9488',
}

export const CANVAS_BG = '#f8fafc'
export const GRID_MINOR = 'rgba(148, 163, 184, 0.28)'
export const GRID_MAJOR = 'rgba(100, 116, 139, 0.45)'

export const SIZES = {
  nodeRadius: 8,
  nodeHitStroke: 18,
  pinRadius: 9,
  edgeWidth: 3,
  routeWidth: 6,
  vertexRadius: 6,
  labelFont: 15,
}
