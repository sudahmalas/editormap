<script setup>
defineProps({
  guides: { type: Array, default: () => [] },
  snapHud: { type: Object, default: null }
})
</script>

<template>
  <v-layer :config="{ listening: false }">
    <!-- Garis Bantu Sejajar (Smart Alignment Guides) -->
    <v-line
      v-for="(g, idx) in guides"
      :key="`guide-${idx}`"
      :config="{
        points: g.points,
        stroke: '#f43f5e',
        strokeWidth: 1.3,
        dash: [5, 4],
        opacity: 0.9
      }"
    />

    <!-- Live Coordinate & Grid Snap HUD -->
    <v-group v-if="snapHud" :config="{ x: snapHud.x, y: snapHud.y }">
      <v-rect
        :config="{
          x: 0,
          y: 0,
          width: Math.max(118, snapHud.text.length * 6.2 + 12),
          height: 20,
          cornerRadius: 6,
          fill: '#0f172a',
          opacity: 0.88
        }"
      />
      <v-text
        :config="{
          x: 6,
          y: 5,
          text: snapHud.text,
          fontSize: 10,
          fontFamily: 'monospace',
          fill: '#ffffff'
        }"
      />
    </v-group>
  </v-layer>
</template>
