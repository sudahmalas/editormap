import type { Floor, MapDocument, NavNode } from '@/types/map'
import { dist } from '@/core/geometry'

export type IssueLevel = 'error' | 'warning'

export interface ValidationIssue {
  id: string
  level: IssueLevel
  floorId: string | null
  message: string
  entityId?: string
  entityKind?: 'room' | 'node' | 'edge' | 'pin' | 'link' | 'building'
}

/** Union-Find untuk mendeteksi komponen graf yang terpisah. */
class DisjointSet {
  private parent = new Map<string, string>()

  find(key: string): string {
    const current = this.parent.get(key)
    if (current === undefined) {
      this.parent.set(key, key)
      return key
    }
    if (current === key) return key
    const root = this.find(current)
    this.parent.set(key, root)
    return root
  }

  union(a: string, b: string): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) this.parent.set(rootB, rootA)
  }
}

export function validateDocument(doc: MapDocument, activeFloorId: string | null): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const push = (issue: Omit<ValidationIssue, 'id'>) => {
    issues.push({ ...issue, id: `${issue.level}-${issues.length}` })
  }

  if (doc.buildings.length === 0) {
    push({ level: 'error', floorId: null, message: 'Belum ada gedung. Tambahkan minimal satu gedung.', entityKind: 'building' })
  }

  for (const building of doc.buildings) {
    if (building.floors.length === 0) {
      push({
        level: 'error',
        floorId: null,
        message: `Gedung "${building.name}" belum memiliki lantai.`,
        entityKind: 'building',
        entityId: building.id,
      })
    }
    const levels = new Set<number>()
    for (const floor of building.floors) {
      if (levels.has(floor.level)) {
        push({
          level: 'warning',
          floorId: floor.id,
          message: `Nomor lantai ${floor.level} dipakai lebih dari satu kali di gedung "${building.name}".`,
        })
      }
      levels.add(floor.level)
    }
  }

  const nodeLookup = new Map<string, { floor: Floor; node: NavNode }>()
  for (const building of doc.buildings) {
    for (const floor of building.floors) {
      for (const node of floor.nodes) {
        nodeLookup.set(`${floor.id}::${node.id}`, { floor, node })
      }
    }
  }

  for (const building of doc.buildings) {
    for (const floor of building.floors) {
      validateFloor(doc, floor, activeFloorId, push, nodeLookup)
    }
  }

  for (const link of doc.links) {
    const from = nodeLookup.get(`${link.fromFloorId}::${link.fromNodeId}`)
    const to = nodeLookup.get(`${link.toFloorId}::${link.toNodeId}`)
    if (!from || !to) {
      push({
        level: 'error',
        floorId: link.fromFloorId,
        message: `Penghubung "${link.label}" merujuk ke node yang sudah dihapus.`,
        entityKind: 'link',
        entityId: link.id,
      })
      continue
    }
    if (link.fromFloorId === link.toFloorId) {
      push({
        level: 'warning',
        floorId: link.fromFloorId,
        message: `Penghubung "${link.label}" menghubungkan lantai yang sama.`,
        entityKind: 'link',
        entityId: link.id,
      })
    }
  }

  return issues
}

