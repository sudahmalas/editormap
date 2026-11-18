/**
 * Multi-Building & Multi-Floor Indoor Pathfinding Engine (A*)
 *
 * Disesuaikan dengan konteks domain Worklist:
 * - Master Lokasi (`Outlet -> Bangunan -> Ruangan [Medis / Non-Medis] -> Rak/Storage`) berasal dari Worklist.
 * - EditorMap mengatur graf rute yang terbagi menjadi:
 *   1. `umum`   (Rute Umum): melewati segmen `umum` dan `bersama`
 *   2. `steril` (Rute Steril): melewati segmen `steril` dan `bersama`, wajib bebas tangga (`accessible !== false`),
 *      dan tidak melewati koridor khusus `umum`.
 */

const PORTAL_TRANSITION_PENALTY_METERS = {
  elevator: 8,
  stairs: 6,
  ramp: 5,
  bridge: 4
}

export function getFloorIndex(campus) {
  const floorsById = new Map()
  const buildingByFloorId = new Map()
  for (const b of campus.buildings || []) {
    for (const f of b.floors || []) {
      floorsById.set(f.id, f)
      buildingByFloorId.set(f.id, b)
    }
  }
  return { floorsById, buildingByFloorId }
}

export function getEffectiveRouteType(item) {
  const rt = item?.routeType || item?.zone
  if (rt === 'steril' || rt === 'sterile') return 'steril'
  if (rt === 'umum' || rt === 'public' || rt === 'restricted') return 'umum'
  return 'bersama'
}

export function isRouteAllowed(segmentRouteType, requestedMode) {
  const mode = requestedMode === 'sterile' || requestedMode === 'steril' ? 'steril' : 'umum'
  if (segmentRouteType === 'bersama') return true
  if (mode === 'steril') return segmentRouteType === 'steril'
  // Mode Rute Umum boleh melewati jalur 'umum' dan 'bersama'
  return segmentRouteType === 'umum'
}

export function findNearestNodeOnFloor(floor, x, y, options = {}) {
  if (!floor || !Array.isArray(floor.nav_nodes) || floor.nav_nodes.length === 0) return null
  const { preferRoomId = null, routeMode = null } = options

  const filterByRouteMode = (nodes) => {
    if (!routeMode) return nodes
    const allowed = nodes.filter((n) => isRouteAllowed(getEffectiveRouteType(n), routeMode))
    return allowed.length > 0 ? allowed : nodes
  }

  if (preferRoomId) {
    const room = (floor.rooms || []).find(
      (r) => r.id === preferRoomId || r.masterRoomId === preferRoomId
    )
    const pad = 14
    const isInsideRoom = (n) =>
      room &&
      n.x >= room.x - pad &&
      n.x <= room.x + room.w + pad &&
      n.y >= room.y - pad &&
      n.y <= room.y + room.h + pad

    const inRoom = floor.nav_nodes.filter((n) => n.roomId === preferRoomId)
    if (room) {
      const inRoomAndInside = inRoom.filter(isInsideRoom)
      if (inRoomAndInside.length > 0) {
        return pickClosest(filterByRouteMode(inRoomAndInside), x, y)
      }
      const insideOrDoor = floor.nav_nodes.filter(isInsideRoom)
      if (insideOrDoor.length > 0) {
        return pickClosest(filterByRouteMode(insideOrDoor), x, y)
      }
    }
    if (inRoom.length > 0) {
      return pickClosest(filterByRouteMode(inRoom), x, y)
    }
  }

  const candidates = filterByRouteMode(floor.nav_nodes)
  return pickClosest(candidates, x, y)
}

function pickClosest(nodes, x, y) {
  let best = null
  let minD = Infinity
  for (const n of nodes) {
    const d = Math.hypot(n.x - x, n.y - y)
    if (d < minD) {
      minD = d
      best = n
    }
  }
  return best
}

