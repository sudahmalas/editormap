/**
 * Audit & Validasi Kualitas Denah Sebelum Publish
 * Memeriksa kelengkapan binding Master Worklist (Ruangan & Penyimpanan) dan konektivitas graf rute.
 */

export function validateCampusGraph(campus) {
  const issues = []
  const portalGroups = new Map()

  for (const b of campus.buildings || []) {
    for (const f of b.floors || []) {
      const nodeIds = new Set((f.nav_nodes || []).map((n) => n.id))
      const degree = new Map()
      for (const id of nodeIds) degree.set(id, 0)

      for (const e of f.edges || []) {
        if (nodeIds.has(e.from) && nodeIds.has(e.to)) {
          degree.set(e.from, (degree.get(e.from) || 0) + 1)
          degree.set(e.to, (degree.get(e.to) || 0) + 1)
        } else {
          issues.push({
            severity: 'error',
            floorId: f.id,
            message: `[${f.kode_lantai}] Segmen jalur '${e.id}' merujuk titik yang tidak ada.`
          })
        }
      }

      for (const n of f.nav_nodes || []) {
        if ((degree.get(n.id) || 0) === 0) {
          issues.push({
            severity: 'warning',
            floorId: f.id,
            message: `[${f.kode_lantai}] Titik '${n.label || n.id}' belum tersambung ke jalur rute.`
          })
        }
        if (n.kind === 'portal') {
          const g = n.portalGroup || ''
          if (!g) {
            issues.push({
              severity: 'error',
              floorId: f.id,
              message: `[${f.kode_lantai}] Portal '${n.label || n.id}' belum memiliki Portal Group.`
            })
          } else {
            if (!portalGroups.has(g)) portalGroups.set(g, [])
            portalGroups.get(g).push({ floor: f, node: n })
          }
        }
      }

      for (const r of f.rooms || []) {
        if (!r.masterRoomId) {
          issues.push({
            severity: 'error',
            floorId: f.id,
            message: `[${f.kode_lantai}] Kotak '${r.nama}' belum di-link ke Master Ruangan Worklist.`
          })
        }
        const hasNode = (f.nav_nodes || []).some((n) => n.roomId === r.id)
        if (!hasNode) {
          issues.push({
            severity: 'warning',
            floorId: f.id,
            message: `[${f.kode_lantai}] Ruangan '${r.nama}' belum terhubung ke titik rute.`
          })
        }
      }

      for (const rk of f.racks || []) {
        if (!rk.masterStorageId) {
          issues.push({
            severity: 'error',
            floorId: f.id,
            message: `[${f.kode_lantai}] Kotak '${rk.nama}' belum di-link ke Master Penyimpanan (Asset Storage).`
          })
        }
        if (!rk.ruangan_id) {
          issues.push({
            severity: 'warning',
            floorId: f.id,
            message: `[${f.kode_lantai}] Penyimpanan '${rk.nama}' belum berada di dalam kotak ruangan.`
          })
        }
      }
    }
  }

  for (const [group, list] of portalGroups.entries()) {
    if (list.length < 2) {
      issues.push({
        severity: 'warning',
        floorId: list[0].floor.id,
        message: `Portal Group '${group}' baru ada di 1 lantai (${list[0].floor.kode_lantai}).`
      })
    }
  }

  return issues
}
