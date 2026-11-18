/**
 * Worklist Schema Adapter
 * Memetakan struktur EditorMap <-> payload database Worklist:
 * - Master `assets` (`tipe = 'infra'`, `kategori = 'outlet'|'bangunan'|'ruangan'`, `is_medis = boolean`)
 * - `denah_maps` (`nav_nodes`, `path_graph` dengan `route_type: 'umum'|'steril'|'bersama'`)
 * - `stock_containers` (`lokasi_id`, `data.mapping`, `rack_map`)
 */

export function exportToWorklistPayload(campus) {
  const denahMaps = []
  const stockContainers = []

  for (const building of campus.buildings || []) {
    for (const floor of building.floors || []) {
      denahMaps.push({
        id: floor.id,
        building_asset_id: building.id,
        nama_lantai: floor.nama_lantai,
        kode_lantai: floor.kode_lantai,
        image_url: floor.image_url || null,
        is_active: floor.status === 'published',
        nav_nodes: (floor.nav_nodes || []).map((n) => ({
          id: n.id,
          label: n.label,
          x: n.x,
          y: n.y,
          kind: n.kind || 'corridor',
          route_type: n.routeType || 'bersama',
          room_asset_id: n.roomId || null,
          portal_type: n.portalType || null,
          portal_group: n.portalGroup || null,
          accessible: n.accessible !== false
        })),
        path_graph: {
          version: 3,
          status: floor.status || 'draft',
          canvas: {
            width: floor.width || 1000,
            height: floor.height || 620,
            pixels_per_meter: floor.pixelsPerMeter || 20
          },
          rooms: (floor.rooms || []).map((r) => ({
            asset_id: r.masterRoomId || r.id,
            kode: r.kode,
            nama: r.nama,
            is_medis: Boolean(r.is_medis),
            x: r.x,
            y: r.y,
            w: r.w,
            h: r.h,
            doors: r.doors || []
          })),
          edges: (floor.edges || []).map((e) => ({
            id: e.id,
            from: e.from,
            to: e.to,
            route_type: e.routeType || 'bersama',
            accessible: e.accessible !== false,
            label: e.label || null
          }))
        }
      })

      for (const rack of floor.racks || []) {
        stockContainers.push({
          id: rack.id,
          uuid: rack.uuid,
          barcode: rack.kode,
          lokasi_id: rack.ruangan_id,
          data: {
            nama_storage: rack.nama,
            rack_type: rack.rackType,
            is_medis: Boolean(rack.is_medis),
            mapping: {
              floor_id: floor.id,
              kode_lantai: floor.kode_lantai,
              x: rack.x,
              y: rack.y,
              w: rack.w,
              h: rack.h,
              rotation: rack.rotation || 0
            }
          },
          rack_map: {
            rows: rack.rows || 3,
            cols: rack.cols || 4,
            slots: (rack.slots || []).map((s) => ({
              row: s.row,
              col: s.col,
              asset_id: s.assetId || null,
              kode_barang: s.kodeBarang || null,
              nama_barang: s.namaBarang || null,
              satuan: s.satuan || 'Box',
              qty: s.qty ?? 0,
              batch_no: s.batchNo || null,
              expired_at: s.expiredAt || null,
              is_steril: Boolean(s.isSteril)
            }))
          }
        })
      }
    }
  }

  return {
    schema: 'id-grow.editormap.worklist.v2',
    exported_at: new Date().toISOString(),
    outlet: campus.outlet,
    denah_maps: denahMaps,
    stock_containers: stockContainers
  }
}