function buildCampusGraph(campus, profile = 'umum') {
  // Normalisasi profile:
  // 'steril' | 'sterile' => Rute Steril (wajib bebas tangga & hanya jalur steril/bersama)
  // 'umum' | 'accessible' => Rute Umum ramah troli (bebas tangga, jalur umum/bersama)
  // 'shortest' => Rute Umum tercepat (boleh tangga)
  const isSterilMode = profile === 'steril' || profile === 'sterile'
  const requireAccessible = isSterilMode || profile === 'accessible' || profile === 'umum'
  const routeMode = isSterilMode ? 'steril' : 'umum'

  const { floorsById, buildingByFloorId } = getFloorIndex(campus)
  const nodes = new Map()
  const adj = new Map()

  const addEdge = (fromKey, toKey, weightMeters, meta = {}) => {
    if (!adj.has(fromKey)) adj.set(fromKey, [])
    adj.get(fromKey).push({ to: toKey, weight: weightMeters, ...meta })
  }

  const portalsByGroup = new Map()

  for (const floor of floorsById.values()) {
    const ppm = floor.pixelsPerMeter || 20
    const floorNodesById = new Map()

    for (const n of floor.nav_nodes || []) {
      const key = `${floor.id}::${n.id}`
      const nodeRec = {
        ...n,
        routeType: getEffectiveRouteType(n),
        key,
        floorId: floor.id,
        floorName: floor.nama_lantai,
        buildingId: floor.building_asset_id,
        buildingName: buildingByFloorId.get(floor.id)?.nama || ''
      }
      nodes.set(key, nodeRec)
      floorNodesById.set(n.id, nodeRec)
      adj.set(key, [])

      if (n.kind === 'portal' && n.portalGroup) {
        if (!portalsByGroup.has(n.portalGroup)) portalsByGroup.set(n.portalGroup, [])
        portalsByGroup.get(n.portalGroup).push(nodeRec)
      }
    }

    for (const e of floor.edges || []) {
      const a = floorNodesById.get(e.from)
      const b = floorNodesById.get(e.to)
      if (!a || !b) continue

      const edgeRouteType = getEffectiveRouteType(e)
      const isAccessible = e.accessible !== false && a.accessible !== false && b.accessible !== false

      if (requireAccessible && !isAccessible) continue
      if (!isRouteAllowed(edgeRouteType, routeMode)) continue
      if (isSterilMode && (a.routeType === 'umum' || b.routeType === 'umum')) continue

      const distMeters = Math.hypot(a.x - b.x, a.y - b.y) / ppm
      // Pada mode steril, prioritaskan jalur khusus 'steril' sedikit lebih ringan daripada 'bersama'
      const multiplier = isSterilMode && edgeRouteType === 'steril' ? 0.95 : 1

      const weight = distMeters * multiplier
      addEdge(a.key, b.key, weight, {
        edgeType: 'corridor',
        distanceMeters: distMeters,
        routeType: edgeRouteType
      })
      addEdge(b.key, a.key, weight, {
        edgeType: 'corridor',
        distanceMeters: distMeters,
        routeType: edgeRouteType
      })
    }
  }

  // Sambungkan antar-lantai / antar-gedung melalui Portal Group yang sama
  for (const [group, portalList] of portalsByGroup.entries()) {
    for (let i = 0; i < portalList.length; i++) {
      for (let j = i + 1; j < portalList.length; j++) {
        const pA = portalList[i]
        const pB = portalList[j]
        const pType = pA.portalType || 'elevator'

        if (requireAccessible && pType === 'stairs') continue
        if (isSterilMode && (pA.routeType === 'umum' || pB.routeType === 'umum')) continue

        const penalty = PORTAL_TRANSITION_PENALTY_METERS[pType] || 6
        addEdge(pA.key, pB.key, penalty, {
          edgeType: 'portal',
          portalType: pType,
          portalGroup: group,
          distanceMeters: pType === 'bridge' ? 12 : 0
        })
        addEdge(pB.key, pA.key, penalty, {
          edgeType: 'portal',
          portalType: pType,
          portalGroup: group,
          distanceMeters: pType === 'bridge' ? 12 : 0
        })
      }
    }
  }

  return { nodes, adj, floorsById, routeMode }
}

function resolveAnchorToNodeKey(campus, anchor, graph) {
  if (!anchor) return null
  const floor = graph.floorsById.get(anchor.floorId)
  if (!floor) return null

  if (anchor.nodeId) {
    const exactKey = `${floor.id}::${anchor.nodeId}`
    if (graph.nodes.has(exactKey)) return exactKey
  }

  const x = anchor.x ?? 0
  const y = anchor.y ?? 0
  const nearest = findNearestNodeOnFloor(floor, x, y, {
    preferRoomId: anchor.roomId,
    routeMode: graph.routeMode
  })
  return nearest ? `${floor.id}::${nearest.id}` : null
}

