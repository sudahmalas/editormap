<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Check,
  LocateFixed,
  Minus,
  Play,
  Plus,
  Square as StopIcon
} from 'lucide-vue-next'
import { computeDragSnapAndGuides } from '../../composables/useSnapGuides'
import { ROUTE_TYPES } from '../../data/hospitalDemoData'
import CanvasGridLayer from './CanvasGridLayer.vue'
import CanvasRoomRackLayer from './CanvasRoomRackLayer.vue'
import CanvasRouteLayer from './CanvasRouteLayer.vue'
import CanvasSnapGuidesLayer from './CanvasSnapGuidesLayer.vue'
import MapLayersWidget from './MapLayersWidget.vue'

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
const routeDraftCursor = ref(null)
const showCanvasGrid = ref(true)
const activeGuides = ref([])
const snapHud = ref(null)

const floor = computed(() => props.store.activeFloor.value)
const buildingFloorsDesc = computed(() => {
  const floors = props.store.activeBuilding.value?.floors || []
  return [...floors].sort((a, b) => (b.level_order || 0) - (a.level_order || 0))
})
const handleLayerModeSelect = (modeId) => {
  if (props.readOnly) {
    props.store.routingProfile.value = modeId === 'steril' ? 'steril' : 'umum'
  } else {
    props.store.activeRouteDrawType.value = modeId
    props.store.activeTool.value = 'edge'
  }
}

const activeRouteDrawMeta = computed(
  () => ROUTE_TYPES[props.store.activeRouteDrawType.value] || ROUTE_TYPES.bersama
)
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
watch(() => props.store.activeTool.value, () => {
  routeDraftCursor.value = null
})

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
  else if (tool === 'edge') {
    props.store.drawRoutePointAt(pt.x, pt.y)
    routeDraftCursor.value = { x: props.store.snap(pt.x), y: props.store.snap(pt.y) }
  } else if (tool === 'room') {
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
    return
  }
  if (!props.readOnly && props.store.activeTool.value === 'edge' && props.store.edgeDraftFromNodeId.value && floor.value) {
    const pt = getWorldPoint()
    let snapNode = null
    let bestD = 18
    for (const n of floor.value.nav_nodes || []) {
      const d = Math.hypot(n.x - pt.x, n.y - pt.y)
      if (d <= bestD) {
        bestD = d
        snapNode = n
      }
    }
    routeDraftCursor.value = snapNode
      ? { x: snapNode.x, y: snapNode.y }
      : { x: props.store.snap(pt.x), y: props.store.snap(pt.y) }
  } else if (routeDraftCursor.value) {
    routeDraftCursor.value = null
  }
}

