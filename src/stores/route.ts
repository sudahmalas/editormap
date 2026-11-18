import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { calculateRoute, nearestNode, type RouteResult } from '@/core/routing'
import { findFloor } from '@/core/document'
import { useEditorStore } from '@/stores/editor'
import type { Vec2 } from '@/types/map'

export interface RouteEndpointInfo {
  id: string
  label: string
  position: Vec2
  kind: 'node' | 'pin'
}

export const useRouteStore = defineStore('route', () => {
  const editor = useEditorStore()
  const startNodeId = ref<string | null>(null)
  const goalNodeId = ref<string | null>(null)
  const startFloorId = ref<string | null>(null)
  const goalFloorId = ref<string | null>(null)
  const result = ref<RouteResult | null>(null)
  const active = ref(false)

  function resolve(floorId: string | null, id: string | null): RouteEndpointInfo | null {
    if (!floorId || !id) return null
    const floor = findFloor(editor.doc, floorId)
    if (!floor) return null
    const node = floor.nodes.find((n) => n.id === id)
    if (node) {
      return { id: node.id, label: node.label || node.type, position: node.position, kind: 'node' }
    }
    const pin = floor.pins.find((p) => p.id === id)
    if (pin) {
      return { id: pin.id, label: pin.label, position: pin.position, kind: 'pin' }
    }
    return null
  }

  const startPoint = computed<RouteEndpointInfo | null>(() =>
    resolve(startFloorId.value, startNodeId.value),
  )
  const goalPoint = computed<RouteEndpointInfo | null>(() =>
    resolve(goalFloorId.value, goalNodeId.value),
  )

  /** node jalur murni (bukan pin) pada titik awal */
  const startNode = computed(() =>
    startPoint.value?.kind === 'node' ? startPoint.value : null,
  )
  const goalNode = computed(() => (goalPoint.value?.kind === 'node' ? goalPoint.value : null))

  function setStart(floorId: string, nodeId: string): void {
    startFloorId.value = floorId
    startNodeId.value = nodeId
    result.value = null
  }

  function setGoal(floorId: string, nodeId: string): void {
    goalFloorId.value = floorId
    goalNodeId.value = nodeId
    result.value = null
  }

  function setStartByPoint(floorId: string, point: Vec2): boolean {
    const floor = findFloor(editor.doc, floorId)
    if (!floor) return false
    const node = nearestNode(floor.nodes, point.x, point.y)
    if (!node) return false
    setStart(floorId, node.id)
    return true
  }

  function setGoalByPoint(floorId: string, point: Vec2): boolean {
    const floor = findFloor(editor.doc, floorId)
    if (!floor) return false
    const node = nearestNode(floor.nodes, point.x, point.y)
    if (!node) return false
    setGoal(floorId, node.id)
    return true
  }

  /** pin ruangan punya id di graf juga, sehingga bisa dijadikan awal/tujuan */
  function setStartByPin(floorId: string, pinId: string): void {
    startFloorId.value = floorId
    startNodeId.value = pinId
    result.value = null
  }

  function setGoalByPin(floorId: string, pinId: string): void {
    goalFloorId.value = floorId
    goalNodeId.value = pinId
    result.value = null
  }

  /** pilih awal/tujuan dari entitas yang sedang terpilih di kanvas */
  function setStartFromSelection(): boolean {
    const selection = editor.selection
    if (!selection || (selection.kind !== 'node' && selection.kind !== 'pin')) return false
    setStart(editor.activeFloorId, selection.id)
    return true
  }

  function setGoalFromSelection(): boolean {
    const selection = editor.selection
    if (!selection || (selection.kind !== 'node' && selection.kind !== 'pin')) return false
    setGoal(editor.activeFloorId, selection.id)
    return true
  }

  function swap(): void {
    const prevStartFloor = startFloorId.value
    const prevStartNode = startNodeId.value
    startFloorId.value = goalFloorId.value
    startNodeId.value = goalNodeId.value
    goalFloorId.value = prevStartFloor
    goalNodeId.value = prevStartNode
    result.value = null
  }

  function calculate(): RouteResult {
    if (!startFloorId.value || !startNodeId.value || !goalFloorId.value || !goalNodeId.value) {
      const empty: RouteResult = {
        found: false,
        distance: 0,
        steps: [],
        segments: {},
        message: 'Tentukan titik awal dan titik tujuan terlebih dahulu.',
      }
      result.value = empty
      return empty
    }
    const res = calculateRoute(
      editor.doc,
      { floorId: startFloorId.value, nodeId: startNodeId.value },
      { floorId: goalFloorId.value, nodeId: goalNodeId.value },
    )
    result.value = res
    return res
  }

  function toggle(): void {
    active.value = !active.value
    if (!active.value) clear()
  }

  function clear(): void {
    startNodeId.value = null
    goalNodeId.value = null
    startFloorId.value = null
    goalFloorId.value = null
    result.value = null
  }

  return {
    active,
    startNodeId,
    goalNodeId,
    startFloorId,
    goalFloorId,
    startPoint,
    goalPoint,
    startNode,
    goalNode,
    result,
    setStart,
    setGoal,
    setStartByPoint,
    setGoalByPoint,
    setStartByPin,
    setGoalByPin,
    setStartFromSelection,
    setGoalFromSelection,
    swap,
    calculate,
    toggle,
    clear,
  }
})
