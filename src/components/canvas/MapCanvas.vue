<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Konva from 'konva'
import { useEditorStore } from '@/stores/editor'
import { useRouteStore } from '@/stores/route'
import type { Vec2 } from '@/types/map'
import { nearestNode } from '@/core/routing'
import { snapPoint } from '@/core/geometry'
import {
  createAreaFrame,
  createDoorShape,
  createEdgeShape,
  createGridShape,
  createNodeShape,
  createPinShape,
  createRoomGroup,
  createVertexHandle,
  createWallShape,
  drawDraftPolyline,
  drawRouteMarker,
  drawRouteSegments,
} from '@/canvas/renderer'

const editor = useEditorStore()
const route = useRouteStore()

const hostRef = ref<HTMLDivElement | null>(null)
let stage: Konva.Stage | null = null
let gridGroup: Konva.Group | null = null
let bgGroup: Konva.Group | null = null
let areaLayer: Konva.Layer | null = null
let edgeLayer: Konva.Layer | null = null
let nodeLayer: Konva.Layer | null = null
let routeGroup: Konva.Group | null = null
let overlayGroup: Konva.Group | null = null
let observer: ResizeObserver | null = null

const cursorPos = ref<Vec2 | null>(null)
const chainNodeId = ref<string | null>(null)
const isPanning = ref(false)
const spaceHeld = ref(false)

const floor = computed(() => editor.activeFloor)
const zoomPercent = computed(() => Math.round(editor.zoom * 100))
/** Mode pencari rute: kanvas hanya untuk melihat dan memilih awal/tujuan. */
const readOnly = computed(() => editor.mode === 'route')

const viewport = () => ({
  x: stage?.x() ?? 0,
  y: stage?.y() ?? 0,
  scale: stage?.scaleX() ?? 1,
  width: stage?.width() ?? 0,
  height: stage?.height() ?? 0,
})

const entityPositions = computed<Map<string, Vec2>>(() => {
  const map = new Map<string, Vec2>()
  const f = floor.value
  if (!f) return map
  for (const node of f.nodes) map.set(node.id, node.position)
  for (const pin of f.pins) map.set(pin.id, pin.position)
  return map
})

function maybeSnap(p: Vec2): Vec2 {
  return editor.prefs.snapToGrid ? snapPoint(p, editor.prefs.gridSize) : p
}

function pointerWorld(): Vec2 | null {
  if (!stage) return null
  const pos = stage.getPointerPosition()
  if (!pos) return null
  return {
    x: (pos.x - stage.x()) / stage.scaleX(),
    y: (pos.y - stage.y()) / stage.scaleX(),
  }
}

// ---------------- Render ----------------
function refreshGrid() {
  if (!gridGroup) return
  gridGroup.destroyChildren()
  if (editor.prefs.showGrid) {
    gridGroup.add(createGridShape(viewport))
  }
  gridGroup.getLayer()?.batchDraw()
}

function renderBackground() {
  if (!bgGroup) return
  bgGroup.destroyChildren()
  const f = floor.value
  if (!f) {
    bgGroup.getLayer()?.batchDraw()
    return
  }
  bgGroup.add(createAreaFrame(f.size.width, f.size.height))
  if (editor.prefs.showBackground && f.background) {
    const img = new Image()
    img.src = f.background.src
    const imageNode = new Konva.Image({
      image: img,
      x: 0,
      y: 0,
      width: f.size.width,
      height: f.size.height,
      opacity: f.background.opacity,
      listening: false,
    })
    bgGroup.add(imageNode)
    img.onload = () => bgGroup?.getLayer()?.batchDraw()
  }
  bgGroup.getLayer()?.batchDraw()
}

