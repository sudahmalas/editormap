<script setup>
import Konva from 'konva'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ROUTE_TYPES } from '../../data/hospitalDemoData'

const props = defineProps({
  floor: { type: Object, required: true },
  showGraph: { type: Boolean, default: true },
  selection: { type: Object, default: null },
  edgeDraftFromNodeId: { type: String, default: null },
  activeRouteDrawType: { type: String, default: 'bersama' },
  routeDraftCursor: { type: Object, default: null },
  activeRoute: { type: Object, default: null },
  routingProfile: { type: String, default: 'umum' },
  simProgress: { type: Number, default: 0 },
  isSimulating: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false },
  canDrag: { type: Boolean, default: false }
})

const emit = defineEmits(['entity-mousedown', 'drag-start', 'drag-move', 'drag-end'])

const routeAnimLineRef = ref(null)
let routeAnim = null

onMounted(() => {
  routeAnim = new Konva.Animation((frame) => {
    const lineNode = routeAnimLineRef.value?.getNode?.()
    if (lineNode && frame) {
      lineNode.dashOffset(-((frame.time * 0.035) % 24))
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

const edgeDraftFromNode = computed(() =>
  props.edgeDraftFromNodeId ? nodeMap.value.get(props.edgeDraftFromNodeId) || null : null
)

const currentFloorRoutePoints = computed(() => {
  if (!props.activeRoute?.found || !props.floor) return []
  return props.activeRoute.segmentsByFloor?.[props.floor.id] || []
})

const routeFlatPoints = computed(() => {
  const pts = []
  for (const n of currentFloorRoutePoints.value) pts.push(n.x, n.y)
  return pts
})

const startNodeOnFloor = computed(() => {
  if (!props.activeRoute?.found || !props.activeRoute.path?.length) return null
  const first = props.activeRoute.path[0]
  return first.floorId === props.floor?.id ? first : null
})

const endNodeOnFloor = computed(() => {
  if (!props.activeRoute?.found || !props.activeRoute.path?.length) return null
  const last = props.activeRoute.path[props.activeRoute.path.length - 1]
  return last.floorId === props.floor?.id ? last : null
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

const isSterilRoute = computed(() => props.routingProfile === 'steril')
const gmapsStrokeColor = computed(() => (isSterilRoute.value ? '#14b8a6' : '#1a73e8'))
const gmapsBorderColor = computed(() => (isSterilRoute.value ? '#0f766e' : '#174ea6'))
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
            opacity: activeRoute?.found ? 0.45 : 0.9,
            hitStrokeWidth: 12
          }"
          @mousedown="emit('entity-mousedown', $event, 'edge', edge)"
        />
      </template>

      <!-- Google My Maps Live Polyline Draft Preview -->
      <v-line
        v-if="!readOnly && edgeDraftFromNode && routeDraftCursor"
        :config="{
          points: [edgeDraftFromNode.x, edgeDraftFromNode.y, routeDraftCursor.x, routeDraftCursor.y],
          stroke: getRouteColor(activeRouteDrawType),
          strokeWidth: 3,
          dash: [7, 5],
          opacity: 0.85,
          listening: false
        }"
      />

      <v-group
        v-for="node in floor.nav_nodes"
        :key="node.id"
        :config="{ x: node.x, y: node.y, draggable: canDrag }"
        @mousedown="emit('entity-mousedown', $event, 'node', node)"
        @dragstart="emit('drag-start')"
        @dragmove="emit('drag-move', $event, 'node', node)"
        @dragend="emit('drag-end', $event, 'node', node)"
      >
        <template v-if="node.kind === 'portal'">
          <v-rect
            :config="{
              x: -24,
              y: -14,
              width: 48,
              height: 28,
              cornerRadius: 8,
              fill: node.portalType === 'stairs' ? '#fef3c7' : '#e0e7ff',
              stroke:
                !readOnly && selection?.type === 'node' && selection?.id === node.id
                  ? '#1a73e8'
                  : node.portalType === 'stairs'
                    ? '#d97706'
                    : '#4f46e5',
              strokeWidth: 1.8,
              shadowColor: 'rgba(15,23,42,0.12)',
              shadowBlur: 4,
              shadowOffsetY: 1
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
        <template v-else>
          <v-circle
            v-if="edgeDraftFromNodeId === node.id || (!readOnly && selection?.type === 'node' && selection?.id === node.id)"
            :config="{
              x: 0,
              y: 0,
              radius: 10,
              fill: edgeDraftFromNodeId === node.id ? 'rgba(26,115,232,0.22)' : 'rgba(15,23,42,0.12)',
              listening: false
            }"
          />
          <v-circle
            :config="{
              x: 0,
              y: 0,
              radius: edgeDraftFromNodeId === node.id ? 6.5 : 4.8,
              fill: edgeDraftFromNodeId === node.id ? '#1a73e8' : '#ffffff',
              stroke: edgeDraftFromNodeId === node.id ? '#ffffff' : getRouteColor(node.routeType),
              strokeWidth: edgeDraftFromNodeId === node.id ? 2 : 2.2
            }"
          />
        </template>
      </v-group>
    </template>

    <!-- Active Route — Google Maps Blue Ribbon + Animated Directional Pulse -->
    <template v-if="currentFloorRoutePoints.length >= 1">
      <v-line
        v-if="currentFloorRoutePoints.length >= 2"
        :config="{
          points: routeFlatPoints,
          stroke: gmapsBorderColor,
          strokeWidth: 10,
          lineCap: 'round',
          lineJoin: 'round',
          shadowColor: 'rgba(15,23,42,0.25)',
          shadowBlur: 6,
          shadowOffsetY: 2,
          listening: false
        }"
      />
      <v-line
        v-if="currentFloorRoutePoints.length >= 2"
        :config="{
          points: routeFlatPoints,
          stroke: gmapsStrokeColor,
          strokeWidth: 6.2,
          lineCap: 'round',
          lineJoin: 'round',
          listening: false
        }"
      />
      <v-line
        v-if="currentFloorRoutePoints.length >= 2"
        ref="routeAnimLineRef"
        :config="{
          points: routeFlatPoints,
          stroke: '#ffffff',
          strokeWidth: 2.2,
          lineCap: 'round',
          lineJoin: 'round',
          dash: [2, 16],
          opacity: 0.78,
          listening: false
        }"
      />

      <!-- Intermediate Floor Entry/Exit Connector Dot -->
      <v-circle
        v-if="!startNodeOnFloor"
        :config="{
          x: currentFloorRoutePoints[0].x,
          y: currentFloorRoutePoints[0].y,
          radius: 5.5,
          fill: '#ffffff',
          stroke: gmapsBorderColor,
          strokeWidth: 2.5,
          listening: false
        }"
      />

      <!-- Start Marker: Google Maps Blue Location Dot -->
      <template v-if="startNodeOnFloor">
        <v-circle
          :config="{
            x: startNodeOnFloor.x,
            y: startNodeOnFloor.y,
            radius: 13,
            fill: 'rgba(26,115,232,0.20)',
            listening: false
          }"
        />
        <v-circle
          :config="{
            x: startNodeOnFloor.x,
            y: startNodeOnFloor.y,
            radius: 7,
            fill: '#1a73e8',
            stroke: '#ffffff',
            strokeWidth: 2.5,
            shadowColor: 'rgba(15,23,42,0.25)',
            shadowBlur: 4,
            listening: false
          }"
        />
      </template>

      <!-- Destination Marker: Classic Google Maps Red Teardrop Pin -->
      <v-group
        v-if="endNodeOnFloor"
        :config="{ x: endNodeOnFloor.x, y: endNodeOnFloor.y, listening: false }"
      >
        <v-ellipse
          :config="{
            x: 0,
            y: 1,
            radiusX: 7,
            radiusY: 3,
            fill: 'rgba(15,23,42,0.28)'
          }"
        />
        <v-path
          :config="{
            data: 'M 0 0 C -7 -9 -12 -15 -12 -21 A 12 12 0 1 1 12 -21 C 12 -15 7 -9 0 0 Z',
            fill: '#ea4335',
            stroke: '#b91c1c',
            strokeWidth: 1.5,
            shadowColor: 'rgba(15,23,42,0.25)',
            shadowBlur: 4,
            shadowOffsetY: 1
          }"
        />
        <v-circle
          :config="{
            x: 0,
            y: -21,
            radius: 4.3,
            fill: '#ffffff'
          }"
        />
      </v-group>
    </template>

    <!-- Simulated Google Maps Live Navigation Dot -->
    <template v-if="simulatedBlueDot">
      <v-circle :config="{ x: simulatedBlueDot.x, y: simulatedBlueDot.y, radius: 16, fill: 'rgba(26,115,232,0.24)', listening: false }" />
      <v-circle :config="{ x: simulatedBlueDot.x, y: simulatedBlueDot.y, radius: 7.5, fill: '#1a73e8', stroke: '#ffffff', strokeWidth: 2.5, listening: false }" />
    </template>
  </v-layer>
</template>
