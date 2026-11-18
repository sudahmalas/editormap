import type { Vec2 } from '@/types/map'

const EPSILON = 1e-9

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export interface ClosestPointResult {
  point: Vec2
  t: number
  distance: number
}

export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): ClosestPointResult {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq < EPSILON) {
    return { point: { x: a.x, y: a.y }, t: 0, distance: dist(p, a) }
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const point = { x: a.x + t * dx, y: a.y + t * dy }
  return { point, t, distance: dist(p, point) }
}

/** Titik terdekat pada seluruh segmen polyline. */
export function closestPointOnPolyline(
  p: Vec2,
  points: Vec2[],
): ClosestPointResult & { segmentIndex: number } {
  let best: ClosestPointResult & { segmentIndex: number } = {
    point: { x: p.x, y: p.y },
    t: 0,
    distance: Number.POSITIVE_INFINITY,
    segmentIndex: 0,
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const res = closestPointOnSegment(p, points[i], points[i + 1])
    if (res.distance < best.distance) {
      best = { ...res, segmentIndex: i }
    }
  }
  return best
}

export function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const intersects = yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi + EPSILON) + xi
    if (intersects) inside = !inside
  }
  return inside
}

export function polygonArea(polygon: Vec2[]): number {
  if (polygon.length < 3) return 0
  let sum = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

export function polygonCentroid(polygon: Vec2[]): Vec2 {
  if (polygon.length === 0) return { x: 0, y: 0 }
  let twiceArea = 0
  let cx = 0
  let cy = 0
  for (let i = 0; i < polygon.length; i += 1) {
    const a = polygon[i]
    const b = polygon[(i + 1) % polygon.length]
    const cross = a.x * b.y - b.x * a.y
    twiceArea += cross
    cx += (a.x + b.x) * cross
    cy += (a.y + b.y) * cross
  }
  if (Math.abs(twiceArea) < EPSILON) {
    const sum = polygon.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
    return { x: sum.x / polygon.length, y: sum.y / polygon.length }
  }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) }
}

export function polylineLength(points: Vec2[]): number {
  let total = 0
  for (let i = 0; i < points.length - 1; i += 1) {
    total += dist(points[i], points[i + 1])
  }
  return total
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export function boundsOf(points: Vec2[]): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function snapValue(value: number, grid: number): number {
  if (grid <= 0) return value
  return Math.round(value / grid) * grid
}

export function snapPoint(p: Vec2, grid: number): Vec2 {
  return { x: snapValue(p.x, grid), y: snapValue(p.y, grid) }
}

export function angleBetween(a: Vec2, b: Vec2): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

export function offsetPoints(points: Vec2[], dx: number, dy: number): Vec2[] {
  return points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
}

/** Jarak titik ke tepi polygon (bukan ke isi). */
export function distanceToPolygonEdge(p: Vec2, polygon: Vec2[]): number {
  if (polygon.length < 2) return Number.POSITIVE_INFINITY
  const closed = [...polygon, polygon[0]]
  return closestPointOnPolyline(p, closed).distance
}