function validateFloor(
  doc: MapDocument,
  floor: Floor,
  activeFloorId: string | null,
  push: (issue: Omit<ValidationIssue, 'id'>) => void,
  nodeLookup: Map<string, { floor: Floor; node: NavNode }>,
): void {
  const isActive = floor.id === activeFloorId
  const floorTag = isActive ? '' : ` (${floor.name})`

  if (floor.nodes.length === 0) {
    push({
      level: 'warning',
      floorId: floor.id,
      message: `Lantai "${floor.name}" belum memiliki titik jalur.${floorTag ? '' : ''}`,
    })
    return
  }

  const nodeIds = new Set(floor.nodes.map((n) => n.id))
  // pin yang sudah ditempelkan ke titik jalur ikut menjadi endpoint edge yang sah
  const pinIds = new Set(floor.pins.filter((p) => p.nodeId).map((p) => p.id))
  const validEndpointIds = new Set([...nodeIds, ...pinIds])
  const degree = new Map<string, number>()
  for (const node of floor.nodes) degree.set(node.id, 0)

  const ds = new DisjointSet()
  for (const node of floor.nodes) ds.find(node.id)

  const seen = new Set<string>()
  for (const edge of floor.edges) {
    if (!validEndpointIds.has(edge.from) || !validEndpointIds.has(edge.to)) {
      push({
        level: 'error',
        floorId: floor.id,
        message: `Jalur merujuk ke node yang sudah dihapus${floorTag}.`,
        entityKind: 'edge',
        entityId: edge.id,
      })
      continue
    }
    if (edge.from === edge.to) {
      push({
        level: 'warning',
        floorId: floor.id,
        message: `Ada jalur yang menghubungkan node ke dirinya sendiri${floorTag}.`,
        entityKind: 'edge',
        entityId: edge.id,
      })
      continue
    }
    const pair = edge.from < edge.to ? `${edge.from}|${edge.to}` : `${edge.to}|${edge.from}`
    if (seen.has(pair)) {
      push({
        level: 'warning',
        floorId: floor.id,
        message: `Jalur ganda antar dua titik yang sama${floorTag}.`,
        entityKind: 'edge',
        entityId: edge.id,
      })
      continue
    }
    seen.add(pair)
    ds.union(edge.from, edge.to)
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
  }

  let isolated = 0
  for (const node of floor.nodes) {
    if ((degree.get(node.id) ?? 0) === 0) isolated += 1
  }
  if (isolated > 0) {
    push({
      level: 'warning',
      floorId: floor.id,
      message: `${isolated} titik jalur belum tersambung ke jalur lain${floorTag}.`,
    })
  }

  const roots = new Set<string>()
  for (const node of floor.nodes) {
    if ((degree.get(node.id) ?? 0) > 0) roots.add(ds.find(node.id))
  }
  if (roots.size > 1) {
    push({
      level: 'error',
      floorId: floor.id,
      message: `Graf jalur terpecah menjadi ${roots.size} bagian yang tidak saling terhubung${floorTag}.`,
    })
  }

  for (const pin of floor.pins) {
    if (!pin.nodeId) {
      push({
        level: 'warning',
        floorId: floor.id,
        message: `Lokasi "${pin.label}" belum ditempelkan ke titik jalur${floorTag}.`,
        entityKind: 'pin',
        entityId: pin.id,
      })
      continue
    }
    if (!nodeLookup.has(`${floor.id}::${pin.nodeId}`)) {
      push({
        level: 'error',
        floorId: floor.id,
        message: `Lokasi "${pin.label}" merujuk ke titik jalur yang sudah dihapus${floorTag}.`,
        entityKind: 'pin',
        entityId: pin.id,
      })
    }
  }

  for (const room of floor.rooms) {
    if (room.name.trim().length === 0) {
      push({
        level: 'warning',
        floorId: floor.id,
        message: `Ada ruangan tanpa nama${floorTag}.`,
        entityKind: 'room',
        entityId: room.id,
      })
    }
  }

  void doc

  // node vertikal (stair/lift/ramp) wajib punya penghubung antar lantai
  const verticalTypes = new Set(['stair', 'lift', 'ramp'])
  for (const node of floor.nodes) {
    if (!verticalTypes.has(node.type)) continue
    const linked = doc.links.some(
      (link) =>
        (link.fromFloorId === floor.id && link.fromNodeId === node.id) ||
        (link.toFloorId === floor.id && link.toNodeId === node.id),
    )
    if (!linked) {
      push({
        level: 'warning',
        floorId: floor.id,
        message: `Node "${node.label || node.type}" bertipe ${node.type} tetapi belum dihubungkan ke lantai lain${floorTag}.`,
        entityKind: 'node',
        entityId: node.id,
      })
    }
  }
}

export function countIssues(issues: ValidationIssue[]): { errors: number; warnings: number } {
  let errors = 0
  let warnings = 0
  for (const issue of issues) {
    if (issue.level === 'error') errors += 1
    else warnings += 1
  }
  return { errors, warnings }
}

export function snapDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return dist(a, b)
}