export function computeMultiFloorRoute(campus, startAnchor, endAnchor, profile = 'umum') {
  const graph = buildCampusGraph(campus, profile)
  const startKey = resolveAnchorToNodeKey(campus, startAnchor, graph)
  const endKey = resolveAnchorToNodeKey(campus, endAnchor, graph)

  if (!startKey || !endKey) {
    return {
      found: false,
      costScore: Infinity,
      reason: 'Titik awal atau tujuan belum terhubung ke node rute.'
    }
  }

  if (startKey === endKey) {
    const node = graph.nodes.get(startKey)
    return {
      found: true,
      profile,
      routeMode: graph.routeMode,
      path: [node],
      segmentsByFloor: { [node.floorId]: [node] },
      totalMeters: 0,
      costScore: 0,
      etaSeconds: 5,
      steps: buildTurnByTurnInstructions([node], [])
    }
  }

  const openSet = new Set([startKey])
  const cameFrom = new Map()
  const edgeUsed = new Map()
  const gScore = new Map([[startKey, 0]])
  const fScore = new Map([[startKey, heuristic(graph.nodes.get(startKey), graph.nodes.get(endKey))]])

  while (openSet.size > 0) {
    let current = null
    let lowestF = Infinity
    for (const k of openSet) {
      const f = fScore.get(k) ?? Infinity
      if (f < lowestF) {
        lowestF = f
        current = k
      }
    }

    if (current === endKey) {
      const path = []
      const edges = []
      let curr = current
      while (curr) {
        path.unshift(graph.nodes.get(curr))
        if (edgeUsed.has(curr)) edges.unshift(edgeUsed.get(curr))
        curr = cameFrom.get(curr)
      }

      const totalMeters = edges.reduce((acc, e) => acc + (e.distanceMeters || 0), 0)
      const segmentsByFloor = {}
      for (const n of path) {
        if (!segmentsByFloor[n.floorId]) segmentsByFloor[n.floorId] = []
        segmentsByFloor[n.floorId].push(n)
      }

      const portalCount = edges.filter((e) => e.edgeType === 'portal').length
      const etaSeconds = Math.max(5, Math.round(totalMeters / 1.15 + portalCount * 12))

      return {
        found: true,
        profile,
        routeMode: graph.routeMode,
        path,
        edges,
        segmentsByFloor,
        totalMeters: Math.round(totalMeters * 10) / 10,
        costScore: Math.round((gScore.get(endKey) || 0) * 10) / 10,
        etaSeconds,
        steps: buildTurnByTurnInstructions(path, edges)
      }
    }

    openSet.delete(current)
    for (const neighbor of graph.adj.get(current) || []) {
      const tentativeG = (gScore.get(current) ?? Infinity) + neighbor.weight
      if (tentativeG < (gScore.get(neighbor.to) ?? Infinity)) {
        cameFrom.set(neighbor.to, current)
        edgeUsed.set(neighbor.to, neighbor)
        gScore.set(neighbor.to, tentativeG)
        fScore.set(neighbor.to, tentativeG + heuristic(graph.nodes.get(neighbor.to), graph.nodes.get(endKey)))
        openSet.add(neighbor.to)
      }
    }
  }

  return {
    found: false,
    profile,
    routeMode: graph.routeMode,
    costScore: Infinity,
    reason:
      graph.routeMode === 'steril'
        ? 'Rute Steril tidak ditemukan. Pastikan tujuan terhubung ke jalur Rute Steril atau Rute Bersama & Lift.'
        : 'Rute Umum tidak ditemukan (ruangan ini hanya dapat diakses melalui Jalur Rute Steril).'
  }
}

function heuristic(nodeA, nodeB) {
  if (!nodeA || !nodeB) return 0
  if (nodeA.floorId === nodeB.floorId) {
    return Math.hypot(nodeA.x - nodeB.x, nodeA.y - nodeB.y) / 20
  }
  return 6
}

export function buildTurnByTurnInstructions(path, edges) {
  if (!path || path.length === 0) return []
  const steps = []
  steps.push({
    type: 'start',
    floorId: path[0].floorId,
    text: `Mulai dari ${path[0].label || path[0].id} (${path[0].floorName})`
  })

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]
    const fromNode = path[i]
    const toNode = path[i + 1]
    if (!toNode) continue

    if (edge.edgeType === 'portal') {
      const pType = edge.portalType
      if (pType === 'elevator') {
        steps.push({
          type: 'portal',
          floorId: toNode.floorId,
          text: `Gunakan ${fromNode.label || 'Lift'} menuju ${toNode.floorName}`
        })
      } else if (pType === 'bridge') {
        steps.push({
          type: 'portal',
          floorId: toNode.floorId,
          text: `Lewati selasar penghubung menuju ${toNode.buildingName}`
        })
      } else {
        steps.push({
          type: 'portal',
          floorId: toNode.floorId,
          text: `Gunakan ${fromNode.label || 'Tangga'} menuju ${toNode.floorName}`
        })
      }
    } else {
      const dist = Math.round((edge.distanceMeters || 0) * 10) / 10
      const label = toNode.label || toNode.id
      const rBadge = edge.routeType === 'steril' ? '[Jalur Steril]' : edge.routeType === 'umum' ? '[Jalur Umum]' : ''
      steps.push({
        type: i === edges.length - 1 ? 'arrive' : 'walk',
        floorId: toNode.floorId,
        distanceMeters: dist,
        text:
          i === edges.length - 1
            ? `Masuk ke ${label} (${dist} m)`
            : `Berjalan ${dist} m ke ${label} ${rBadge}`.trim()
      })
    }
  }
  return steps
}

