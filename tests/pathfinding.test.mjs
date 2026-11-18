import assert from 'node:assert/strict'
import test from 'node:test'
import { createInitialCampusData } from '../src/data/hospitalDemoData.js'
import {
  computeMultiFloorRoute,
  findNearestItemLocations,
  findNearestRoomLocations,
  validateCampusGraph
} from '../src/engine/pathfinding.js'
import { exportToWorklistPayload, importFromWorklistPayload } from '../src/adapters/worklistSchema.js'
import { getWorklistRoomOptions, getWorklistStorageOptions } from '../src/services/worklistMasterService.js'

test('demo campus graph passes audit validation without errors', () => {
  const campus = createInitialCampusData()
  const issues = validateCampusGraph(campus)
  const errors = issues.filter((i) => i.severity === 'error')
  assert.equal(errors.length, 0)
})

test('Rute Steril uses Lift Medis/Steril and avoids Rute Umum utility corridor', () => {
  const campus = createInitialCampusData()
  const route = computeMultiFloorRoute(
    campus,
    { floorId: 1002, roomId: 2101, x: 200, y: 175 }, // CSSD Lt.2
    { floorId: 1001, roomId: 2002, x: 200, y: 390 }, // IGD Lt.1
    'steril'
  )

  assert.equal(route.found, true)
  assert.equal(route.routeMode, 'steril')
  const ids = route.path.map((n) => n.id)
  assert.ok(ids.includes('n2-lift'), 'Steril route should use Lift Lt.2')
  assert.ok(ids.includes('n1-lift-steril'), 'Steril route should arrive at Lift Lt.1')
  assert.ok(!ids.includes('n1-stairs'), 'Steril route must avoid stairs')
  assert.ok(!ids.includes('n1-util-door'), 'Steril route must avoid Rute Umum utility corridor')
})

test('Rute Umum can reach non-medical utility room and crosses skybridge from Gudang Sentral', () => {
  const campus = createInitialCampusData()
  const routeToUtil = computeMultiFloorRoute(
    campus,
    { floorId: 1001, roomId: 2001, x: 160, y: 280 }, // Lobby Lt.1
    { floorId: 1001, roomId: 2004, x: 520, y: 400 }, // Ruang Utilitas (Non-Medis, Rute Umum)
    'umum'
  )
  assert.equal(routeToUtil.found, true)
  assert.equal(routeToUtil.routeMode, 'umum')

  // Sebaliknya, Rute Steril menolak masuk ke Ruang Utilitas yang jalurnya khusus Rute Umum
  const sterileToUtil = computeMultiFloorRoute(
    campus,
    { floorId: 1001, roomId: 2001, x: 160, y: 280 },
    { floorId: 1001, roomId: 2004, x: 520, y: 400 },
    'steril'
  )
  assert.equal(sterileToUtil.found, false)

  // Rute lintas gedung dari Gudang Sentral ke IGD
  const crossBuilding = computeMultiFloorRoute(
    campus,
    { floorId: 1003, roomId: 2201, x: 340, y: 170 },
    { floorId: 1001, roomId: 2002, x: 200, y: 390 },
    'umum'
  )
  assert.equal(crossBuilding.found, true)
  const ids = crossBuilding.path.map((n) => n.id)
  assert.ok(ids.includes('n3-skybridge'))
  assert.ok(ids.includes('n1-skybridge'))
})

test('nearest item search ranks closer IGD/Farmasi stock before distant Gudang Sentral stock', () => {
  const campus = createInitialCampusData()
  const results = findNearestItemLocations(
    campus,
    'Kasa Steril',
    { floorId: 1001, nodeId: 'n1-lobby', x: 160, y: 280 },
    'umum'
  )

  assert.ok(results.length >= 3)
  assert.equal(results[0].floorId, 1001)
  assert.ok(results[0].route.costScore <= results[results.length - 1].route.costScore)
})