function renderAreas() {
  if (!areaLayer) return
  areaLayer.destroyChildren()
  const f = floor.value
  if (!f) {
    areaLayer.batchDraw()
    return
  }
  for (const room of f.rooms) {
    areaLayer.add(
      createRoomGroup(
        room,
        {
          readOnly: readOnly.value,
          onSelect: (id) => {
            // mode pencari rute: klik ruangan memilih titik jalur terdekat
            if (readOnly.value) {
              const world = pointerWorld()
              if (world) pickRouteEndpointByPoint(world)
              return
            }
            editor.select({ kind: 'room', id })
          },
          onDragEnd: (id, dx, dy) => {
            editor.mutate(() => {
              const target = editor.activeFloor?.rooms.find((r) => r.id === id)
              if (!target) return
              target.polygon = target.polygon.map((p) => ({ x: p.x + dx, y: p.y + dy }))
            })
          },
        },
        f.pixelsPerMeter,
      ),
    )
  }
  for (const wall of f.walls) {
    areaLayer.add(
      createWallShape(wall, {
        readOnly: readOnly.value,
        onSelect: (id) => editor.select({ kind: 'wall', id }),
        onDragEnd: (id, dx, dy) => {
          editor.mutate(() => {
            const target = editor.activeFloor?.walls.find((w) => w.id === id)
            if (!target) return
            target.points = target.points.map((p) => ({ x: p.x + dx, y: p.y + dy }))
          })
        },
      }),
    )
  }
  for (const door of f.doors) {
    areaLayer.add(
      createDoorShape(door, {
        readOnly: readOnly.value,
        onSelect: (id) => editor.select({ kind: 'door', id }),
        onDragEnd: (id, dx, dy) => {
          editor.mutate(() => {
            const target = editor.activeFloor?.doors.find((d) => d.id === id)
            if (!target) return
            target.position = { x: target.position.x + dx, y: target.position.y + dy }
          })
        },
      }),
    )
  }
  areaLayer.batchDraw()
}

function renderEdges(override?: Map<string, Vec2>) {
  if (!edgeLayer) return
  edgeLayer.destroyChildren()
  const f = floor.value
  if (!f) {
    edgeLayer.batchDraw()
    return
  }
  const positions = new Map(entityPositions.value)
  if (override) for (const [k, v] of override) positions.set(k, v)
  for (const edge of f.edges) {
    const from = positions.get(edge.from)
    const to = positions.get(edge.to)
    if (!from || !to) continue
    const shape = createEdgeShape(edge.id, from, to, {
      onSelect: (id) => editor.select({ kind: 'edge', id }),
    })
    if (chainNodeId.value && (edge.from === chainNodeId.value || edge.to === chainNodeId.value)) {
      shape.getChildren()[1]?.setAttrs({ stroke: '#3db6bc' })
    }
    edgeLayer.add(shape)
  }
  edgeLayer.batchDraw()
}

function renderNodes() {
  if (!nodeLayer) return
  nodeLayer.destroyChildren()
  const f = floor.value
  if (!f) {
    nodeLayer.batchDraw()
    return
  }
  for (const node of f.nodes) {
    nodeLayer.add(
      createNodeShape(
        node,
        {
          readOnly: readOnly.value,
          onSelect: (id) => handleNodeClick(id),
          onDragMove: (id, x, y) => {
            renderEdges(new Map([[id, { x, y }]]))
          },
          onDragEnd: (id, x, y) => {
            editor.mutate(() => {
              const target = editor.activeFloor?.nodes.find((n) => n.id === id)
              if (target) target.position = { x, y }
            })
            renderEdges()
          },
        },
        editor.selection?.kind === 'node' && editor.selection.id === node.id,
      ),
    )
  }
  for (const pin of f.pins) {
    nodeLayer.add(
      createPinShape(
        pin,
        {
          readOnly: readOnly.value,
          onSelect: (id) => handlePinClick(id),
          onDragMove: (id, x, y) => {
            renderEdges(new Map([[id, { x, y }]]))
          },
          onDragEnd: (id, x, y) => {
            const f2 = editor.activeFloor
            const target = f2?.pins.find((p) => p.id === id)
            if (!f2 || !target) return
            const snapNode = nearestNode(
              f2.nodes.filter((n) => Math.hypot(n.position.x - x, n.position.y - y) < 60),
              x,
              y,
            )
            editor.mutate(() => {
              target.position = snapNode ? { ...snapNode.position } : { x, y }
            })
            if (snapNode && target.nodeId !== snapNode.id) {
              editor.updatePin(id, { nodeId: snapNode.id })
            }
            renderEdges()
          },
        },
        editor.selection?.kind === 'pin' && editor.selection.id === pin.id,
      ),
    )
  }
  nodeLayer.batchDraw()
}

function renderRoute() {
  if (!routeGroup) return
  routeGroup.destroyChildren()
  const f = floor.value
  if (!f) {
    routeGroup.getLayer()?.batchDraw()
    return
  }
  if (route.result) {
    const segments = route.result.segments[f.id]
    if (segments && segments.length > 1) {
      routeGroup.add(drawRouteSegments(segments))
    }
  }
  if (route.startPoint && route.startFloorId === f.id) {
    routeGroup.add(drawRouteMarker(route.startPoint.position, 'start'))
  }
  if (route.goalPoint && route.goalFloorId === f.id) {
    routeGroup.add(drawRouteMarker(route.goalPoint.position, 'goal'))
  }
  routeGroup.getLayer()?.batchDraw()
}

