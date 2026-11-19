/**
 * Demo Dataset mengikuti Skema Master Worklist:
 * - Master Ruangan (`assets` tipe='infra', kategori='ruangan', is_medis=boolean)
 * - Master Penyimpanan (`assets` is_storage=true / `stock_containers`)
 * - Denah (`denah_maps`) hanya menyimpan geometri penempatan & graf Rute (umum | steril | bersama)
 */

export const ROOM_MEDIS_STYLES = {
  medis: {
    is_medis: true,
    label: 'Ruangan Medis',
    fill: '#e0f2fe',
    stroke: '#0284c7',
    badge: 'bg-sky-100 text-sky-800 border-sky-200'
  },
  non_medis: {
    is_medis: false,
    label: 'Ruangan Non-Medis',
    fill: '#f1f5f9',
    stroke: '#64748b',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  unbound: {
    label: 'Belum Di-link',
    fill: '#fefce8',
    stroke: '#ca8a04',
    badge: 'bg-amber-100 text-amber-800 border-amber-200'
  }
}

export function getRoomStyle(room) {
  if (!room?.masterRoomId) return ROOM_MEDIS_STYLES.unbound
  return room.is_medis ? ROOM_MEDIS_STYLES.medis : ROOM_MEDIS_STYLES.non_medis
}

export const ROUTE_TYPES = {
  umum: {
    id: 'umum',
    label: 'Rute Umum',
    desc: 'Jalur distribusi barang/logistik umum & staf reguler',
    color: '#1a73e8'
  },
  steril: {
    id: 'steril',
    label: 'Rute Steril',
    desc: 'Jalur khusus pengantaran alat steril (wajib bebas tangga)',
    color: '#0d9488'
  },
  bersama: {
    id: 'bersama',
    label: 'Rute Umum & Steril',
    desc: 'Koridor/lift yang dapat dilalui rute umum maupun rute steril',
    color: '#6366f1'
  }
}

export const RACK_TYPES = {
  rak: { id: 'rak', label: 'Rak / Ambalan', color: '#0ea5e9' },
  lemari: { id: 'lemari', label: 'Lemari / Cabinet', color: '#0d9488' },
  cold_storage: { id: 'cold_storage', label: 'Cold Storage / Kulkas Medis', color: '#6366f1' },
  pallet: { id: 'pallet', label: 'Pallet Storage', color: '#d97706' },
  box: { id: 'box', label: 'Box / Kontainer', color: '#64748b' }
}

export function createInitialCampusData() {
  return {
    outlet: {
      id: 1,
      nama: 'RSU Grow Medical',
      kode: 'OUT-RSUGM',
      tipe: 'infra',
      kategori: 'outlet'
    },
    // Master Penyimpanan Worklist (`stock_containers` + `assets.is_storage=true`)
    masterStorages: [
      { id: 3001, uuid: 'rack-frm-a1', kode: 'STG-FRM-A1', nama: 'Rak Obat & BHP A-1', rackType: 'rak', is_medis: true, lokasi_id: 2003, rows: 3, cols: 4 },
      { id: 3002, uuid: 'rack-frm-cs1', kode: 'STG-CLD-01', nama: 'Cold Storage Vaksin', rackType: 'cold_storage', is_medis: true, lokasi_id: 2003, rows: 2, cols: 3 },
      { id: 3003, uuid: 'rack-igd-tr1', kode: 'STG-IGD-01', nama: 'Lemari Alkes Emergency IGD', rackType: 'lemari', is_medis: true, lokasi_id: 2002, rows: 3, cols: 3 },
      { id: 3004, uuid: 'rack-frm-b2', kode: 'STG-FRM-B2', nama: 'Rak Infus & Cairan B-2', rackType: 'rak', is_medis: true, lokasi_id: 2003, rows: 3, cols: 4 },
      { id: 3101, uuid: 'rack-cssd-01', kode: 'STG-CSSD-01', nama: 'Lemari Instrumen Steril CSSD-01', rackType: 'lemari', is_medis: true, lokasi_id: 2101, rows: 3, cols: 4 },
      { id: 3102, uuid: 'rack-cssd-02', kode: 'STG-CSSD-02', nama: 'Lemari Kasa & Linen Steril CSSD-02', rackType: 'lemari', is_medis: true, lokasi_id: 2101, rows: 3, cols: 3 },
      { id: 3201, uuid: 'rack-gdg-p1', kode: 'STG-GDG-01', nama: 'Pallet Gudang G-01 (Cairan & BHP)', rackType: 'pallet', is_medis: true, lokasi_id: 2201, rows: 3, cols: 5 },
      { id: 3202, uuid: 'rack-gdg-r2', kode: 'STG-GDG-02', nama: 'Rak Gudang G-02 (Alat Suntik)', rackType: 'rak', is_medis: true, lokasi_id: 2201, rows: 4, cols: 4 },
      { id: 3203, uuid: 'rack-umum-01', kode: 'STG-UMM-01', nama: 'Rak Logistik ATK & Umum', rackType: 'rak', is_medis: false, lokasi_id: 2202, rows: 3, cols: 4 }
    ],
    buildings: [
      {
        id: 101,
        parent_asset_id: 1,
        kode: 'BGN-001',
        nama: 'Gedung A — Pelayanan Utama',
        tipe: 'infra',
        kategori: 'bangunan',
        masterRooms: [
          { id: 2001, kode: 'RNG-001', nama: 'Lobby & Pos Porter', is_medis: false },
          { id: 2002, kode: 'RNG-002', nama: 'Instalasi Gawat Darurat (IGD)', is_medis: true },
          { id: 2003, kode: 'RNG-003', nama: 'Depo Farmasi Lt.1', is_medis: true },
          { id: 2004, kode: 'RNG-004', nama: 'Ruang Utilitas & Dekontaminasi', is_medis: false },
          { id: 2005, kode: 'RNG-005', nama: 'Area Selasar Penghubung', is_medis: false },
          { id: 2006, kode: 'RNG-006', nama: 'Poliklinik Spesialis', is_medis: true },
          { id: 2101, kode: 'RNG-101', nama: 'Instalasi CSSD (Pusat Sterilisasi)', is_medis: true },
          { id: 2102, kode: 'RNG-102', nama: 'Kamar Operasi 1 (OK-1)', is_medis: true },
          { id: 2103, kode: 'RNG-103', nama: 'Kamar Operasi 2 (OK-2)', is_medis: true },
          { id: 2104, kode: 'RNG-104', nama: 'Intensive Care Unit (ICU)', is_medis: true }
        ],
        floors: [
          {
            id: 1001,
            building_asset_id: 101,
            nama_lantai: 'Lantai 1 — IGD, Farmasi & Akses Gudang',
            kode_lantai: 'BGN-001-L1',
            level_order: 1,
            status: 'published',
            pixelsPerMeter: 20,
            width: 1000,
            height: 620,
            image_url: null,
            image_opacity: 0.35,
            rooms: [
              { id: 2001, masterRoomId: 2001, kode: 'RNG-001', nama: 'Lobby & Pos Porter', is_medis: false, x: 40, y: 40, w: 220, h: 200, doors: [{ id: 'd-2001-1', x: 160, y: 240 }] },
              { id: 2002, masterRoomId: 2002, kode: 'RNG-002', nama: 'Instalasi Gawat Darurat (IGD)', is_medis: true, x: 40, y: 340, w: 300, h: 240, doors: [{ id: 'd-2002-1', x: 200, y: 340 }] },
              { id: 2003, masterRoomId: 2003, kode: 'RNG-003', nama: 'Depo Farmasi Lt.1', is_medis: true, x: 320, y: 40, w: 280, h: 200, doors: [{ id: 'd-2003-1', x: 460, y: 240 }] },
              { id: 2004, masterRoomId: 2004, kode: 'RNG-004', nama: 'Ruang Utilitas & Dekontaminasi', is_medis: false, x: 400, y: 340, w: 240, h: 240, doors: [{ id: 'd-2004-1', x: 520, y: 340 }] },
              { id: 2005, masterRoomId: 2005, kode: 'RNG-005', nama: 'Area Selasar Penghubung', is_medis: false, x: 680, y: 40, w: 280, h: 200, doors: [{ id: 'd-2005-1', x: 760, y: 240 }] }
            ],
            racks: [
              {
                id: 3001,
                masterStorageId: 3001,
                uuid: 'rack-frm-a1',
                kode: 'STG-FRM-A1',
                nama: 'Rak Obat & BHP A-1',
                rackType: 'rak',
                is_medis: true,
                ruangan_id: 2003,
                x: 350,
                y: 80,
                w: 96,
                h: 44,
                rotation: 0,
                rows: 3,
                cols: 4,
                slots: [
                  { row: 1, col: 1, assetId: 5001, kodeBarang: 'BHP-KASA-10', namaBarang: 'Kasa Steril 10x10 cm', satuan: 'Box', qty: 42, batchNo: 'BTH-2610-KS', expiredAt: '2027-08-30', isSteril: true },
                  { row: 1, col: 2, assetId: 5002, kodeBarang: 'BHP-SPUIT-5', namaBarang: 'Spuit Disposable 5 ml', satuan: 'Box', qty: 65, batchNo: 'BTH-2611-SP', expiredAt: '2028-01-15', isSteril: true },
                  { row: 2, col: 1, assetId: 5003, kodeBarang: 'BHP-INF-RL', namaBarang: 'Cairan Infus Ringer Laktat 500ml', satuan: 'Kolf', qty: 80, batchNo: 'BTH-2609-RL', expiredAt: '2027-06-20', isSteril: false }
                ]
              },
              {
                id: 3002,
                masterStorageId: 3002,
                uuid: 'rack-frm-cs1',
                kode: 'STG-CLD-01',
                nama: 'Cold Storage Vaksin',
                rackType: 'cold_storage',
                is_medis: true,
                ruangan_id: 2003,
                x: 480,
                y: 80,
                w: 88,
                h: 46,
                rotation: 0,
                rows: 2,
                cols: 3,
                slots: [
                  { row: 1, col: 1, assetId: 5006, kodeBarang: 'BHP-INSULIN', namaBarang: 'Insulin Pen 100 IU/ml', satuan: 'Pen', qty: 24, batchNo: 'BTH-2611-INS', expiredAt: '2027-03-10', isSteril: false }
                ]
              },
              {
                id: 3003,
                masterStorageId: 3003,
                uuid: 'rack-igd-tr1',
                kode: 'STG-IGD-01',
                nama: 'Lemari Alkes Emergency IGD',
                rackType: 'lemari',
                is_medis: true,
                ruangan_id: 2002,
                x: 80,
                y: 440,
                w: 110,
                h: 44,
                rotation: 0,
                rows: 3,
                cols: 3,
                slots: [
                  { row: 1, col: 1, assetId: 5001, kodeBarang: 'BHP-KASA-10', namaBarang: 'Kasa Steril 10x10 cm', satuan: 'Box', qty: 8, batchNo: 'BTH-2610-KS', expiredAt: '2027-08-30', isSteril: true }
                ]
              }
            ],
            nav_nodes: [
              { id: 'n1-lobby', label: 'Titik Lobby / Porter', x: 160, y: 280, kind: 'corridor', routeType: 'bersama', roomId: 2001 },
              { id: 'n1-igd-door', label: 'Akses Pintu IGD', x: 200, y: 280, kind: 'door', routeType: 'bersama', roomId: 2002 },
              { id: 'n1-igd-in', label: 'Titik Dalam IGD', x: 200, y: 390, kind: 'room', routeType: 'bersama', roomId: 2002 },
              { id: 'n1-c1', label: 'Simpang Depo Farmasi', x: 460, y: 280, kind: 'corridor', routeType: 'bersama' },
              { id: 'n1-frm-in', label: 'Titik Dalam Farmasi', x: 460, y: 170, kind: 'room', routeType: 'bersama', roomId: 2003 },
              { id: 'n1-util-door', label: 'Koridor Utilitas (Umum)', x: 520, y: 310, kind: 'corridor', routeType: 'umum' },
              { id: 'n1-util-in', label: 'Titik Ruang Utilitas', x: 520, y: 400, kind: 'room', routeType: 'umum', roomId: 2004 },
              { id: 'n1-c2', label: 'Simpang Lift Lt.1', x: 760, y: 280, kind: 'corridor', routeType: 'bersama' },
              { id: 'n1-lift-steril', label: 'Lift Medis & Steril Lt.1', x: 840, y: 360, kind: 'portal', portalType: 'elevator', portalGroup: 'LIFT-UTAMA', routeType: 'bersama', accessible: true },
              { id: 'n1-stairs', label: 'Tangga Umum Lt.1', x: 760, y: 440, kind: 'portal', portalType: 'stairs', portalGroup: 'TANGGA-UTARA', routeType: 'umum', accessible: false },
              { id: 'n1-skybridge', label: 'Selasar ke Gedung Gudang', x: 920, y: 160, kind: 'portal', portalType: 'bridge', portalGroup: 'SKYBRIDGE-GUDANG', routeType: 'bersama', accessible: true, roomId: 2005 }
            ],
            edges: [
              { id: 'e1-1', from: 'n1-lobby', to: 'n1-igd-door', routeType: 'bersama', accessible: true },
              { id: 'e1-2', from: 'n1-igd-door', to: 'n1-igd-in', routeType: 'bersama', accessible: true },
              { id: 'e1-3', from: 'n1-igd-door', to: 'n1-c1', routeType: 'bersama', accessible: true },
              { id: 'e1-4', from: 'n1-c1', to: 'n1-frm-in', routeType: 'bersama', accessible: true },
              { id: 'e1-5', from: 'n1-c1', to: 'n1-util-door', routeType: 'umum', accessible: true },
              { id: 'e1-6', from: 'n1-util-door', to: 'n1-util-in', routeType: 'umum', accessible: true },
              { id: 'e1-7', from: 'n1-util-door', to: 'n1-c2', routeType: 'umum', accessible: true },
              { id: 'e1-8', from: 'n1-c1', to: 'n1-c2', routeType: 'steril', accessible: true, label: 'Koridor Steril' },
              { id: 'e1-9', from: 'n1-c2', to: 'n1-lift-steril', routeType: 'bersama', accessible: true },
              { id: 'e1-10', from: 'n1-c2', to: 'n1-stairs', routeType: 'umum', accessible: false },
              { id: 'e1-11', from: 'n1-c2', to: 'n1-skybridge', routeType: 'bersama', accessible: true }
            ]
          },
          {
            id: 1002,
            building_asset_id: 101,
            nama_lantai: 'Lantai 2 — CSSD, Kamar Operasi (OK) & ICU',
            kode_lantai: 'BGN-001-L2',
            level_order: 2,
            status: 'published',
            pixelsPerMeter: 20,
            width: 1000,
            height: 620,
            image_url: null,
            image_opacity: 0.35,
            rooms: [
              { id: 2101, masterRoomId: 2101, kode: 'RNG-101', nama: 'Instalasi CSSD (Pusat Sterilisasi)', is_medis: true, x: 40, y: 40, w: 300, h: 220, doors: [{ id: 'd-2101-1', x: 200, y: 260 }] },
              { id: 2102, masterRoomId: 2102, kode: 'RNG-102', nama: 'Kamar Operasi 1 (OK-1)', is_medis: true, x: 400, y: 40, w: 240, h: 200, doors: [{ id: 'd-2102-1', x: 520, y: 240 }] },
              { id: 2103, masterRoomId: 2103, kode: 'RNG-103', nama: 'Kamar Operasi 2 (OK-2)', is_medis: true, x: 680, y: 40, w: 260, h: 200, doors: [{ id: 'd-2103-1', x: 780, y: 240 }] },
              { id: 2104, masterRoomId: 2104, kode: 'RNG-104', nama: 'Intensive Care Unit (ICU)', is_medis: true, x: 40, y: 350, w: 440, h: 230, doors: [{ id: 'd-2104-1', x: 260, y: 350 }] }
            ],
            racks: [
              {
                id: 3101,
                masterStorageId: 3101,
                uuid: 'rack-cssd-01',
                kode: 'STG-CSSD-01',
                nama: 'Lemari Instrumen Steril CSSD-01',
                rackType: 'lemari',
                is_medis: true,
                ruangan_id: 2101,
                x: 70,
                y: 80,
                w: 110,
                h: 46,
                rotation: 0,
                rows: 3,
                cols: 4,
                slots: [
                  { row: 1, col: 1, assetId: 5004, kodeBarang: 'ALK-SET-BDH', namaBarang: 'Set Instrumen Bedah Mayor Steril', satuan: 'Set', qty: 6, batchNo: 'STR-261118-01', expiredAt: '2026-12-18', isSteril: true },
                  { row: 1, col: 2, assetId: 5005, kodeBarang: 'ALK-LAPAR', namaBarang: 'Set Laparoskopi Steril', satuan: 'Set', qty: 3, batchNo: 'STR-261118-02', expiredAt: '2026-12-15', isSteril: true }
                ]
              },
              {
                id: 3102,
                masterStorageId: 3102,
                uuid: 'rack-cssd-02',
                kode: 'STG-CSSD-02',
                nama: 'Lemari Kasa & Linen Steril CSSD-02',
                rackType: 'lemari',
                is_medis: true,
                ruangan_id: 2101,
                x: 205,
                y: 80,
                w: 105,
                h: 46,
                rotation: 0,
                rows: 3,
                cols: 3,
                slots: [
                  { row: 2, col: 2, assetId: 5001, kodeBarang: 'BHP-KASA-10', namaBarang: 'Kasa Steril 10x10 cm', satuan: 'Box', qty: 18, batchNo: 'STR-261117-KS', expiredAt: '2027-09-01', isSteril: true }
                ]
              }
            ],
            nav_nodes: [
              { id: 'n2-cssd-in', label: 'Titik Dalam CSSD', x: 200, y: 175, kind: 'room', routeType: 'steril', roomId: 2101 },
              { id: 'n2-cssd-door', label: 'Koridor Steril CSSD', x: 200, y: 295, kind: 'corridor', routeType: 'steril' },
              { id: 'n2-icu-door', label: 'Simpang ICU', x: 260, y: 295, kind: 'corridor', routeType: 'bersama' },
              { id: 'n2-icu-in', label: 'Titik Dalam ICU', x: 260, y: 420, kind: 'room', routeType: 'bersama', roomId: 2104 },
              { id: 'n2-ok1-door', label: 'Koridor Steril OK-1', x: 520, y: 295, kind: 'corridor', routeType: 'steril' },
              { id: 'n2-ok1-in', label: 'Titik Dalam OK-1', x: 520, y: 170, kind: 'room', routeType: 'steril', roomId: 2102 },
              { id: 'n2-ok2-door', label: 'Koridor Steril OK-2', x: 780, y: 295, kind: 'corridor', routeType: 'bersama' },
              { id: 'n2-ok2-in', label: 'Titik Dalam OK-2', x: 780, y: 170, kind: 'room', routeType: 'steril', roomId: 2103 },
              { id: 'n2-lift', label: 'Lift Medis & Steril Lt.2', x: 840, y: 360, kind: 'portal', portalType: 'elevator', portalGroup: 'LIFT-UTAMA', routeType: 'bersama', accessible: true },
              { id: 'n2-stairs', label: 'Tangga Umum Lt.2', x: 760, y: 440, kind: 'portal', portalType: 'stairs', portalGroup: 'TANGGA-UTARA', routeType: 'umum', accessible: false }
            ],
            edges: [
              { id: 'e2-1', from: 'n2-cssd-in', to: 'n2-cssd-door', routeType: 'steril', accessible: true },
              { id: 'e2-2', from: 'n2-cssd-door', to: 'n2-icu-door', routeType: 'bersama', accessible: true },
              { id: 'e2-3', from: 'n2-icu-door', to: 'n2-icu-in', routeType: 'bersama', accessible: true },
              { id: 'e2-4', from: 'n2-icu-door', to: 'n2-ok1-door', routeType: 'bersama', accessible: true },
              { id: 'e2-5', from: 'n2-ok1-door', to: 'n2-ok1-in', routeType: 'steril', accessible: true },
              { id: 'e2-6', from: 'n2-ok1-door', to: 'n2-ok2-door', routeType: 'bersama', accessible: true },
              { id: 'e2-7', from: 'n2-ok2-door', to: 'n2-ok2-in', routeType: 'steril', accessible: true },
              { id: 'e2-8', from: 'n2-ok2-door', to: 'n2-lift', routeType: 'bersama', accessible: true },
              { id: 'e2-9', from: 'n2-ok2-door', to: 'n2-stairs', routeType: 'umum', accessible: false }
            ]
          }
        ]
      },
      {
        id: 102,
        parent_asset_id: 1,
        kode: 'BGN-002',
        nama: 'Gedung B — Logistik & Gudang Sentral',
        tipe: 'infra',
        kategori: 'bangunan',
        masterRooms: [
          { id: 2201, kode: 'RNG-201', nama: 'Gudang BHP & Alkes', is_medis: true },
          { id: 2202, kode: 'RNG-202', nama: 'Gudang Umum & Penerimaan', is_medis: false }
        ],
        floors: [
          {
            id: 1003,
            building_asset_id: 102,
            nama_lantai: 'Lantai 1 — Gudang Sentral',
            kode_lantai: 'BGN-002-L1',
            level_order: 1,
            status: 'published',
            pixelsPerMeter: 20,
            width: 1000,
            height: 620,
            image_url: null,
            image_opacity: 0.35,
            rooms: [
              { id: 2201, masterRoomId: 2201, kode: 'RNG-201', nama: 'Gudang BHP & Alkes', is_medis: true, x: 160, y: 40, w: 520, h: 240, doors: [{ id: 'd-2201-1', x: 340, y: 280 }] },
              { id: 2202, masterRoomId: 2202, kode: 'RNG-202', nama: 'Gudang Umum & Penerimaan', is_medis: false, x: 160, y: 360, w: 520, h: 210, doors: [{ id: 'd-2202-1', x: 340, y: 360 }] }
            ],
            racks: [
              {
                id: 3201,
                masterStorageId: 3201,
                uuid: 'rack-gdg-p1',
                kode: 'STG-GDG-01',
                nama: 'Pallet Gudang G-01 (Cairan & BHP)',
                rackType: 'pallet',
                is_medis: true,
                ruangan_id: 2201,
                x: 200,
                y: 80,
                w: 150,
                h: 52,
                rotation: 0,
                rows: 3,
                cols: 5,
                slots: [
                  { row: 1, col: 1, assetId: 5003, kodeBarang: 'BHP-INF-RL', namaBarang: 'Cairan Infus Ringer Laktat 500ml', satuan: 'Kolf', qty: 600, batchNo: 'BTH-2611-RL-P', expiredAt: '2028-02-01', isSteril: false },
                  { row: 1, col: 3, assetId: 5001, kodeBarang: 'BHP-KASA-10', namaBarang: 'Kasa Steril 10x10 cm', satuan: 'Box', qty: 250, batchNo: 'BTH-2611-KS-P', expiredAt: '2028-05-01', isSteril: true }
                ]
              },
              {
                id: 3202,
                masterStorageId: 3202,
                uuid: 'rack-gdg-r2',
                kode: 'STG-GDG-02',
                nama: 'Rak Gudang G-02 (Alat Suntik)',
                rackType: 'rak',
                is_medis: true,
                ruangan_id: 2201,
                x: 420,
                y: 80,
                w: 150,
                h: 52,
                rotation: 0,
                rows: 4,
                cols: 4,
                slots: [
                  { row: 2, col: 1, assetId: 5002, kodeBarang: 'BHP-SPUIT-5', namaBarang: 'Spuit Disposable 5 ml', satuan: 'Box', qty: 340, batchNo: 'BTH-2611-SP-G', expiredAt: '2028-04-20', isSteril: true }
                ]
              }
            ],
            nav_nodes: [
              { id: 'n3-skybridge', label: 'Selasar dari Gedung A', x: 80, y: 315, kind: 'portal', portalType: 'bridge', portalGroup: 'SKYBRIDGE-GUDANG', routeType: 'bersama', accessible: true },
              { id: 'n3-c1', label: 'Lorong Utama Gudang', x: 340, y: 315, kind: 'corridor', routeType: 'bersama' },
              { id: 'n3-bhp-in', label: 'Titik Dalam Gudang BHP', x: 340, y: 170, kind: 'room', routeType: 'bersama', roomId: 2201 },
              { id: 'n3-dock-in', label: 'Titik Gudang Umum', x: 340, y: 430, kind: 'room', routeType: 'umum', roomId: 2202 }
            ],
            edges: [
              { id: 'e3-1', from: 'n3-skybridge', to: 'n3-c1', routeType: 'bersama', accessible: true },
              { id: 'e3-2', from: 'n3-c1', to: 'n3-bhp-in', routeType: 'bersama', accessible: true },
              { id: 'e3-3', from: 'n3-c1', to: 'n3-dock-in', routeType: 'umum', accessible: true }
            ]
          }
        ]
      }
    ],
    porterTasks: [
      {
        id: 'ORD-STR-2611-01',
        kode: 'DST-STR-001',
        judul: 'Pengantaran Set Bedah Mayor Steril ke OK-2',
        routeMode: 'steril',
        urgensi: 'cito',
        status: 'Siap Diantar',
        asal: { buildingId: 101, floorId: 1002, roomId: 2101, rackId: 3101, label: 'Instalasi CSSD (Lt.2) • STG-CSSD-01' },
        tujuan: { buildingId: 101, floorId: 1002, roomId: 2103, label: 'Kamar Operasi 2 (OK-2) • Lt.2' },
        items: [{ nama: 'Set Instrumen Bedah Mayor Steril', qty: 2, satuan: 'Set', slot: 'Baris 1, Kolom 1' }]
      },
      {
        id: 'ORD-STR-2611-02',
        kode: 'DST-STR-002',
        judul: 'Distribusi Set Laparoskopi Steril dari CSSD ke IGD',
        routeMode: 'steril',
        urgensi: 'tinggi',
        status: 'Siap Diantar',
        asal: { buildingId: 101, floorId: 1002, roomId: 2101, rackId: 3101, label: 'Instalasi CSSD (Lt.2) • STG-CSSD-01' },
        tujuan: { buildingId: 101, floorId: 1001, roomId: 2002, label: 'Instalasi Gawat Darurat (IGD) • Lt.1' },
        items: [
          { nama: 'Set Laparoskopi Steril', qty: 1, satuan: 'Set', slot: 'Baris 1, Kolom 2' },
          { nama: 'Kasa Steril 10x10 cm', qty: 4, satuan: 'Box', slot: 'STG-CSSD-02 (B2, K2)' }
        ]
      },
      {
        id: 'ORD-GDG-2611-03',
        kode: 'DST-UMM-003',
        judul: 'Distribusi Cairan Infus RL dari Gudang Sentral ke IGD',
        routeMode: 'umum',
        urgensi: 'normal',
        status: 'Siap Diantar',
        asal: { buildingId: 102, floorId: 1003, roomId: 2201, rackId: 3201, label: 'Gudang BHP (Gd.B) • STG-GDG-01' },
        tujuan: { buildingId: 101, floorId: 1001, roomId: 2002, label: 'Instalasi Gawat Darurat (IGD) • Lt.1' },
        items: [{ nama: 'Cairan Infus Ringer Laktat 500ml', qty: 20, satuan: 'Kolf', slot: 'Baris 1, Kolom 1' }]
      }
    ]
  }
}