test('worklist export/import roundtrip preserves is_medis rooms, racks, and route_type', () => {
  const campus = createInitialCampusData()
  const exported = exportToWorklistPayload(campus)
  assert.equal(exported.denah_maps.length, 3)
  assert.equal(exported.stock_containers.length, 7)
  assert.equal(typeof exported.denah_maps[0].path_graph.rooms[0].is_medis, 'boolean')
  assert.ok(['umum', 'steril', 'bersama'].includes(exported.denah_maps[0].path_graph.edges[0].route_type))

  const reimported = importFromWorklistPayload(exported)
  assert.equal(reimported.buildings.length, 2)
  const totalRacks = reimported.buildings.flatMap((b) => b.floors).flatMap((f) => f.racks).length
  assert.equal(totalRacks, 7)
})

test('unbound room and storage elements are flagged by mapAudit and lookup options prioritize matching room', () => {
  const campus = createInitialCampusData()
  const floor1 = campus.buildings[0].floors[0]

  floor1.rooms.push({
    id: 9991,
    masterRoomId: null,
    kode: 'AREA-RUANG',
    nama: 'Area Ruangan (Pilih di Properti)',
    is_medis: false,
    x: 40,
    y: 260,
    w: 120,
    h: 80,
    doors: []
  })
  floor1.racks.push({
    id: 9992,
    masterStorageId: null,
    kode: 'AREA-RAK',
    nama: 'Area Penyimpanan (Pilih di Properti)',
    rackType: 'rak',
    ruangan_id: null,
    x: 50,
    y: 270,
    w: 80,
    h: 40,
    slots: []
  })

  const issues = validateCampusGraph(campus)
  assert.ok(issues.some((i) => i.severity === 'error' && i.message.includes('belum di-link ke Master Ruangan')))
  assert.ok(issues.some((i) => i.severity === 'error' && i.message.includes('belum di-link ke Master Penyimpanan')))

  const roomOpts = getWorklistRoomOptions(campus.buildings[0])
  assert.ok(roomOpts.some((o) => o.kode === 'RNG-006' && o.is_medis === true))

  const storageOpts = getWorklistStorageOptions(campus, 2003) // Depo Farmasi
  assert.equal(storageOpts[0].group, 'Penyimpanan di Ruangan Ini')
})

test('room search finds rooms without stock and snaps to node inside room bounds', () => {
  const campus = createInitialCampusData()
  const floor1 = campus.buildings[0].floors[0]

  floor1.rooms.push({
    id: 9993,
    masterRoomId: 101,
    kode: 'RNG-101',
    nama: 'Instalasi CSSD Baru',
    is_medis: true,
    x: 780,
    y: 440,
    w: 160,
    h: 120,
    doors: []
  })
  // Titik koridor ditempatkan di dalam kotak ruangan tanpa properti roomId eksplisit
  floor1.nav_nodes.push({
    id: 'n1-cssd-new',
    x: 840,
    y: 500,
    kind: 'corridor',
    routeType: 'bersama',
    label: 'Titik CSSD Baru',
    accessible: true
  })
  floor1.edges.push({
    id: 'e1-cssd-new',
    from: 'n1-c2',
    to: 'n1-cssd-new',
    routeType: 'bersama',
    accessible: true
  })

  // Simulasikan node lama yg tertinggal di luar ruangan namun masih memiliki roomId yang sama
  floor1.nav_nodes.push({
    id: 'n1-cssd-orphaned',
    x: 500,
    y: -40,
    kind: 'room',
    roomId: 101,
    routeType: 'bersama',
    label: 'Titik Instalasi CSSD Baru (Lama)',
    accessible: true
  })
  floor1.edges.push({
    id: 'e1-cssd-orphaned',
    from: 'n1-igd-door',
    to: 'n1-cssd-orphaned',
    routeType: 'bersama',
    accessible: true
  })

  const roomMatches = findNearestRoomLocations(
    campus,
    'CSSD Baru',
    { floorId: 1001, nodeId: 'n1-lobby', x: 160, y: 280 },
    'umum'
  )

  assert.equal(roomMatches.length, 1)
  assert.equal(roomMatches[0].roomName, 'Instalasi CSSD Baru')
  assert.equal(roomMatches[0].route.found, true)
  assert.equal(roomMatches[0].route.path[roomMatches[0].route.path.length - 1].id, 'n1-cssd-new')
})
