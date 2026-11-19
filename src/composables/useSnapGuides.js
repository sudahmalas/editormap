/**
 * Menghitung posisi snap live saat drag + garis bantu sejajar (Figma/CorelDRAW Smart Guides).
 */
export function computeDragSnapAndGuides(rawX, rawY, type, entity, floor, store) {
  const isSnap = Boolean(store.snapToGrid.value)
  const w = type === 'node' ? 0 : entity.w || 0
  const h = type === 'node' ? 0 : entity.h || 0

  let nx = isSnap ? store.snap(rawX) : Math.round(rawX)
  let ny = isSnap ? store.snap(rawY) : Math.round(rawY)

  const peers = collectPeers(type, entity.id, floor)
  const threshold = isSnap ? 4 : 7

  let bestV = null
  let bestDistV = threshold + 1
  const myXPoints = [
    { offset: 0, val: rawX },
    ...(w > 0 ? [{ offset: w / 2, val: rawX + w / 2 }, { offset: w, val: rawX + w }] : [])
  ]

  for (const peer of peers) {
    const pxPoints = peer.w > 0 ? [peer.x, peer.x + peer.w / 2, peer.x + peer.w] : [peer.x]
    for (const mx of myXPoints) {
      for (const px of pxPoints) {
        const d = Math.abs(mx.val - px)
        if (d < bestDistV) {
          bestDistV = d
          bestV = { snappedX: Math.round(px - mx.offset), guideX: px, peer }
        }
      }
    }
  }

  let bestH = null
  let bestDistH = threshold + 1
  const myYPoints = [
    { offset: 0, val: rawY },
    ...(h > 0 ? [{ offset: h / 2, val: rawY + h / 2 }, { offset: h, val: rawY + h }] : [])
  ]

  for (const peer of peers) {
    const pyPoints = peer.h > 0 ? [peer.y, peer.y + peer.h / 2, peer.y + peer.h] : [peer.y]
    for (const my of myYPoints) {
      for (const py of pyPoints) {
        const d = Math.abs(my.val - py)
        if (d < bestDistH) {
          bestDistH = d
          bestH = { snappedY: Math.round(py - my.offset), guideY: py, peer }
        }
      }
    }
  }

  const guides = []
  if (bestV) {
    nx = bestV.snappedX
    const y1 = Math.min(ny, bestV.peer.y) - 18
    const y2 = Math.max(ny + h, bestV.peer.y + bestV.peer.h) + 18
    guides.push({ points: [bestV.guideX, y1, bestV.guideX, y2] })
  }
  if (bestH) {
    ny = bestH.snappedY
    const x1 = Math.min(nx, bestH.peer.x) - 18
    const x2 = Math.max(nx + w, bestH.peer.x + bestH.peer.w) + 18
    guides.push({ points: [x1, bestH.guideY, x2, bestH.guideY] })
  }

  const label = isSnap
    ? `X: ${nx} · Y: ${ny}  (Grid ${store.gridSize.value}px)`
    : `X: ${nx} · Y: ${ny}`

  return {
    nx,
    ny,
    guides,
    snapHud: { x: nx, y: ny - 26, text: label }
  }
}

function collectPeers(type, selfId, floor) {
  if (!floor) return []
  const list = []
  if (type === 'room' || type === 'rack') {
    for (const r of floor.rooms || []) {
      if (!(type === 'room' && r.id === selfId)) {
        list.push({ x: r.x, y: r.y, w: r.w, h: r.h })
      }
    }
  }
  if (type === 'rack') {
    for (const rk of floor.racks || []) {
      if (rk.id !== selfId) {
        list.push({ x: rk.x, y: rk.y, w: rk.w, h: rk.h })
      }
    }
  }
  if (type === 'node') {
    for (const n of floor.nav_nodes || []) {
      if (n.id !== selfId) {
        list.push({ x: n.x, y: n.y, w: 0, h: 0 })
      }
    }
  }
  return list
}