export function findNearestItemLocations(campus, keyword, startAnchor, profile = 'umum') {
  const q = (keyword || '').trim().toLowerCase()
  const matches = []

  for (const building of campus.buildings || []) {
    for (const floor of building.floors || []) {
      const roomsById = new Map()
      for (const r of floor.rooms || []) {
        roomsById.set(r.id, r)
        if (r.masterRoomId) roomsById.set(r.masterRoomId, r)
      }

      for (const rack of floor.racks || []) {
        const room = roomsById.get(rack.ruangan_id)
        for (const slot of rack.slots || []) {
          if ((slot.qty ?? 0) <= 0) continue
          const hay = [
            slot.namaBarang,
            slot.kodeBarang,
            slot.batchNo,
            room?.nama,
            room?.kode,
            rack.nama,
            rack.kode,
            floor.nama_lantai,
            building.nama
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (q && !hay.includes(q)) continue

          const rackCenterX = rack.x + rack.w / 2
          const rackCenterY = rack.y + rack.h / 2
          const route = computeMultiFloorRoute(
            campus,
            startAnchor,
            {
              floorId: floor.id,
              roomId: rack.ruangan_id,
              x: rackCenterX,
              y: rackCenterY
            },
            profile
          )

          matches.push({
            buildingId: building.id,
            buildingName: building.nama,
            floorId: floor.id,
            floorName: floor.nama_lantai,
            roomId: room?.id || null,
            roomName: room?.nama || 'Tanpa Ruangan',
            roomIsMedis: Boolean(room?.is_medis),
            rackId: rack.id,
            rackUuid: rack.uuid,
            rackKode: rack.kode,
            rackName: rack.nama,
            rackType: rack.rackType,
            slot,
            route
          })
        }
      }
    }
  }

  matches.sort((a, b) => {
    if (a.route.found && !b.route.found) return -1
    if (!a.route.found && b.route.found) return 1
    if (a.route.found && b.route.found) {
      return a.route.costScore - b.route.costScore
    }
    return b.slot.qty - a.slot.qty
  })

  return matches
}

export function findNearestRoomLocations(campus, keyword, startAnchor, profile = 'umum') {
  const q = (keyword || '').trim().toLowerCase()
  const matches = []

  for (const building of campus.buildings || []) {
    for (const floor of building.floors || []) {
      for (const room of floor.rooms || []) {
        const categoryText = room.is_medis ? 'medis ruangan medis' : 'non-medis non medis ruangan non-medis'
        const hay = [room.nama, room.kode, building.nama, building.kode, floor.nama_lantai, categoryText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (q && !hay.includes(q)) continue

        const racksInRoom = (floor.racks || []).filter(
          (rk) => rk.ruangan_id === room.id || (room.masterRoomId && rk.ruangan_id === room.masterRoomId)
        )
        const itemCount = racksInRoom.reduce(
          (acc, rk) => acc + (rk.slots || []).filter((s) => (s.qty ?? 0) > 0).length,
          0
        )

        const route = computeMultiFloorRoute(
          campus,
          startAnchor,
          {
            floorId: floor.id,
            roomId: room.masterRoomId || room.id,
            x: room.x + room.w / 2,
            y: room.y + room.h / 2
          },
          profile
        )

        matches.push({
          kind: 'room',
          buildingId: building.id,
          buildingName: building.nama,
          floorId: floor.id,
          floorName: floor.nama_lantai,
          roomId: room.id,
          masterRoomId: room.masterRoomId,
          roomKode: room.kode,
          roomName: room.nama,
          roomIsMedis: Boolean(room.is_medis),
          rackCount: racksInRoom.length,
          itemCount,
          route
        })
      }
    }
  }

  matches.sort((a, b) => {
    if (a.route.found && !b.route.found) return -1
    if (!a.route.found && b.route.found) return 1
    if (a.route.found && b.route.found) {
      return a.route.costScore - b.route.costScore
    }
    return a.roomName.localeCompare(b.roomName)
  })

  return matches
}

export { validateCampusGraph } from './mapAudit.js'
