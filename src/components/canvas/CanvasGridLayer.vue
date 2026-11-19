<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  floor: { type: Object, required: true },
  showBlueprint: { type: Boolean, default: true },
  showGrid: { type: Boolean, default: true },
  gridSize: { type: Number, default: 20 },
  readOnly: { type: Boolean, default: false }
})

const blueprintImg = ref(null)
const floorWidth = computed(() => props.floor?.width || 1000)
const floorHeight = computed(() => props.floor?.height || 620)
const scaleText = computed(() => {
  const kode = props.floor?.kode_lantai || ''
  const ppm = props.floor?.pixelsPerMeter || 20
  return kode ? `${kode} · Skala ${ppm} px/m` : `Skala ${ppm} px/m`
})

watch(
  () => props.floor?.image_url,
  (url) => {
    if (!url) {
      blueprintImg.value = null
      return
    }
    const img = new window.Image()
    img.onload = () => {
      blueprintImg.value = img
    }
    img.src = url
  },
  { immediate: true }
)

const gridLines = computed(() => {
  if (!props.showGrid) return []
  const w = floorWidth.value
  const h = floorHeight.value
  const step = props.readOnly ? 100 : Math.max(10, Number(props.gridSize) || 20)
  const lines = []
  for (let x = 0; x <= w; x += step) {
    const isMajor = x % 100 === 0 || step >= 50 && x % (step * 2) === 0
    lines.push({
      points: [x, 0, x, h],
      stroke: isMajor ? '#dbe3ee' : '#eef2f7',
      strokeWidth: isMajor ? 0.9 : 0.6
    })
  }
  for (let y = 0; y <= h; y += step) {
    const isMajor = y % 100 === 0 || step >= 50 && y % (step * 2) === 0
    lines.push({
      points: [0, y, w, y],
      stroke: isMajor ? '#dbe3ee' : '#eef2f7',
      strokeWidth: isMajor ? 0.9 : 0.6
    })
  }
  return lines
})
</script>

<template>
  <v-layer>
    <!-- Google Indoor / Studio Floorplate Base -->
    <v-rect
      :config="{
        name: 'floor-bg',
        x: 0,
        y: 0,
        width: floorWidth,
        height: floorHeight,
        cornerRadius: 12,
        fill: '#fbfcfe',
        stroke: '#cbd5e1',
        strokeWidth: 1.5,
        shadowColor: 'rgba(15, 23, 42, 0.10)',
        shadowBlur: 28,
        shadowOffsetY: 10
      }"
    />
    <v-line
      v-for="(gl, idx) in gridLines"
      :key="`gl-${idx}`"
      :config="{
        points: gl.points,
        stroke: gl.stroke,
        strokeWidth: gl.strokeWidth,
        listening: false
      }"
    />
    <v-image
      v-if="blueprintImg && showBlueprint"
      :config="{
        image: blueprintImg,
        x: 0,
        y: 0,
        width: floorWidth,
        height: floorHeight,
        opacity: floor.image_opacity ?? 0.35,
        listening: false
      }"
    />
    <v-text
      :config="{
        x: 14,
        y: floorHeight - 18,
        text: scaleText,
        fontSize: 9.5,
        fontFamily: 'monospace',
        fill: '#94a3b8',
        listening: false
      }"
    />
  </v-layer>
</template>
