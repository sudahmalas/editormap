<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { countIssues, validateDocument } from '@/core/validation'

const editor = useEditorStore()

const issues = computed(() => validateDocument(editor.doc, editor.activeFloorId ?? null))
const counts = computed(() => countIssues(issues.value))

const floorStats = computed(() => {
  const floor = editor.activeFloor
  if (!floor) return null
  return {
    nodes: floor.nodes.length,
    edges: floor.edges.length,
    rooms: floor.rooms.length,
    pins: floor.pins.length,
  }
})

const buildingCount = computed(() => editor.doc.buildings.length)
const zoomPercent = computed(() => Math.round(editor.zoom * 100))
</script>

<template>
  <footer
    class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold text-slate-500"
  >
    <span class="font-black text-slate-700">{{ editor.activeFloorName }}</span>
    <span class="text-slate-300">|</span>
    <span>{{ buildingCount }} gedung</span>
    <template v-if="floorStats">
      <span class="text-slate-300">|</span>
      <span>{{ floorStats.nodes }} titik</span>
      <span class="text-slate-300">|</span>
      <span>{{ floorStats.edges }} jalur</span>
      <span class="text-slate-300">|</span>
      <span>{{ floorStats.rooms }} ruang</span>
      <span class="text-slate-300">|</span>
      <span>{{ floorStats.pins }} lokasi</span>
    </template>

    <div class="ml-auto flex flex-wrap items-center gap-2">
      <template v-if="editor.mode === 'editor'">
        <span
          class="rounded-sm border px-1.5 py-0.5"
          :class="
            counts.errors > 0
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          "
        >
          {{ counts.errors }} error
        </span>
        <span
          class="rounded-sm border px-1.5 py-0.5"
          :class="
            counts.warnings > 0
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          "
        >
          {{ counts.warnings }} peringatan
        </span>
      </template>
      <span class="tabular-nums">x {{ editor.pointer.x }} · y {{ editor.pointer.y }}</span>
      <span class="tabular-nums">{{ zoomPercent }}%</span>
      <span
        class="rounded-sm border px-1.5 py-0.5"
        :class="
          editor.dirty
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        "
      >
        {{ editor.dirty ? 'Belum diekspor' : 'Tersimpan lokal' }}
      </span>
    </div>
  </footer>
</template>