export function importFromWorklistPayload(payload) {
  if (!payload || !Array.isArray(payload.denah_maps)) {
    throw new Error('Format JSON tidak valid: properti denah_maps tidak ditemukan.')
  }

  const containersByFloor = new Map()
  for (const c of payload.stock_containers || []) {
    const mapMeta = c.data?.mapping || {}
    const floorKey = mapMeta.floor_id || mapMeta.kode_lantai
    if (!containersByFloor.has(floorKey)) containersByFloor.set(floorKey, [])
    containersByFloor.get(floorKey).push({
      id: c.id,
      masterStorageId: c.id,
      uuid: c.uuid,
      kode: c.barcode,
      nama: c.data?.nama_storage || c.barcode,
      rackType: c.data?.rack_type || 'rak',
      is_medis: Boolean(c.data?.is_medis ?? true),
      ruangan_id: c.lokasi_id,
      x: mapMeta.x ?? 80,
      y: mapMeta.y ?? 80,
      w: mapMeta.w ?? 100,
      h: mapMeta.h ?? 46,
      rotation: mapMeta.rotation ?? 0,
      rows: c.rack_map?.rows ?? 3,
      cols: c.rack_map?.cols ?? 4,
      slots: (c.rack_map?.slots || []).map((s) => ({
        row: s.row,
        col: s.col,
        assetId: s.asset_id,
        kodeBarang: s.kode_barang,
        namaBarang: s.nama_barang,
        satuan: s.satuan || 'Box',
        qty: s.qty ?? 0,
        batchNo: s.batch_no || '',
        expiredAt: s.expired_at || '',
        isSteril: Boolean(s.is_steril)
      }))
    })
  }

  const buildingsMap = new Map()
  for (const dm of payload.denah_maps) {
    if (!buildingsMap.has(dm.building_asset_id)) {
      buildingsMap.set(dm.building_asset_id, {
        id: dm.building_asset_id,
        kode: `BGN-${dm.building_asset_id}`,
        nama: `Bangunan #${dm.building_asset_id}`,
        tipe: 'infra',
        kategori: 'bangunan',
        masterRooms: [],
        floors: []
      })
    }
    const pg = dm.path_graph || {}
    const floorRacks = containersByFloor.get(dm.id) || containersByFloor.get(dm.kode_lantai) || []
    const mappedRooms = (pg.rooms || []).map((r) => ({
      id: r.asset_id,
      masterRoomId: r.asset_id,
      kode: r.kode,
      nama: r.nama,
      is_medis: Boolean(r.is_medis ?? r.space_type !== 'koridor'),
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      doors: r.doors || []
    }))

    const bObj = buildingsMap.get(dm.building_asset_id)
    for (const mr of mappedRooms) {
      if (!bObj.masterRooms.some((x) => x.id === mr.id)) {
        bObj.masterRooms.push({ id: mr.id, kode: mr.kode, nama: mr.nama, is_medis: mr.is_medis })
      }
    }

    bObj.floors.push({
      id: dm.id,
      building_asset_id: dm.building_asset_id,
      nama_lantai: dm.nama_lantai,
      kode_lantai: dm.kode_lantai,
      level_order: bObj.floors.length + 1,
      status: pg.status || (dm.is_active ? 'published' : 'draft'),
      pixelsPerMeter: pg.canvas?.pixels_per_meter || 20,
      width: pg.canvas?.width || 1000,
      height: pg.canvas?.height || 620,
      image_url: dm.image_url || null,
      image_opacity: 0.35,
      rooms: mappedRooms,
      racks: floorRacks,
      nav_nodes: (dm.nav_nodes || []).map((n) => ({
        id: n.id,
        label: n.label,
        x: n.x,
        y: n.y,
        kind: n.kind || 'corridor',
        routeType: n.route_type || n.zone || 'bersama',
        roomId: n.room_asset_id || null,
        portalType: n.portal_type || null,
        portalGroup: n.portal_group || null,
        accessible: n.accessible !== false
      })),
      edges: (pg.edges || []).map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        routeType: e.route_type || e.zone || 'bersama',
        accessible: e.accessible !== false,
        label: e.label || null
      }))
    })
  }

  return {
    outlet: payload.outlet || { id: 1, nama: 'RSU Imported', kode: 'OUT-IMP', tipe: 'infra', kategori: 'outlet' },
    buildings: Array.from(buildingsMap.values()),
    porterTasks: []
  }
}
