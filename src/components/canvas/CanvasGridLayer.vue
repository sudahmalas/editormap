<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  floor: { type: Object, required: true },
  showBlueprint: { type: Boolean, default: true }
})

const blueprintImg = ref(null)
const floorWidth = computed(() => props.floor?.width || 1000)
const floorHeight = computed(() => props.floor?.height || 620)

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
  const w = floorWidth.value
  const h = floorHeight.value
  const step = 20
  const lines = []
  for (let x = 0; x <= w; x += step) {
    lines.push({
      points: [x, 0, x, h],
      stroke: x % 100 === 0 ? '#cbd5e1' : '#e2e8f0',
      strokeWidth: x % 100 === 0 ? 0.9 : 0.5
    })
  }
  for (let y = 0; y <= h; y += step) {
    lines.push({
      points: [0, y, w, y],
      stroke: y % 100 === 0 ? '#cbd5e1' : '#e2e8f0',
      strokeWidth: y % 100 === 0 ? 0.9 : 0.5
    })
  }
  return lines
})
</script>

<template>
  <v-layer>
    <v-rect
      :config="{
        name: 'floor-bg',
        x: 0,
        y: 0,
        width: floorWidth,
        height: floorHeight,
        cornerRadius: 10,
        fill: '#ffffff',
        stroke: '#cbd5e1',
        strokeWidth: 1.5,
        shadowColor: 'rgba(15, 23, 42, 0.14)',
        shadowBlur: 24,
        shadowOffsetY: 8
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
  </v-layer>
</template>
