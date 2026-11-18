<script setup>
import Konva from 'konva'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ROUTE_TYPES } from '../../data/hospitalDemoData'

const props = defineProps({
  floor: { type: Object, required: true },
  showGraph: { type: Boolean, default: true },
  selection: { type: Object, default: null },
  edgeDraftFromNodeId: { type: String, default: null },
  activeRoute: { type: Object, default: null },
  routingProfile: { type: String, default: 'umum' },
  simProgress: { type: Number, default: 0 },
  isSimulating: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
  canDrag: { type: Boolean, default: false }
})

const emit = defineEmits(['entity-mousedown', 'drag-start', 'drag-end'])

const routeAnimLineRef = ref(null)
let routeAnim = null

onMounted(() => {
  routeAnim = new Konva.Animation((frame) => {
    const lineNode = routeAnimLineRef.value?.getNode?.()
    if (lineNode && frame) {
      lineNode.dashOffset(-((frame.time * 0.03) % 30))
      lineNode.getLayer()?.batchDraw()
    }
  })
  routeAnim.start()
})

onUnmounted(() => {
  if (routeAnim) routeAnim.stop()
})

const nodeMap = computed(() => {
  const map = new Map()
  for (const n of props.floor?.nav_nodes || []) map.set(n.id, n)
  return map
})

const currentFloorRoutePoints = computed(() => {
  if (!props.activeRoute?.found || !props.floor) return []
  return props.activeRoute.segmentsByFloor?.[props.floor.id] || []
})

const routeFlatPoints = computed(() => {
  const pts = []
  for (const n of currentFloorRoutePoints.value) pts.push(n.x, n.y)
  return pts
})

const simulatedBlueDot = computed(() => {
  if (!props.activeRoute?.found || !props.activeRoute.path?.length || !props.floor) return null
  const total = props.activeRoute.path.length
  if (total === 1) return props.activeRoute.path[0].floorId === props.floor.id ? props.activeRoute.path[0] : null
  const exactIdx = props.simProgress * (total - 1)
  const i0 = Math.floor(exactIdx)
  const i1 = Math.min(total - 1, i0 + 1)
  const t = exactIdx - i0
  const n0 = props.activeRoute.path[i0]
  const n1 = props.activeRoute.path[i1]
  if (n0.floorId !== props.floor.id || n1.floorId !== props.floor.id) {
    return n0.floorId === props.floor.id ? n0 : null
  }
  return { x: n0.x + (n1.x - n0.x) * t, y: n0.y + (n1.y - n0.y) * t }
})

const getPortalBadge = (portalType) => {
  if (portalType === 'elevator') return 'LIFT'
  if (portalType === 'stairs') return 'TANGGA'
  if (portalType === 'bridge') return 'SELASAR'
  return 'PORTAL'
}

const getRouteColor = (rt) => ROUTE_TYPES[rt]?.color || ROUTE_TYPES.bersama.color
</script>

<template>
  <v-layer>
    <!-- Route Graph -->
    <template v-if="showGraph">
      <template v-for="edge in floor.edges" :key="edge.id">
        <v-line
          v-if="nodeMap.get(edge.from) && nodeMap.get(edge.to)"
          :config="{
            points: [
              nodeMap.get(edge.from).x,
              nodeMap.get(edge.from).y,
              nodeMap.get(edge.to).x,
              nodeMap.get(edge.to).y
            ],
            stroke:
              !readOnly && selection?.type === 'edge' && selection?.id === edge.id
                ? '#0f172a'
                : getRouteColor(edge.routeType),
            strokeWidth: !readOnly && selection?.type === 'edge' && selection?.id === edge.id ? 4.5 : 2.6,
            dash: edge.accessible === false ? [5, 5] : undefined,
            hitStrokeWidth: 12
          }"
          @mousedown="emit('entity-mousedown', $event, 'edge', edge)"
        />
      </template>

      <v-group
        v-for="node in floor.nav_nodes"
        :key="node.id"
        :config="{ x: node.x, y: node.y, draggable: canDrag }"
        @mousedown="emit('entity-mousedown', $event, 'node', node)"
        @dragstart="emit('drag-start')"
        @dragend="emit('drag-end', $event, 'node', node)"
      >
        <template v-if="node.kind === 'portal'">
          <v-rect
            :config="{
              x: -24,
              y: -14,
              width: 48,
              height: 28,
              cornerRadius: 6,
              fill: node.portalType === 'stairs' ? '#fef3c7' : '#e0e7ff',
              stroke:
                !readOnly && selection?.type === 'node' && selection?.id === node.id
                  ? '#2563eb'
                  : node.portalType === 'stairs'
                    ? '#d97706'
                    : '#4f46e5',
              strokeWidth: 2
            }"
          />
          <v-text
            :config="{
              x: -24,
              y: -4,
              width: 48,
              align: 'center',
              text: getPortalBadge(node.portalType),
              fontSize: 8.5,
              fontStyle: 'bold',
              fill: node.portalType === 'stairs' ? '#92400e' : '#3730a3',
              listening: false
            }"
          />
        </template>
        <v-circle
          v-else
          :config="{
            x: 0,
            y: 0,
            radius: edgeDraftFromNodeId === node.id ? 8 : 5.5,
            fill: edgeDraftFromNodeId === node.id ? '#f59e0b' : getRouteColor(node.routeType),
            stroke: '#ffffff',
            strokeWidth: 1.8
          }"
        />
      </v-group>
    </template>

    <!-- Active Wayfinding Route -->
    <template v-if="currentFloorRoutePoints.length >= 1">
      <v-line
        v-if="currentFloorRoutePoints.length >= 2"
        :config="{
          points: routeFlatPoints,
          stroke: routingProfile === 'steril' ? '#0d9488' : '#0284c7',
          strokeWidth: 9,
          lineCap: 'round',
          lineJoin: 'round',
          opacity: 0.22,
          listening: false
        }"
      />
      <v-line
        v-if="currentFloorRoutePoints.length >= 2"
        ref="routeAnimLineRef"
        :config="{
          points: routeFlatPoints,
          stroke: routingProfile === 'steril' ? '#0d9488' : '#0284c7',
          strokeWidth: 3.5,
          lineCap: 'round',
          lineJoin: 'round',
          dash: [9, 6],
          listening: false
        }"
      />
      <v-circle
        :config="{
          x: currentFloorRoutePoints[0].x,
          y: currentFloorRoutePoints[0].y,
          radius: 7,
          fill: '#10b981',
          stroke: '#ffffff',
          strokeWidth: 2,
          listening: false
        }"
      />
      <v-circle
        :config="{
          x: currentFloorRoutePoints[currentFloorRoutePoints.length - 1].x,
          y: currentFloorRoutePoints[currentFloorRoutePoints.length - 1].y,
          radius: 7.5,
          fill: '#e11d48',
          stroke: '#ffffff',
          strokeWidth: 2,
          listening: false
        }"
      />
    </template>

    <!-- Simulated Blue-Dot -->
    <template v-if="simulatedBlueDot">
      <v-circle :config="{ x: simulatedBlueDot.x, y: simulatedBlueDot.y, radius: 15, fill: 'rgba(14,165,233,0.22)', listening: false }" />
      <v-circle :config="{ x: simulatedBlueDot.x, y: simulatedBlueDot.y, radius: 7, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2.5, listening: false }" />
    </template>
  </v-layer>
</template>