function renderOverlay() {
  if (!overlayGroup) return
  overlayGroup.destroyChildren()
  const f = floor.value
  if (!f) {
    overlayGroup.getLayer()?.batchDraw()
    return
  }

  // preview gambar
  const tool = readOnly.value ? 'select' : editor.tool
  if ((tool === 'wall' || tool === 'room') && editor.draft.points.length > 0) {
    overlayGroup.add(drawDraftPolyline(editor.draft.points, cursorPos.value, tool === 'room'))
  }

  // vertex handle untuk entitas terpilih (hanya di mode editor)
  const selection = readOnly.value ? null : editor.selection
  if (selection?.kind === 'room') {
    const room = f.rooms.find((r) => r.id === selection.id)
    if (room) {
      room.polygon.forEach((p, index) => {
        overlayGroup?.add(
          createVertexHandle(p.x, p.y, index, (idx, x, y, phase) => {
            if (phase === 'move') {
              editor.beginTransaction()
              const liveTarget = editor.activeFloor?.rooms.find((r) => r.id === room.id)
              if (liveTarget) liveTarget.polygon[idx] = { x, y }
              renderOverlay()
            } else {
              editor.mutate(() => {
                const target = editor.activeFloor?.rooms.find((r) => r.id === room.id)
                if (target) target.polygon[idx] = { x, y }
              })
              editor.endTransaction(false)
              renderAll()
            }
          }),
        )
      })
    }
  }
  if (selection?.kind === 'wall') {
    const wall = f.walls.find((w) => w.id === selection.id)
    if (wall) {
      wall.points.forEach((p, index) => {
        overlayGroup?.add(
          createVertexHandle(p.x, p.y, index, (idx, x, y, phase) => {
            if (phase === 'move') {
              editor.beginTransaction()
              const liveTarget = editor.activeFloor?.walls.find((w) => w.id === wall.id)
              if (liveTarget) liveTarget.points[idx] = { x, y }
              renderOverlay()
            } else {
              editor.mutate(() => {
                const target = editor.activeFloor?.walls.find((w) => w.id === wall.id)
                if (target) target.points[idx] = { x, y }
              })
              editor.endTransaction(false)
              renderAll()
            }
          }),
        )
      })
    }
  }

  // kursor ghost untuk node/pin
  if (cursorPos.value && (tool === 'node' || tool === 'pin' || tool === 'door')) {
    overlayGroup.add(
      new Konva.Circle({
        x: cursorPos.value.x,
        y: cursorPos.value.y,
        radius: 6,
        stroke: '#3db6bc',
        strokeWidth: 2,
        dash: [4, 4],
        listening: false,
      }),
    )
  }

  overlayGroup.getLayer()?.batchDraw()
}

function renderAll() {
  renderBackground()
  renderAreas()
  renderEdges()
  renderNodes()
  renderRoute()
  renderOverlay()
}

// ---------------- Interaksi ----------------
function handleNodeClick(nodeId: string) {
  if (route.active) {
    pickRouteEndpoint(editor.activeFloorId, nodeId)
    return
  }
  const tool = editor.tool
  if (tool !== 'node') {
    editor.select({ kind: 'node', id: nodeId })
    return
  }
  if (chainNodeId.value && chainNodeId.value !== nodeId) {
    editor.addEdge(chainNodeId.value, nodeId)
    chainNodeId.value = nodeId
  } else {
    chainNodeId.value = nodeId
  }
  editor.select({ kind: 'node', id: nodeId })
  renderEdges()
  renderNodes()
}

/** Mode uji rute: klik pertama jadi awal, klik kedua jadi tujuan, berikutnya mengulang dari awal. */
function pickRouteEndpoint(floorId: string, entityId: string) {
  if (!route.startNodeId) {
    route.setStart(floorId, entityId)
  } else if (!route.goalNodeId) {
    route.setGoal(floorId, entityId)
  } else {
    route.clear()
    route.setStart(floorId, entityId)
  }
  editor.select(null)
  renderRoute()
}

function handlePinClick(pinId: string) {
  if (route.active) {
    pickRouteEndpoint(editor.activeFloorId, pinId)
    return
  }
  editor.select({ kind: 'pin', id: pinId })
}

