<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Eye,
  EyeOff,
  GitBranch,
  Image as ImageIcon,
  Maximize2,
  Play,
  Square as StopIcon,
  ZoomIn,
  ZoomOut
} from 'lucide-vue-next'
import CanvasGridLayer from './CanvasGridLayer.vue'
import CanvasRoomRackLayer from './CanvasRoomRackLayer.vue'
import CanvasRouteLayer from './CanvasRouteLayer.vue'

const props = defineProps({
  store: { type: Object, required: true },
  readOnly: { type: Boolean, default: false },
  spacePanning: { type: Boolean, default: false },
  viewportInset: { type: Object, default: () => ({ left: 0, right: 0 }) }
})

const containerRef = ref(null)
const stageRef = ref(null)
const stageSize = ref({ width: 900, height: 600 })
const zoom = ref(1)
const pan = ref({ x: 36, y: 28 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const draftRoom = ref(null)

const floor = computed(() => props.store.activeFloor.value)
const floorWidth = computed(() => floor.value?.width || 1000)
const floorHeight = computed(() => floor.value?.height || 620)
const isHandMode = computed(
  () => props.readOnly || props.spacePanning || props.store.activeTool.value === 'hand'
)
const canDrag = computed(
  () => !props.readOnly && !props.spacePanning && props.store.activeTool.value === 'select'
)

let resizeObserver = null

const fitToViewport = () => {
  if (!containerRef.value) return
  const cw = containerRef.value.clientWidth
  const ch = containerRef.value.clientHeight
  const leftPad = cw >= 960 ? (props.viewportInset?.left || 0) : 0
  const rightPad = cw >= 1280 ? (props.viewportInset?.right || 0) : 0
  const availW = Math.max(280, cw - leftPad - rightPad)
  const scale = Math.min((availW - 48) / floorWidth.value, (ch - 88) / floorHeight.value, 1.1)
  zoom.value = Math.max(0.42, Math.round(scale * 100) / 100)
  pan.value = {
    x: Math.round(leftPad + (availW - floorWidth.value * zoom.value) / 2),
    y: Math.max(16, Math.round((ch - floorHeight.value * zoom.value) / 2) - 12)
  }
}

onMounted(() => {
  if (!containerRef.value) return
  let firstFit = true
  const updateSize = () => {
    if (!containerRef.value) return
    stageSize.value = {
      width: Math.max(300, containerRef.value.clientWidth),
      height: Math.max(300, containerRef.value.clientHeight)
    }
    if (firstFit) {
      firstFit = false
      fitToViewport()
    }
  }
  updateSize()
  requestAnimationFrame(fitToViewport)
  resizeObserver = new ResizeObserver(updateSize)
  resizeObserver.observe(containerRef.value)
})

onUnmounted(() => {
  if (resizeObserver) resizeObserver.disconnect()
})

watch(() => props.store.activeFloorId.value, () => requestAnimationFrame(fitToViewport))

const getWorldPoint = () => {
  const stage = stageRef.value?.getNode?.()
  const ptr = stage?.getPointerPosition()
  if (!ptr) return { x: 0, y: 0 }
  return { x: (ptr.x - pan.value.x) / zoom.value, y: (ptr.y - pan.value.y) / zoom.value }
}

const handleWheel = (e) => {
  e.evt.preventDefault()
  const stage = stageRef.value?.getNode?.()
  const pointer = stage?.getPointerPosition()
  if (!pointer) return
  const oldScale = zoom.value
  const mousePointTo = { x: (pointer.x - pan.value.x) / oldScale, y: (pointer.y - pan.value.y) / oldScale }
  const newScale = Math.min(2.6, Math.max(0.4, oldScale * (e.evt.deltaY < 0 ? 1.1 : 0.9)))
  zoom.value = newScale
  pan.value = { x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale }
}

const onStageMouseDown = (e) => {
  const evt = e.evt
  if (evt.button === 1 || evt.shiftKey || isHandMode.value) {
    isPanning.value = true
    panStart.value = { x: evt.clientX - pan.value.x, y: evt.clientY - pan.value.y }
    return
  }

  const targetName = e.target?.name?.() || ''
  const isBackground = e.target === e.target?.getStage?.() || targetName === 'floor-bg'
  if (!isBackground || props.readOnly || !floor.value) return

  const pt = getWorldPoint()
  const tool = props.store.activeTool.value
  if (tool === 'select') props.store.selection.value = null
  else if (tool === 'room') {
    const sx = props.store.snap(pt.x)
    const sy = props.store.snap(pt.y)
    draftRoom.value = { startX: sx, startY: sy, curX: sx, curY: sy }
  } else if (tool === 'rack') props.store.createStorageElement(pt.x, pt.y)
  else if (tool === 'door') props.store.addDoorAt(pt.x, pt.y)
  else if (tool === 'node') props.store.addNavNodeAt(pt.x, pt.y, 'corridor')
  else if (tool === 'portal') props.store.addNavNodeAt(pt.x, pt.y, 'portal')
}

const onStageMouseMove = (e) => {
  if (isPanning.value) {
    pan.value = { x: e.evt.clientX - panStart.value.x, y: e.evt.clientY - panStart.value.y }
    return
  }
  if (draftRoom.value) {
    const pt = getWorldPoint()
    draftRoom.value.curX = props.store.snap(pt.x)
    draftRoom.value.curY = props.store.snap(pt.y)
  }
}

const onStageMouseUp = () => {
  isPanning.value = false
  if (draftRoom.value) {
    const ds = draftRoom.value
    const x = Math.min(ds.startX, ds.curX)
    const y = Math.min(ds.startY, ds.curY)
    const w = Math.abs(ds.curX - ds.startX)
    const h = Math.abs(ds.curY - ds.startY)
    if (w >= 60 && h >= 40) {
      props.store.createRoomElement({ x, y, w, h })
      props.store.activeTool.value = 'select'
    }
    draftRoom.value = null
  }
}

const onEntityMouseDown = (e, type, entity) => {
  if (isHandMode.value) return
  e.cancelBubble = true

  if (props.readOnly) {
    if (type === 'rack') props.store.rackModalTargetId.value = entity.id
    return
  }

  const tool = props.store.activeTool.value
  if (tool === 'edge' && type === 'node') {
    if (!props.store.edgeDraftFromNodeId.value) {
      props.store.edgeDraftFromNodeId.value = entity.id
      props.store.selection.value = { type: 'node', id: entity.id }
    } else {
      props.store.connectNodes(props.store.edgeDraftFromNodeId.value, entity.id)
      props.store.edgeDraftFromNodeId.value = null
    }
    return
  }

  if (type === 'room') {
    const pt = getWorldPoint()
    if (tool === 'rack') {
      props.store.createStorageElement(pt.x, pt.y)
      props.store.activeTool.value = 'select'
      return
    }
    if (tool === 'door') {
      props.store.addDoorAt(pt.x, pt.y)
      return
    }
    if (tool === 'node') {
      props.store.addNavNodeAt(pt.x, pt.y, 'corridor')
      return
    }
  }

  props.store.selection.value = { type, id: entity.id }
}

const onDragEndEntity = (e, type, entity) => {
  const node = e.target
  const oldX = entity.x
  const oldY = entity.y
  const nx = props.store.snap(node.x())
  const ny = props.store.snap(node.y())
  node.position({ x: nx, y: ny })
  entity.x = nx
  entity.y = ny

  if (type === 'room') {
    props.store.syncRoomMoved(entity, oldX, oldY)
  } else if (type === 'rack' && floor.value) {
    const room = props.store.findContainingRoom(floor.value, nx + entity.w / 2, ny + entity.h / 2)
    if (room) entity.ruangan_id = room.masterRoomId || room.id
  }
}

const onTransformEndEntity = (e, type, entity) => {
  const node = e.target
  const sx = node.scaleX()
  const sy = node.scaleY()
  node.scaleX(1)
  node.scaleY(1)
  const nx = props.store.snap(node.x())
  const ny = props.store.snap(node.y())
  node.position({ x: nx, y: ny })
  entity.x = nx
  entity.y = ny
  entity.w = Math.max(40, props.store.snap(entity.w * sx))
  entity.h = Math.max(28, props.store.snap(entity.h * sy))
  if (type === 'rack') entity.rotation = Math.round(node.rotation())
}

const draftRoomBox = computed(() => {
  if (!draftRoom.value) return null
  const ds = draftRoom.value
  return {
    x: Math.min(ds.startX, ds.curX),
    y: Math.min(ds.startY, ds.curY),
    w: Math.abs(ds.curX - ds.startX),
    h: Math.abs(ds.curY - ds.startY)
  }
})

const routeFloorsSummary = computed(() => {
  const route = props.store.activeRoute.value
  if (!route?.found || !route.path) return []
  const seen = []
  for (const n of route.path) {
    if (!seen.some((s) => s.floorId === n.floorId)) {
      seen.push({ floorId: n.floorId, label: n.floorName })
    }
  }
  return seen
})

const onCanvasDrop = (e) => {
  if (props.readOnly || !floor.value || !containerRef.value) return
  const kind = e.dataTransfer?.getData('application/x-editormap-element')
  if (!kind) return
  const rect = containerRef.value.getBoundingClientRect()
  const wx = (e.clientX - rect.left - pan.value.x) / zoom.value
  const wy = (e.clientY - rect.top - pan.value.y) / zoom.value

  if (kind === 'room') {
    props.store.createRoomElement({ x: wx - 100, y: wy - 70, w: 200, h: 140 })
  } else if (kind === 'rack') {
    props.store.createStorageElement(wx, wy)
  } else if (kind === 'door') {
    props.store.addDoorAt(wx, wy)
  } else if (kind === 'portal') {
    props.store.addNavNodeAt(wx, wy, 'portal')
  }
  props.store.activeTool.value = 'select'
}

const cursorClass = computed(() => {
  if (isPanning.value) return 'cursor-grabbing'
  if (isHandMode.value) return 'cursor-grab'
  if (!props.readOnly && props.store.activeTool.value !== 'select') return 'cursor-crosshair'
  return 'cursor-default'
})
</script>

<template>
  <div class="flex-1 relative bg-[#e5e8ee] overflow-hidden select-none flex flex-col">
    <!-- Multi-floor Route Pill Bar -->
    <div v-if="routeFloorsSummary.length > 0 && readOnly" class="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
      <div class="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-3 py-1.5 shadow-lg flex items-center gap-1.5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">Rute:</span>
        <button
          v-for="(rf, idx) in routeFloorsSummary"
          :key="rf.floorId"
          type="button"
          @click="store.selectFloor(rf.floorId)"
          class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer transition-colors"
          :class="rf.floorId === store.activeFloorId.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
        >
          {{ idx + 1 }}. {{ rf.label }}
        </button>
        <div class="w-px h-4 bg-slate-200 mx-0.5" />
        <button
          v-if="!store.isSimulating.value"
          type="button"
          @click="store.startSimulation()"
          class="px-2.5 py-0.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Play class="w-3 h-3" /> Simulasi
        </button>
        <button
          v-else
          type="button"
          @click="store.stopSimulation()"
          class="px-2.5 py-0.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
        >
          <StopIcon class="w-3 h-3" /> Stop
        </button>
      </div>
    </div>

    <!-- Konva Stage -->
    <div
      ref="containerRef"
      class="flex-1 w-full h-full overflow-hidden"
      :class="cursorClass"
      @dragover.prevent
      @drop.prevent="onCanvasDrop"
    >
      <v-stage
        ref="stageRef"
        :config="{ width: stageSize.width, height: stageSize.height, x: pan.x, y: pan.y, scaleX: zoom, scaleY: zoom }"
        @wheel="handleWheel"
        @mousedown="onStageMouseDown"
        @mousemove="onStageMouseMove"
        @mouseup="onStageMouseUp"
      >
        <CanvasGridLayer v-if="floor" :floor="floor" :show-blueprint="store.showBlueprint.value" />
        <CanvasRoomRackLayer
          v-if="floor"
          :floor="floor"
          :stage-ref="stageRef"
          :selection="store.selection.value"
          :highlighted-slot="store.highlightedSlot.value"
          :read-only="readOnly"
          :can-drag="canDrag"
          :draft-room-box="draftRoomBox"
          @entity-mousedown="onEntityMouseDown"
          @drag-start="store.pushSnapshot()"
          @drag-end="onDragEndEntity"
          @transform-end="onTransformEndEntity"
          @open-rack-modal="store.rackModalTargetId.value = $event"
        />
        <CanvasRouteLayer
          v-if="floor"
          :floor="floor"
          :show-graph="store.showCorridorGraph.value"
          :selection="store.selection.value"
          :edge-draft-from-node-id="store.edgeDraftFromNodeId.value"
          :active-route="store.activeRoute.value"
          :routing-profile="store.routingProfile.value"
          :sim-progress="store.simProgress.value"
          :is-simulating="store.isSimulating.value"
          :read-only="readOnly"
          :can-drag="canDrag"
          @entity-mousedown="onEntityMouseDown"
          @drag-start="store.pushSnapshot()"
          @drag-end="onDragEndEntity"
        />
      </v-stage>
    </div>

    <!-- Floating Bottom Pill HUD -->
    <div class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
      <div class="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-3.5 py-1 shadow-lg flex items-center gap-3 text-[11px] text-slate-600">
        <div class="hidden xl:flex items-center gap-2.5 text-[10px] whitespace-nowrap">
          <span class="flex items-center gap-1 whitespace-nowrap"><span class="w-2.5 h-2.5 rounded-full bg-sky-100 border border-sky-600 shrink-0" /> Medis</span>
          <span class="flex items-center gap-1 whitespace-nowrap"><span class="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-500 shrink-0" /> Non-Medis</span>
          <span class="text-slate-300">|</span>
          <span class="flex items-center gap-1 font-semibold text-sky-700 whitespace-nowrap"><span class="w-3 h-0.5 bg-sky-600 shrink-0" /> Umum</span>
          <span class="flex items-center gap-1 font-semibold text-teal-700 whitespace-nowrap"><span class="w-3 h-0.5 bg-teal-600 shrink-0" /> Steril</span>
          <span class="flex items-center gap-1 font-semibold text-indigo-700 whitespace-nowrap"><span class="w-3 h-0.5 bg-indigo-500 shrink-0" /> Bersama</span>
        </div>
        <div class="w-px h-3.5 bg-slate-200 hidden xl:block" />
        <button
          type="button"
          @click="store.showCorridorGraph.value = !store.showCorridorGraph.value"
          class="px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer"
          :class="store.showCorridorGraph.value ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-slate-100'"
        >
          <GitBranch class="w-3.5 h-3.5" /> <span>Rute</span>
        </button>
        <button
          v-if="floor?.image_url"
          type="button"
          @click="store.showBlueprint.value = !store.showBlueprint.value"
          class="px-2 py-0.5 rounded-full font-medium flex items-center gap-1 cursor-pointer"
          :class="store.showBlueprint.value ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-100'"
        >
          <ImageIcon class="w-3.5 h-3.5" />
          <Eye v-if="store.showBlueprint.value" class="w-3 h-3" />
          <EyeOff v-else class="w-3 h-3" />
        </button>
        <div class="w-px h-3.5 bg-slate-200" />
        <button type="button" @click="zoom = Math.max(0.4, Math.round((zoom - 0.15) * 100) / 100)" class="p-1 rounded-full hover:bg-slate-100 cursor-pointer"><ZoomOut class="w-3.5 h-3.5" /></button>
        <span class="font-mono font-semibold text-slate-700 w-10 text-center">{{ Math.round(zoom * 100) }}%</span>
        <button type="button" @click="zoom = Math.min(2.6, Math.round((zoom + 0.15) * 100) / 100)" class="p-1 rounded-full hover:bg-slate-100 cursor-pointer"><ZoomIn class="w-3.5 h-3.5" /></button>
        <button type="button" @click="fitToViewport" class="p-1 rounded-full hover:bg-slate-100 cursor-pointer" title="Fit to Screen"><Maximize2 class="w-3.5 h-3.5" /></button>
      </div>
    </div>
  </div>
</template>
