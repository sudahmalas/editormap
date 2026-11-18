import type { MapDocument, NavEdge, NavNode, Pin, VerticalLink } from '@/types/map'

export interface RouteStep {
  floorId: string
  nodeId: string
  label: string
  x: number
  y: number
  /** true bila langkah ini hasil perpindahan lantai */
  vertical: boolean
}

export interface RouteResult {
  found: boolean
  distance: number
  steps: RouteStep[]
  /** segmen per lantai untuk digambar: key = floorId */
  segments: Record<string, { x: number; y: number }[]>
  message?: string
}

export interface RouteEndpoint {
  floorId: string
  nodeId: string
}

interface GraphNode {
  key: string
  floorId: string
  nodeId: string
  x: number
  y: number
  label: string
}

const KEY_SEP = '::'

export function nodeKey(floorId: string, nodeId: string): string {
  return `${floorId}${KEY_SEP}${nodeId}`
}

function buildGraph(doc: MapDocument) {
  const nodes = new Map<string, GraphNode>()
  const adjacency = new Map<string, { to: string; weight: number; vertical: boolean }[]>()
  const floorLevel = new Map<string, number>()

  for (const building of doc.buildings) {
    for (const floor of building.floors) {
      floorLevel.set(floor.id, floor.level)
      for (const node of floor.nodes) {
        const key = nodeKey(floor.id, node.id)
        nodes.set(key, {
          key,
          floorId: floor.id,
          nodeId: node.id,
          x: node.position.x,
          y: node.position.y,
          label: node.label,
        })
        adjacency.set(key, [])
      }
      // pin yang sudah ditempelkan ke titik jalur ikut menjadi endpoint rute
      for (const pin of floor.pins) {
        if (!pin.nodeId) continue
        const key = nodeKey(floor.id, pin.id)
        nodes.set(key, {
          key,
          floorId: floor.id,
          nodeId: pin.id,
          x: pin.position.x,
          y: pin.position.y,
          label: pin.label,
        })
        adjacency.set(key, [])
      }
    }
  }

  const addEdge = (a: string, b: string, weight: number, vertical: boolean) => {
    const listA = adjacency.get(a)
    const listB = adjacency.get(b)
    if (!listA || !listB) return
    listA.push({ to: b, weight, vertical })
    listB.push({ to: a, weight, vertical })
  }

  for (const building of doc.buildings) {
    for (const floor of building.floors) {
      const pointMap = indexPoints(floor.nodes, floor.pins)
      for (const edge of floor.edges) {
        const from = pointMap.get(edge.from)
        const to = pointMap.get(edge.to)
        if (!from || !to) continue
        const weight = Math.hypot(from.x - to.x, from.y - to.y)
        addEdge(nodeKey(floor.id, edge.from), nodeKey(floor.id, edge.to), weight, false)
      }
    }
  }

  for (const link of doc.links) {
    const fromKey = nodeKey(link.fromFloorId, link.fromNodeId)
    const toKey = nodeKey(link.toFloorId, link.toNodeId)
    const a = nodes.get(fromKey)
    const b = nodes.get(toKey)
    if (!a || !b) continue
    const levelA = floorLevel.get(link.fromFloorId) ?? 0
    const levelB = floorLevel.get(link.toFloorId) ?? 0
    // biaya perpindahan lantai diberi bobot tambahan agar lift/tangga tidak dipakai sembarangan
    const penalty = link.kind === 'lift' ? 40 : 24
    const weight = Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(levelA - levelB) * penalty
    addEdge(fromKey, toKey, weight, true)
  }

  return { nodes, adjacency, floorLevel }
}

function indexPoints(nodes: NavNode[], pins: Pin[]): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>()
  for (const node of nodes) map.set(node.id, node.position)
  for (const pin of pins) {
    if (pin.nodeId) map.set(pin.id, pin.position)
  }
  return map
}