function finishDraft() {
  const points = editor.draft.points
  if (editor.tool === 'wall' && points.length >= 2) {
    editor.addWall(points)
  }
  if (editor.tool === 'room' && points.length >= 3) {
    editor.addRoom(points)
  }
  editor.draft.points = []
  renderAll()
}

function cancelDraft() {
  editor.draft.points = []
  chainNodeId.value = null
  renderAll()
}

/** Pilih awal/tujuan berdasarkan titik terdekat pada lantai aktif. */
function pickRouteEndpointByPoint(point: Vec2) {
  const f = floor.value
  if (!f || f.nodes.length === 0) return
  if (!route.startNodeId) route.setStartByPoint(editor.activeFloorId, point)
  else if (!route.goalNodeId) route.setGoalByPoint(editor.activeFloorId, point)
  else {
    route.clear()
    route.setStartByPoint(editor.activeFloorId, point)
  }
  renderRoute()
}

function onStageMouseDown(evt: Konva.KonvaEventObject<MouseEvent>) {
  const isEmpty = evt.target === stage
  if (evt.evt.button === 1 || spaceHeld.value || editor.tool === 'pan') {
    isPanning.value = true
    return
  }
  if (!isEmpty) return

  const world = pointerWorld()
  if (!world) return
  const point = maybeSnap(world)

  // mode pencari rute: klik area kosong memilih titik jalur terdekat (awal/tujuan)
  if (readOnly.value) {
    pickRouteEndpointByPoint(point)
    return
  }

  if (editor.tool === 'select') {
    editor.select(null)
    return
  }
  if (editor.tool === 'wall' || editor.tool === 'room') {
    const first = editor.draft.points[0]
    if (
      editor.tool === 'room' &&
      first &&
      editor.draft.points.length >= 3 &&
      Math.hypot(first.x - point.x, first.y - point.y) < 14 / (stage?.scaleX() ?? 1)
    ) {
      finishDraft()
      return
    }
    editor.draft.points.push(point)
    renderOverlay()
    return
  }
  if (editor.tool === 'door') {
    editor.addDoor(point.x, point.y)
    renderAll()
    return
  }
  if (editor.tool === 'node') {
    if (route.active) {
      pickRouteEndpointByPoint(point)
      return
    }
    const node = editor.addNode(point.x, point.y)
    if (node) {
      if (chainNodeId.value) {
        editor.addEdge(chainNodeId.value, node.id)
      }
      chainNodeId.value = node.id
    }
    renderAll()
    return
  }
  if (editor.tool === 'pin') {
    const f = floor.value
    if (!f) return
    const threshold = 50
    const candidate = nearestNode(
      f.nodes.filter((n) => Math.hypot(n.position.x - point.x, n.position.y - point.y) < threshold),
      point.x,
      point.y,
    )
    editor.addPin(point.x, point.y, candidate ? candidate.id : null)
    renderAll()
    return
  }
}

function onStageMouseMove() {
  if (!stage) return
  const world = pointerWorld()
  if (!world) return
  cursorPos.value = maybeSnap(world)
  editor.setPointer(Math.round(world.x), Math.round(world.y))
  if (editor.draft.points.length > 0 || editor.tool !== 'select') {
    renderOverlay()
  }
}

function onStageMouseUp() {
  isPanning.value = false
}

function onWheel(evt: Konva.KonvaEventObject<WheelEvent>) {
  evt.evt.preventDefault()
  if (!stage) return
  const oldScale = stage.scaleX()
  const pointer = stage.getPointerPosition()
  if (!pointer) return

  const direction = evt.evt.deltaY > 0 ? -1 : 1
  const factor = 1.08
  const newScale = direction > 0 ? oldScale * factor : oldScale / factor
  const clamped = Math.min(6, Math.max(0.12, newScale))

  const mousePointTo = {
    x: (pointer.x - stage.x()) / oldScale,
    y: (pointer.y - stage.y()) / oldScale,
  }

  stage.scale({ x: clamped, y: clamped })
  stage.position({
    x: pointer.x - mousePointTo.x * clamped,
    y: pointer.y - mousePointTo.y * clamped,
  })
  editor.zoom = clamped
  refreshGrid()
  stage.batchDraw()
}

function onDblClick() {
  if (editor.tool === 'wall' || editor.tool === 'room') {
    finishDraft()
  }
}

export interface MapCanvasApi {
  zoomIn: () => void
  zoomOut: () => void
  zoomToFit: () => void
  resetView: () => void
  finishDraft: () => void
  cancelDraft: () => void
}

