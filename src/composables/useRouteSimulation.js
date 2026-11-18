import { computed, ref } from 'vue'
import { computeMultiFloorRoute, findNearestItemLocations, findNearestRoomLocations } from '../engine/pathfinding'

export function useRouteSimulation(campus, activeFloorId, selectFloor) {
  const routingProfile = ref('umum') // 'umum' | 'steril' | 'shortest'
  const userAnchor = ref({
    floorId: 1001,
    nodeId: 'n1-lobby',
    x: 160,
    y: 280,
    label: 'Titik Lobby / Porter (Lt.1)'
  })
  const itemSearchQuery = ref('Kasa Steril')
  const searchScope = ref('all') // 'all' | 'items' | 'rooms'
  const itemSterileOnly = ref(false)
  const selectedFinderResult = ref(null)
  const selectedRoomResult = ref(null)
  const activePorterTaskId = ref(campus.porterTasks?.[0]?.id || null)
  const activeRoute = ref(null)
  const highlightedSlot = ref(null)

  const simProgress = ref(0)
  const isSimulating = ref(false)
  let simTimer = null

  const finderResults = computed(() => {
    const all = findNearestItemLocations(
      campus,
      itemSearchQuery.value,
      userAnchor.value,
      routingProfile.value
    )
    if (!itemSterileOnly.value) return all
    return all.filter((r) => r.slot?.isSteril)
  })

  const finderRoomResults = computed(() =>
    findNearestRoomLocations(
      campus,
      itemSearchQuery.value,
      userAnchor.value,
      routingProfile.value
    )
  )

  function stopSimulation() {
    isSimulating.value = false
    if (simTimer) {
      clearInterval(simTimer)
      simTimer = null
    }
  }

  function startSimulation() {
    if (!activeRoute.value?.found || !activeRoute.value.path?.length) return
    stopSimulation()
    simProgress.value = 0
    isSimulating.value = true
    const totalNodes = activeRoute.value.path.length
    simTimer = setInterval(() => {
      simProgress.value = Math.min(1, simProgress.value + 0.025)
      const idx = Math.min(totalNodes - 1, Math.floor(simProgress.value * (totalNodes - 1)))
      const curNode = activeRoute.value.path[idx]
      if (curNode && curNode.floorId !== activeFloorId.value) {
        selectFloor(curNode.floorId)
      }
      if (simProgress.value >= 1) {
        stopSimulation()
      }
    }, 90)
  }

  function routeToFinderItem(resultItem) {
    selectedRoomResult.value = null
    selectedFinderResult.value = resultItem
    activeRoute.value = resultItem.route
    highlightedSlot.value = {
      rackId: resultItem.rackId,
      row: resultItem.slot.row,
      col: resultItem.slot.col
    }
    stopSimulation()
    if (resultItem.floorId) selectFloor(resultItem.floorId)
  }

  function routeToRoom(roomResult) {
    selectedFinderResult.value = null
    selectedRoomResult.value = roomResult
    activeRoute.value = roomResult.route
    highlightedSlot.value = null
    stopSimulation()
    if (roomResult.floorId) selectFloor(roomResult.floorId)
  }

  function runPorterTaskRoute(task) {
    if (!task) return
    activePorterTaskId.value = task.id
    const startAnchor = { floorId: task.asal.floorId, roomId: task.asal.roomId, x: 160, y: 160 }
    const endAnchor = { floorId: task.tujuan.floorId, roomId: task.tujuan.roomId, x: 780, y: 170 }

    for (const b of campus.buildings) {
      for (const f of b.floors) {
        const rStart = f.rooms.find((r) => (r.masterRoomId || r.id) === task.asal.roomId)
        if (rStart && f.id === task.asal.floorId) {
          startAnchor.x = rStart.x + rStart.w / 2
          startAnchor.y = rStart.y + rStart.h / 2
        }
        const rEnd = f.rooms.find((r) => (r.masterRoomId || r.id) === task.tujuan.roomId)
        if (rEnd && f.id === task.tujuan.floorId) {
          endAnchor.x = rEnd.x + rEnd.w / 2
          endAnchor.y = rEnd.y + rEnd.h / 2
        }
      }
    }

    activeRoute.value = computeMultiFloorRoute(campus, startAnchor, endAnchor, routingProfile.value)
    highlightedSlot.value = task.asal.rackId ? { rackId: task.asal.rackId, row: 1, col: 1 } : null
    stopSimulation()
    selectFloor(task.asal.floorId)
  }

  function advancePorterTaskStatus(taskId, nextStatus) {
    const task = campus.porterTasks?.find((t) => t.id === taskId)
    if (task) task.status = nextStatus
  }

  function resetRouteState() {
    stopSimulation()
    activeRoute.value = null
    highlightedSlot.value = null
    selectedFinderResult.value = null
    selectedRoomResult.value = null
  }

  return {
    routingProfile,
    userAnchor,
    itemSearchQuery,
    searchScope,
    itemSterileOnly,
    finderResults,
    finderRoomResults,
    selectedFinderResult,
    selectedRoomResult,
    activePorterTaskId,
    activeRoute,
    highlightedSlot,
    simProgress,
    isSimulating,
    startSimulation,
    stopSimulation,
    routeToFinderItem,
    routeToRoom,
    runPorterTaskRoute,
    advancePorterTaskStatus,
    resetRouteState
  }
}