export function calculateRoute(
  doc: MapDocument,
  start: RouteEndpoint,
  goal: RouteEndpoint,
): RouteResult {
  const { nodes, adjacency, floorLevel } = buildGraph(doc)
  const startKey = nodeKey(start.floorId, start.nodeId)
  const goalKey = nodeKey(goal.floorId, goal.nodeId)

  const empty: RouteResult = { found: false, distance: 0, steps: [], segments: {} }

  const startNode = nodes.get(startKey)
  const goalNode = nodes.get(goalKey)
  if (!startNode) return { ...empty, message: 'Titik awal tidak ditemukan pada lantai ini.' }
  if (!goalNode) return { ...empty, message: 'Titik tujuan tidak ditemukan pada lantai ini.' }

  if (startKey === goalKey) {
    return {
      found: true,
      distance: 0,
      steps: [toStep(startNode, false)],
      segments: { [startNode.floorId]: [{ x: startNode.x, y: startNode.y }] },
    }
  }

  const heuristic = (from: GraphNode, to: GraphNode): number => {
    if (from.floorId === to.floorId) {
      return Math.hypot(from.x - to.x, from.y - to.y)
    }
    const levelGap = Math.abs((floorLevel.get(from.floorId) ?? 0) - (floorLevel.get(to.floorId) ?? 0))
    return levelGap * 20
  }

  const gScore = new Map<string, number>([[startKey, 0]])
  const fScore = new Map<string, number>([[startKey, heuristic(startNode, goalNode)]])
  const cameFrom = new Map<string, string>()
  const closed = new Set<string>()
  const open = new Set<string>([startKey])

  while (open.size > 0) {
    let currentKey: string | null = null
    let currentBest = Number.POSITIVE_INFINITY
    for (const key of open) {
      const score = fScore.get(key) ?? Number.POSITIVE_INFINITY
      if (score < currentBest) {
        currentBest = score
        currentKey = key
      }
    }
    if (!currentKey) break

    if (currentKey === goalKey) {
      return reconstruct(currentKey, cameFrom, nodes, adjacency, doc)
    }

    open.delete(currentKey)
    closed.add(currentKey)

    const current = nodes.get(currentKey)
    if (!current) continue
    const neighbours = adjacency.get(currentKey) ?? []
    for (const neighbour of neighbours) {
      if (closed.has(neighbour.to)) continue
      const neighbourNode = nodes.get(neighbour.to)
      if (!neighbourNode) continue
      const tentative = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + neighbour.weight
      if (tentative < (gScore.get(neighbour.to) ?? Number.POSITIVE_INFINITY)) {
        cameFrom.set(neighbour.to, currentKey)
        gScore.set(neighbour.to, tentative)
        fScore.set(neighbour.to, tentative + heuristic(neighbourNode, goalNode))
        open.add(neighbour.to)
      }
    }
  }

  return {
    ...empty,
    message: 'Rute tidak ditemukan. Periksa apakah jalur pada lantai terkait sudah tersambung.',
  }
}

function reconstruct(
  goalKey: string,
  cameFrom: Map<string, string>,
  nodes: Map<string, GraphNode>,
  adjacency: Map<string, { to: string; weight: number; vertical: boolean }[]>,
  doc: MapDocument,
): RouteResult {
  const keys: string[] = [goalKey]
  let cursor = goalKey
  while (cameFrom.has(cursor)) {
    cursor = cameFrom.get(cursor) as string
    keys.unshift(cursor)
  }

  const steps: RouteStep[] = []
  const segments: Record<string, { x: number; y: number }[]> = {}
  let distance = 0

  for (let i = 0; i < keys.length; i += 1) {
    const node = nodes.get(keys[i])
    if (!node) continue
    let vertical = false
    if (i > 0) {
      const prevKey = keys[i - 1]
      const link = (adjacency.get(prevKey) ?? []).find((n) => n.to === keys[i])
      vertical = Boolean(link?.vertical)
      if (link) distance += link.weight
    }
    steps.push(toStep(node, vertical))
    if (!segments[node.floorId]) segments[node.floorId] = []
    segments[node.floorId].push({ x: node.x, y: node.y })
  }

  return { found: true, distance, steps, segments: decorateSegments(doc, segments) }
}

function decorateSegments(
  _doc: MapDocument,
  segments: Record<string, { x: number; y: number }[]>,
): Record<string, { x: number; y: number }[]> {
  return segments
}

function toStep(node: GraphNode, vertical: boolean): RouteStep {
  return {
    floorId: node.floorId,
    nodeId: node.nodeId,
    label: node.label,
    x: node.x,
    y: node.y,
    vertical,
  }
}

/** Daftar node terdekat dari suatu titik pada satu lantai. */
export function nearestNode(floorNodes: NavNode[], x: number, y: number): NavNode | null {
  let best: NavNode | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const node of floorNodes) {
    const d = Math.hypot(node.position.x - x, node.position.y - y)
    if (d < bestDist) {
      bestDist = d
      best = node
    }
  }
  return best
}

export function edgeListOf(edges: NavEdge[], nodes: NavNode[]): NavEdge[] {
  const ids = new Set(nodes.map((n) => n.id))
  return edges.filter((e) => ids.has(e.from) && ids.has(e.to))
}

export function verticalLinkCount(links: VerticalLink[]): number {
  return links.length
}