function zoomBy(factor: number) {
  if (!stage) return
  const oldScale = stage.scaleX()
  const clamped = Math.min(6, Math.max(0.12, oldScale * factor))
  const center = { x: stage.width() / 2, y: stage.height() / 2 }
  const pointTo = {
    x: (center.x - stage.x()) / oldScale,
    y: (center.y - stage.y()) / oldScale,
  }
  stage.scale({ x: clamped, y: clamped })
  stage.position({
    x: center.x - pointTo.x * clamped,
    y: center.y - pointTo.y * clamped,
  })
  editor.zoom = clamped
  refreshGrid()
  stage.batchDraw()
}

function zoomToFit() {
  if (!stage) return
  const f = floor.value
  if (!f) return
  const padding = 60
  const scale = Math.min(
    (stage.width() - padding * 2) / f.size.width,
    (stage.height() - padding * 2) / f.size.height,
  )
  const clamped = Math.min(3, Math.max(0.12, scale))
  stage.scale({ x: clamped, y: clamped })
  stage.position({
    x: (stage.width() - f.size.width * clamped) / 2,
    y: (stage.height() - f.size.height * clamped) / 2,
  })
  editor.zoom = clamped
  refreshGrid()
  stage.batchDraw()
}

function resetView() {
  zoomToFit()
}

defineExpose<MapCanvasApi>({
  zoomIn: () => zoomBy(1.2),
  zoomOut: () => zoomBy(1 / 1.2),
  zoomToFit,
  resetView,
  finishDraft,
  cancelDraft,
})

// ---------------- Keyboard ----------------
function onKeyDown(evt: KeyboardEvent) {
  const target = evt.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (evt.code === 'Space') {
    spaceHeld.value = true
    evt.preventDefault()
    return
  }
  if (evt.key === 'Escape') {
    cancelDraft()
    return
  }
  // mode pencari rute tidak menerima perintah pengubahan data
  if (readOnly.value) {
    if (evt.code === 'Space') {
      spaceHeld.value = true
      evt.preventDefault()
    }
    return
  }
  if (evt.key === 'Enter') {
    finishDraft()
    return
  }
  if (evt.key === 'Delete' || evt.key === 'Backspace') {
    if (editor.selection) {
      evt.preventDefault()
      editor.removeSelection()
      renderAll()
    }
    return
  }
  if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'z') {
    evt.preventDefault()
    if (evt.shiftKey) editor.redo()
    else editor.undo()
    renderAll()
    return
  }
  if ((evt.ctrlKey || evt.metaKey) && evt.key.toLowerCase() === 'y') {
    evt.preventDefault()
    editor.redo()
    renderAll()
    return
  }
  if (evt.key === '1') editor.setTool('select')
  if (evt.key === '2') editor.setTool('node')
  if (evt.key === '3') editor.setTool('wall')
  if (evt.key === '4') editor.setTool('room')
  if (evt.key === '5') editor.setTool('pin')
  if (evt.key === '6') editor.setTool('door')
  if (evt.key === 'v' || evt.key === 'V') editor.setTool('select')
}

function onKeyUp(evt: KeyboardEvent) {
  if (evt.code === 'Space') spaceHeld.value = false
}

