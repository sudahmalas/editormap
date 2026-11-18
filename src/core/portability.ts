import type { MapDocument } from '@/types/map'
import { DOC_VERSION, createFloor, findFloor } from '@/core/document'
import { uid } from '@/core/id'

/**
 * Portabilitas: memetakan dokumen editor ke kontrak backend denah_maps
 * (prima: modules/Inventaris/Models/DenahMap.php — kolom nav_nodes & path_graph).
 *
 * Konversi koordinat: editor menyimpan koordinat "px gambar" (ukuran asli gambar/lantai).
 * Backend menyimpan koordinat relatif yang sama, sehingga tidak ada penskalaan.
 */

export interface DenahMapPayload {
  building_asset_id: number | null
  nama_lantai: string
  kode_lantai: string
  image_url: string | null
  nav_nodes: {
    id: string
    label: string
    asset_id: number | null
    type: 'path' | 'room'
    x: number
    y: number
  }[]
  path_graph: {
    edges: { from: string; to: string; weight?: number }[]
  }
  is_active: boolean
}

export interface DenahExportEntry {
  floorId: string
  buildingCode: string
  floorCode: string
  payload: DenahMapPayload
}

export interface DenahExportBundle {
  documentId: string
  exportedAt: string
  entries: DenahExportEntry[]
  verticalLinks: {
    kind: string
    label: string
    from: { floorCode: string; nodeId: string }
    to: { floorCode: string; nodeId: string }
  }[]
}

export function toDenahMapsBundle(doc: MapDocument): DenahExportBundle {
  const entries: DenahExportEntry[] = []

  for (const building of doc.buildings) {
    for (const floor of building.floors) {
      const navNodes: DenahMapPayload['nav_nodes'] = []

      for (const node of floor.nodes) {
        navNodes.push({
          id: node.id,
          label: node.label || node.type,
          asset_id: null,
          type: 'path',
          x: Math.round(node.position.x),
          y: Math.round(node.position.y),
        })
      }

      for (const pin of floor.pins) {
        if (!pin.nodeId) continue
        navNodes.push({
          id: pin.id,
          label: pin.label,
          asset_id: null,
          type: 'room',
          x: Math.round(pin.position.x),
          y: Math.round(pin.position.y),
        })
      }

      const edges: DenahMapPayload['path_graph']['edges'] = floor.edges
        .filter((edge) => floor.nodes.some((n) => n.id === edge.from) && floor.nodes.some((n) => n.id === edge.to))
        .map((edge) => ({ from: edge.from, to: edge.to }))

      // pin ditempelkan ke node jalur terdekat agar navigator backend bisa snap
      for (const pin of floor.pins) {
        if (!pin.nodeId) continue
        edges.push({ from: pin.id, to: pin.nodeId })
      }

      entries.push({
        floorId: floor.id,
        buildingCode: building.code,
        floorCode: floor.code,
        payload: {
          building_asset_id: null,
          nama_lantai: floor.name,
          kode_lantai: floor.code,
          image_url: floor.background?.src ?? null,
          nav_nodes: navNodes,
          path_graph: { edges },
          is_active: true,
        },
      })
    }
  }

  const floorCodeById = new Map<string, string>()
  for (const building of doc.buildings) {
    for (const floor of building.floors) floorCodeById.set(floor.id, floor.code)
  }

  return {
    documentId: doc.id,
    exportedAt: new Date().toISOString(),
    entries,
    verticalLinks: doc.links.map((link) => ({
      kind: link.kind,
      label: link.label,
      from: { floorCode: floorCodeById.get(link.fromFloorId) ?? '', nodeId: link.fromNodeId },
      to: { floorCode: floorCodeById.get(link.toFloorId) ?? '', nodeId: link.toNodeId },
    })),
  }
}

export function downloadJson(payload: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').toLowerCase() || 'peta'
}

/** Validasi bentuk dokumen yang diimpor; return null bila tidak valid. */
export function parseDocument(raw: unknown): MapDocument | null {
  if (typeof raw !== 'object' || raw === null) return null
  const candidate = raw as Partial<MapDocument>
  if (candidate.version !== DOC_VERSION) return null
  if (!Array.isArray(candidate.buildings)) return null
  if (!candidate.meta || typeof candidate.meta.name !== 'string') return null

  const doc: MapDocument = {
    version: DOC_VERSION,
    id: candidate.id ?? uid('doc'),
    meta: {
      name: candidate.meta.name,
      organization: candidate.meta.organization ?? '',
      address: candidate.meta.address ?? '',
      description: candidate.meta.description ?? '',
    },
    buildings: candidate.buildings.map((building) => ({
      id: building.id,
      name: building.name,
      code: building.code,
      floors: building.floors.map((floor) => ({
        ...createFloor(building.id, floor.name, floor.code, floor.level ?? 1),
        ...floor,
        buildingId: building.id,
        walls: floor.walls ?? [],
        rooms: floor.rooms ?? [],
        doors: floor.doors ?? [],
        nodes: floor.nodes ?? [],
        edges: floor.edges ?? [],
        pins: floor.pins ?? [],
      })),
    })),
    links: candidate.links ?? [],
    createdAt: candidate.createdAt ?? new Date().toISOString(),
    updatedAt: candidate.updatedAt ?? new Date().toISOString(),
  }

  for (const building of doc.buildings) {
    if (building.floors.length === 0) return null
  }
  return doc
}

export function ensureFloorExists(doc: MapDocument, floorId: string): boolean {
  return Boolean(findFloor(doc, floorId))
}
