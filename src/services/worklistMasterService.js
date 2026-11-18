/**
 * Worklist Master Lookup Service
 * Menyediakan data Master Ruangan (/api/combobox/lokasi/ruangan)
 * dan Master Penyimpanan (/api/combobox/lokasi/storage) untuk binding di EditorMap.
 * Saat mode standalone, membaca dari dataset demo; saat terhubung ke Worklist, siap fetch API.
 */

export function getWorklistRoomOptions(building, allFloors = []) {
  if (!building) return []
  const placedMap = new Map()
  for (const f of building.floors || []) {
    for (const r of f.rooms || []) {
      if (r.masterRoomId) placedMap.set(r.masterRoomId, f.kode_lantai)
    }
  }

  return (building.masterRooms || []).map((mr) => {
    const placedFloor = placedMap.get(mr.id)
    return {
      value: mr.id,
      id: mr.id,
      kode: mr.kode,
      nama: mr.nama,
      is_medis: Boolean(mr.is_medis),
      label: mr.nama,
      sublabel: placedFloor ? `${mr.kode} • Sudah di ${placedFloor}` : `${mr.kode} • Belum di denah`,
      badge: mr.is_medis ? 'Medis' : 'Non-Medis',
      badgeClass: mr.is_medis
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : 'bg-slate-100 text-slate-600 border-slate-200',
      dotColor: mr.is_medis ? '#0284c7' : '#64748b'
    }
  })
}

export function getWorklistStorageOptions(campus, roomId = null) {
  const list = campus?.masterStorages || []
  const roomMap = new Map()
  for (const b of campus?.buildings || []) {
    for (const mr of b.masterRooms || []) {
      roomMap.set(mr.id, mr.nama)
    }
  }

  // Urutkan storage yang berada di ruangan yang sama terlebih dahulu (sama seperti StorageAction.php di Worklist)
  const sorted = [...list].sort((a, b) => {
    const aMatch = roomId && a.lokasi_id === roomId ? 0 : 1
    const bMatch = roomId && b.lokasi_id === roomId ? 0 : 1
    if (aMatch !== bMatch) return aMatch - bMatch
    return (a.nama || '').localeCompare(b.nama || '')
  })

  return sorted.map((st) => {
    const roomName = roomMap.get(st.lokasi_id)
    const inTargetRoom = roomId && st.lokasi_id === roomId
    return {
      value: st.id,
      id: st.id,
      uuid: st.uuid,
      kode: st.kode,
      nama: st.nama,
      rackType: st.rackType || 'rak',
      is_medis: Boolean(st.is_medis),
      lokasi_id: st.lokasi_id,
      rows: st.rows || 3,
      cols: st.cols || 4,
      label: st.nama,
      sublabel: roomName ? `${st.kode} • ${roomName}` : st.kode,
      group: inTargetRoom ? 'Penyimpanan di Ruangan Ini' : 'Seluruh Master Penyimpanan Asset',
      badge: st.rackType?.toUpperCase() || 'RAK',
      badgeClass: st.is_medis
        ? 'bg-teal-50 text-teal-700 border-teal-200'
        : 'bg-slate-100 text-slate-600 border-slate-200'
    }
  })
}