onMounted(() => {
  if (!hostRef.value) return
  const rect = hostRef.value.getBoundingClientRect()

  stage = new Konva.Stage({
    container: hostRef.value,
    width: rect.width,
    height: rect.height,
    draggable: false,
  })

  const baseLayer = new Konva.Layer({ listening: false })
  areaLayer = new Konva.Layer()
  edgeLayer = new Konva.Layer()
  nodeLayer = new Konva.Layer()
  const topLayer = new Konva.Layer()

  gridGroup = new Konva.Group({ listening: false })
  bgGroup = new Konva.Group({ listening: false })
  routeGroup = new Konva.Group({ listening: false })
  overlayGroup = new Konva.Group()

  baseLayer.add(gridGroup)
  baseLayer.add(bgGroup)
  topLayer.add(routeGroup)
  topLayer.add(overlayGroup)

  stage.add(baseLayer)
  stage.add(areaLayer)
  stage.add(edgeLayer)
  stage.add(nodeLayer)
  stage.add(topLayer)

  stage.on('mousedown touchstart', onStageMouseDown)
  stage.on('mousemove touchmove', onStageMouseMove)
  stage.on('mouseup touchend', onStageMouseUp)
  stage.on('wheel', onWheel)
  stage.on('dblclick dbltap', onDblClick)
  stage.on('dragmove', () => {
    // stage draggable dimatikan; pan memakai posisi manual
  })

  // pan: drag dengan tombol tengah / space
  let panStart: { x: number; y: number; stageX: number; stageY: number } | null = null
  stage.on('mousedown', (evt) => {
    const shouldPan = evt.evt.button === 1 || spaceHeld.value || editor.tool === 'pan'
    if (!shouldPan) return
    const pos = stage?.getPointerPosition()
    if (!pos || !stage) return
    panStart = { x: pos.x, y: pos.y, stageX: stage.x(), stageY: stage.y() }
    stage.container().style.cursor = 'grabbing'
  })
  window.addEventListener('mousemove', (evt) => {
    if (!panStart || !stage) return
    const rect = stage.container().getBoundingClientRect()
    const px = evt.clientX - rect.left
    const py = evt.clientY - rect.top
    stage.position({
      x: panStart.stageX + (px - panStart.x),
      y: panStart.stageY + (py - panStart.y),
    })
    refreshGrid()
    stage.batchDraw()
  })
  window.addEventListener('mouseup', () => {
    if (panStart) {
      panStart = null
      if (stage) stage.container().style.cursor = 'default'
    }
  })

  observer = new ResizeObserver(() => {
    if (!stage || !hostRef.value) return
    const box = hostRef.value.getBoundingClientRect()
    stage.width(box.width)
    stage.height(box.height)
    refreshGrid()
    stage.batchDraw()
  })
  observer.observe(hostRef.value)

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  renderAll()
  refreshGrid()
  requestAnimationFrame(() => zoomToFit())
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  observer?.disconnect()
  stage?.destroy()
  stage = null
})

watch(
  () => [editor.activeFloorId, editor.doc.buildings, editor.doc.links],
  () => {
    renderAll()
    requestAnimationFrame(() => zoomToFit())
  },
  { deep: true },
)

watch(
  () => [editor.selection, editor.tool, editor.prefs.showGrid, editor.prefs.showBackground, editor.mode],
  () => {
    refreshGrid()
    renderAll()
  },
  { deep: true },
)

watch(
  () => route.result,
  () => renderRoute(),
)

watch(
  () => [route.startNodeId, route.goalNodeId],
  () => renderRoute(),
)

const cursorClass = computed(() => {
  if (isPanning.value || spaceHeld.value || editor.tool === 'pan') return 'cursor-grab active:cursor-grabbing'
  if (readOnly.value) return 'cursor-pointer'
  if (['wall', 'room', 'node', 'pin', 'door'].includes(editor.tool)) return 'cursor-crosshair'
  return 'cursor-default'
})
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-slate-100">
    <div ref="hostRef" class="h-full w-full" :class="cursorClass" />

    <!-- kontrol zoom -->
    <div class="pointer-events-auto absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xs">
      <button class="px-2.5 py-1.5 text-slate-600 hover:bg-slate-50" title="Perbesar" @click="zoomBy(1.2)">
        +
      </button>
      <button class="border-t border-slate-200 px-2.5 py-1.5 text-slate-600 hover:bg-slate-50" title="Perkecil" @click="zoomBy(1 / 1.2)">
        −
      </button>
      <button class="border-t border-slate-200 px-2 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50" title="Sesuaikan layar" @click="zoomToFit">
        FIT
      </button>
    </div>

    <div class="pointer-events-none absolute bottom-3 left-3 rounded-sm border border-slate-200 bg-white/90 px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-2xs">
      {{ zoomPercent }}% · x {{ editor.pointer.x }} y {{ editor.pointer.y }}
    </div>

    <div
      v-if="readOnly"
      class="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-sm border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs"
    >
      Klik lokasi atau titik jalur untuk memilih awal (A) dan tujuan (B)
      <span class="ml-2 text-[#3db6bc]">
        {{ route.startPoint ? (route.goalPoint ? 'rute dihitung otomatis' : 'pilih tujuan') : 'pilih awal' }}
      </span>
    </div>

    <div
      v-if="!readOnly && (editor.tool === 'wall' || editor.tool === 'room')"
      class="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-sm border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs"
    >
      Klik untuk menambah titik · Enter / klik ganda untuk menyelesaikan · Esc batal
      <span class="ml-2 text-[#3db6bc]">{{ editor.draft.points.length }} titik</span>
    </div>

    <div
      v-if="!readOnly && editor.tool === 'node'"
      class="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-sm border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-2xs"
    >
      Klik area kosong untuk titik baru · klik titik lain untuk menyambung jalur · Esc selesai
    </div>
  </div>
</template>
