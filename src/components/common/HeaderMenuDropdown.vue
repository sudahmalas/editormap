<script setup>
import {
  ChevronRight,
  Download,
  Menu,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Upload
} from 'lucide-vue-next'
import { onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  store: { type: Object, required: true }
})

const emit = defineEmits(['import-file', 'export-file', 'validate-map', 'reset-demo'])

const isOpen = ref(false)
const rootRef = ref(null)

const handleClickOutside = (e) => {
  if (isOpen.value && rootRef.value && !rootRef.value.contains(e.target)) {
    isOpen.value = false
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && isOpen.value) isOpen.value = false
}

const openSettingsModal = () => {
  isOpen.value = false
  props.store.showMapSettingsModal.value = true
}

const runAction = (eventName) => {
  isOpen.value = false
  emit(eventName)
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div ref="rootRef" class="relative shrink-0">
    <button
      type="button"
      @click="isOpen = !isOpen"
      title="Menu Peta & Setting"
      class="w-9 h-9 rounded-xl border border-slate-200/90 bg-slate-50/80 hover:bg-slate-100 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
      :class="isOpen ? 'bg-blue-50 border-blue-200 text-[#1a73e8]' : ''"
    >
      <Menu class="w-4 h-4" />
    </button>

    <div
      v-if="isOpen"
      class="absolute left-0 top-11 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 text-slate-700"
    >
      <button
        type="button"
        @click="openSettingsModal"
        class="w-full px-3 py-2.5 rounded-xl hover:bg-blue-50/60 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors group"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-7 h-7 rounded-lg bg-blue-50 text-[#1a73e8] flex items-center justify-center shrink-0">
            <SlidersHorizontal class="w-4 h-4" />
          </span>
          <div class="min-w-0">
            <div class="text-xs font-bold text-slate-900">Setting</div>
            <div class="text-[10px] text-slate-500 truncate">Skala, Grid Snap &amp; Layer</div>
          </div>
        </div>
        <ChevronRight class="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1a73e8] shrink-0" />
      </button>

      <div class="h-px bg-slate-100 mx-1.5" />

      <div class="px-2.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Berkas &amp; Peta
      </div>
      <button
        type="button"
        @click="runAction('validate-map')"
        class="w-full px-3 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-teal-600" /> Audit Peta &amp; Rute
      </button>
      <button
        type="button"
        @click="runAction('import-file')"
        class="w-full px-3 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
      >
        <Upload class="w-3.5 h-3.5 text-slate-500" /> Import JSON Worklist
      </button>
      <button
        type="button"
        @click="runAction('export-file')"
        class="w-full px-3 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
      >
        <Download class="w-3.5 h-3.5 text-slate-500" /> Export JSON Worklist
      </button>
      <button
        type="button"
        @click="runAction('reset-demo')"
        class="w-full px-3 py-1.5 rounded-xl hover:bg-rose-50 flex items-center gap-2.5 text-xs text-rose-600 cursor-pointer"
      >
        <RotateCcw class="w-3.5 h-3.5 text-rose-500" /> Reset Data Demo
      </button>
    </div>
  </div>
</template>
