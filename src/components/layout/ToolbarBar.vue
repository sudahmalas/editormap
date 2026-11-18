<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore, type ToolId } from '@/stores/editor'
import { useRouteStore } from '@/stores/route'

const editor = useEditorStore()
const route = useRouteStore()

interface ToolDef {
  id: ToolId
  label: string
  hint: string
  keys: string
}

const tools: ToolDef[] = [
  { id: 'select', label: 'Pilih', hint: 'Pilih dan ubah objek', keys: '1' },
  { id: 'node', label: 'Titik Jalur', hint: 'Tambah dan sambungkan titik jalur', keys: '2' },
  { id: 'wall', label: 'Dinding', hint: 'Gambar garis dinding', keys: '3' },
  { id: 'room', label: 'Ruangan', hint: 'Gambar poligon ruangan', keys: '4' },
  { id: 'pin', label: 'Lokasi', hint: 'Tandai lokasi/unit', keys: '5' },
  { id: 'door', label: 'Pintu', hint: 'Tandai pintu', keys: '6' },
  { id: 'pan', label: 'Geser', hint: 'Geser tampilan', keys: 'Space' },
]

const activeHint = computed(() => tools.find((t) => t.id === editor.tool)?.hint ?? '')
</script>

<template>
  <div class="flex items-center gap-1 border-b border-slate-200 bg-white px-3 py-1.5">
    <div class="flex flex-wrap items-center gap-1">
      <button
        v-for="tool in tools"
        :key="tool.id"
        type="button"
        :title="`${tool.hint} (${tool.keys})`"
        class="flex items-center gap-1.5 rounded-sm border px-2 py-1.5 text-[11px] font-bold transition-colors"
        :class="
          editor.tool === tool.id
            ? 'border-[#3db6bc] bg-[#3db6bc] text-white shadow-2xs'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        "
        @click="editor.setTool(tool.id)"
      >
        {{ tool.label }}
      </button>
    </div>

    <span class="mx-1 hidden h-5 w-px bg-slate-200 sm:block" />

    <div class="hidden items-center gap-1 sm:flex">
      <button
        type="button"
        class="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        :disabled="!editor.canUndo"
        @click="editor.undo()"
      >
        Undo
      </button>
      <button
        type="button"
        class="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        :disabled="!editor.canRedo"
        @click="editor.redo()"
      >
        Redo
      </button>
    </div>

    <span class="mx-1 hidden h-5 w-px bg-slate-200 md:block" />

    <div class="hidden items-center gap-1 md:flex">
      <button
        type="button"
        class="rounded-sm border px-2 py-1.5 text-[11px] font-bold"
        :class="
          editor.prefs.showGrid
            ? 'border-[#3db6bc] bg-teal-50 text-[#2b8b90]'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        "
        @click="editor.updatePrefs({ showGrid: !editor.prefs.showGrid })"
      >
        Grid
      </button>
      <button
        type="button"
        class="rounded-sm border px-2 py-1.5 text-[11px] font-bold"
        :class="
          editor.prefs.snapToGrid
            ? 'border-[#3db6bc] bg-teal-50 text-[#2b8b90]'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        "
        @click="editor.updatePrefs({ snapToGrid: !editor.prefs.snapToGrid })"
      >
        Snap
      </button>
    </div>

    <div class="ml-auto flex items-center gap-1.5">
      <button
        type="button"
        class="rounded-sm border px-2 py-1.5 text-[11px] font-bold"
        :class="
          route.active
            ? 'border-[#3db6bc] bg-[#3db6bc] text-white shadow-2xs'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
        "
        @click="route.toggle()"
      >
        Mode Uji Rute
      </button>
      <span class="hidden text-[10px] font-semibold text-slate-400 lg:block">{{ activeHint }}</span>
    </div>
  </div>
</template>