const onStageDblClick = () => {
  if (!props.readOnly && props.store.activeTool.value === 'edge' && props.store.edgeDraftFromNodeId.value) {
    props.store.finishRouteDraft()
    routeDraftCursor.value = null
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
  if (tool === 'edge') {
    if (type === 'node') {
      props.store.drawRoutePointAt(entity.x, entity.y, entity.id)
      routeDraftCursor.value = { x: entity.x, y: entity.y }
    } else {
      const pt = getWorldPoint()
      props.store.drawRoutePointAt(pt.x, pt.y)
      routeDraftCursor.value = { x: props.store.snap(pt.x), y: props.store.snap(pt.y) }
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

const onDragMoveEntity = (e, type, entity) => {
  if (!floor.value) return
  const node = e.target
  const { nx, ny, guides, snapHud: hud } = computeDragSnapAndGuides(
    node.x(),
    node.y(),
    type,
    entity,
    floor.value,
    props.store
  )
  node.position({ x: nx, y: ny })
  activeGuides.value = guides
  snapHud.value = hud

  const prevX = entity.x
  const prevY = entity.y
  if (nx !== prevX || ny !== prevY) {
    entity.x = nx
    entity.y = ny
    if (type === 'room') {
      props.store.syncRoomMoved(entity, prevX, prevY)
    }
  }
}

const onDragEndEntity = (e, type, entity) => {
  activeGuides.value = []
  snapHud.value = null
  if (!floor.value) return
  const node = e.target
  const prevX = entity.x
  const prevY = entity.y
  const { nx, ny } = computeDragSnapAndGuides(
    node.x(),
    node.y(),
    type,
    entity,
    floor.value,
    props.store
  )
  node.position({ x: nx, y: ny })
  entity.x = nx
  entity.y = ny

  if (type === 'room' && (nx !== prevX || ny !== prevY)) {
    props.store.syncRoomMoved(entity, prevX, prevY)
  } else if (type === 'rack') {
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
  <div
    class="flex-1 relative overflow-hidden select-none flex flex-col"
    style="
      background-color: #eaedf2;
      background-image:
        radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 0.55) 0%, rgba(226, 232, 240, 0.35) 100%),
        radial-gradient(#cbd5e1 1.1px, transparent 1.1px);
      background-size: 100% 100%, 20px 20px;
    "
  >
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

    <!-- Google Maps Polyline Route Draw Helper Banner (Active Only During Route Drawing) -->
    <div
      v-if="!readOnly && store.activeTool.value === 'edge'"
      class="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-auto"
    >
      <div class="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full px-3.5 py-1.5 shadow-lg flex items-center gap-2 text-[11px]">
        <span
          class="w-2.5 h-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: activeRouteDrawMeta.color }"
        />
        <span class="font-bold text-slate-800 whitespace-nowrap">{{ activeRouteDrawMeta.label }}</span>
        <span class="text-slate-500 truncate max-w-[260px] sm:max-w-none">
          {{
            store.edgeDraftFromNodeId.value
              ? 'Klik titik berikutnya · Double-click / Esc selesai'
              : 'Klik koridor, pintu, atau ruangan untuk mulai'
          }}
        </span>
        <button
          v-if="store.edgeDraftFromNodeId.value"
          type="button"
          @click="store.finishRouteDraft(); routeDraftCursor = null"
          class="px-2.5 py-0.5 rounded-full bg-[#1a73e8] hover:bg-blue-700 text-white font-semibold flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Check class="w-3 h-3" /> Selesai
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
      @dblclick="onStageDblClick"
      @contextmenu.prevent="onStageDblClick"
    >
      <v-stage
        ref="stageRef"
        :config="{ width: stageSize.width, height: stageSize.height, x: pan.x, y: pan.y, scaleX: zoom, scaleY: zoom }"
        @wheel="handleWheel"
        @mousedown="onStageMouseDown"
        @mousemove="onStageMouseMove"
        @mouseup="onStageMouseUp"
      >
        <CanvasGridLayer
          v-if="floor"
          :floor="floor"
          :show-blueprint="store.showBlueprint.value"
          :show-grid="showCanvasGrid"
          :grid-size="store.gridSize.value"
          :read-only="readOnly"
        />
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
          @drag-move="onDragMoveEntity"
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
          :active-route-draw-type="store.activeRouteDrawType.value"
          :route-draft-cursor="routeDraftCursor"
          :active-route="store.activeRoute.value"
          :routing-profile="store.routingProfile.value"
          :sim-progress="store.simProgress.value"
          :is-simulating="store.isSimulating.value"
          :read-only="readOnly"
          :can-drag="canDrag"
          @entity-mousedown="onEntityMouseDown"
          @drag-start="store.pushSnapshot()"
          @drag-move="onDragMoveEntity"
          @drag-end="onDragEndEntity"
        />
        <CanvasSnapGuidesLayer
          v-if="floor && !readOnly"
          :guides="activeGuides"
          :snap-hud="snapHud"
        />
      </v-stage>
    </div>

    <!-- Bottom-Right Google Maps Controls (Indoor Floor Switcher + Recenter + Stacked Zoom) -->
    <div class="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-2 pointer-events-auto">
      <div
        v-if="buildingFloorsDesc.length > 1"
        class="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md overflow-hidden flex flex-col divide-y divide-slate-100"
        title="Pilih Lantai (Google Indoor Style)"
      >
        <button
          v-for="fl in buildingFloorsDesc"
          :key="fl.id"
          type="button"
          @click="store.selectFloor(fl.id)"
          :title="fl.nama_lantai"
          class="w-9 h-8 text-[11px] font-bold flex items-center justify-center transition-colors cursor-pointer"
          :class="
            fl.id === store.activeFloorId.value
              ? 'bg-[#1a73e8] text-white'
              : 'text-slate-700 hover:bg-slate-100'
          "
        >
          L{{ fl.level_order || 1 }}
        </button>
      </div>

      <button
        type="button"
        @click="fitToViewport"
        title="Pusatkan Peta ke Layar"
        class="w-9 h-9 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md flex items-center justify-center text-slate-700 hover:text-[#1a73e8] hover:bg-slate-50 cursor-pointer transition-colors"
      >
        <LocateFixed class="w-4 h-4" />
      </button>

      <div class="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl shadow-md overflow-hidden flex flex-col divide-y divide-slate-100">
        <button
          type="button"
          @click="zoom = Math.min(2.6, Math.round((zoom + 0.15) * 100) / 100)"
          title="Perbesar (+)"
          class="w-9 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <Plus class="w-4 h-4" />
        </button>
        <div class="w-9 py-0.5 text-[9px] font-mono font-semibold text-center text-slate-500 bg-slate-50/70">
          {{ Math.round(zoom * 100) }}%
        </div>
        <button
          type="button"
          @click="zoom = Math.max(0.4, Math.round((zoom - 0.15) * 100) / 100)"
          title="Perkecil (−)"
          class="w-9 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <Minus class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Bottom-Left Google Maps Layers & Route-Mode Switcher Widget -->
    <MapLayersWidget
      :active-route-type="store.activeRouteDrawType.value"
      :routing-profile="store.routingProfile.value"
      :show-grid="showCanvasGrid"
      :show-graph="store.showCorridorGraph.value"
      :show-blueprint="store.showBlueprint.value"
      :has-blueprint="Boolean(floor?.image_url)"
      :read-only="readOnly"
      @select-route-type="handleLayerModeSelect"
      @toggle-grid="showCanvasGrid = !showCanvasGrid"
      @toggle-graph="store.showCorridorGraph.value = !store.showCorridorGraph.value"
      @toggle-blueprint="store.showBlueprint.value = !store.showBlueprint.value"
    />
  </div>
</template>
