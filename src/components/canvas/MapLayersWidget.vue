<script setup>
import { Eye, GitBranch, Grid2x2, Image as ImageIcon, Layers } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { ROUTE_TYPES } from '../../data/hospitalDemoData'

const props = defineProps({
  activeRouteType: { type: String, default: 'bersama' },
  routingProfile: { type: String, default: 'umum' },
  showGrid: { type: Boolean, default: true },
  showGraph: { type: Boolean, default: true },
  showBlueprint: { type: Boolean, default: true },
  hasBlueprint: { type: Boolean, default: false },
  readOnly: { type: Boolean, default: false }
})

const emit = defineEmits([
  'select-route-type',
  'toggle-grid',
  'toggle-graph',
  'toggle-blueprint'
])

const pinnedOpen = ref(false)
const hovered = ref(false)
const isExpanded = computed(() => pinnedOpen.value || hovered.value)

const currentModeId = computed(() =>
  props.readOnly ? (props.routingProfile === 'steril' ? 'steril' : 'umum') : props.activeRouteType
)

const currentModeMeta = computed(() => ROUTE_TYPES[currentModeId.value] || ROUTE_TYPES.bersama)

const modeTiles = computed(() => {
  const all = [
    { id: 'umum', label: 'Umum', color: '#1a73e8', bg: '#eff6ff', desc: ROUTE_TYPES.umum.desc },
    { id: 'steril', label: 'Steril', color: '#0d9488', bg: '#f0fdfa', desc: ROUTE_TYPES.steril.desc },
    { id: 'bersama', label: 'Bersama', color: '#6366f1', bg: '#eef2ff', desc: ROUTE_TYPES.bersama.desc }
  ]
  return props.readOnly ? all.slice(0, 2) : all
})

const shortLabel = (id) => {
  if (id === 'umum') return 'Umum'
  if (id === 'steril') return 'Steril'
  return 'Bersama'
}
</script>

<template>
  <div
    class="absolute bottom-3 z-20 pointer-events-auto flex items-end gap-2"
    :class="readOnly ? 'hidden lg:flex left-[376px]' : 'left-3'"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <!-- Primary Collapsed Google Maps Thumbnail Trigger -->
    <button
      type="button"
      @click="pinnedOpen = !pinnedOpen"
      :title="`Mode: ${currentModeMeta.label} — Klik atau arahkan kursor untuk ganti opsi`"
      class="w-16 h-16 rounded-xl bg-white p-0.5 shadow-xl ring-1 ring-slate-300/90 hover:ring-[#1a73e8] transition-all cursor-pointer shrink-0 relative overflow-hidden group"
    >
      <div class="w-full h-full rounded-[10px] overflow-hidden relative bg-[#f8fafc]">
        <!-- Mini-map Vector Art -->
        <svg viewBox="0 0 64 64" class="w-full h-full">
          <rect width="64" height="64" fill="#f4f7fb" />
          <rect x="6" y="7" width="21" height="16" rx="3" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1.2" />
          <rect x="35" y="7" width="23" height="16" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2" />
          <rect x="10" y="37" width="22" height="18" rx="3" fill="#e0f2fe" stroke="#7dd3fc" stroke-width="1.2" />
          <rect x="40" y="37" width="17" height="16" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.2" />
          <path
            d="M16 23 L16 30 L48 30 L48 37"
            fill="none"
            :stroke="currentModeMeta.color"
            stroke-width="3.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="16" cy="30" r="2.8" fill="#ffffff" :stroke="currentModeMeta.color" stroke-width="1.8" />
          <circle cx="48" cy="30" r="2.8" fill="#ffffff" :stroke="currentModeMeta.color" stroke-width="1.8" />
        </svg>

        <!-- Bottom Scrim Label like Google Maps "Layers" Card -->
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/85 via-slate-900/50 to-transparent px-1.5 pb-1 pt-2.5 flex items-center justify-center gap-1 text-white">
          <Layers class="w-3 h-3 shrink-0" />
          <span class="text-[10px] font-bold tracking-tight truncate">{{ shortLabel(currentModeId) }}</span>
        </div>
      </div>
    </button>

    <!-- Google Maps Horizontal Expandable Options Bar -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-x-2 scale-95"
      enter-to-class="opacity-100 translate-x-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-x-0 scale-100"
      leave-to-class="opacity-0 -translate-x-2 scale-95"
    >
      <div
        v-if="isExpanded"
        class="bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-2xl px-2.5 py-2 flex items-center gap-2 origin-left"
      >
        <!-- Route Type Visual Preview Tiles -->
        <button
          v-for="tile in modeTiles"
          :key="tile.id"
          type="button"
          @click="emit('select-route-type', tile.id)"
          :title="tile.desc"
          class="flex flex-col items-center gap-1 group cursor-pointer w-13"
        >
          <div
            class="w-11 h-11 rounded-xl overflow-hidden border transition-all relative flex items-center justify-center"
            :class="
              currentModeId === tile.id
                ? 'ring-2 ring-[#1a73e8] border-[#1a73e8] shadow-xs'
                : 'border-slate-200 group-hover:border-slate-400'
            "
            :style="{ backgroundColor: tile.bg }"
          >
            <svg viewBox="0 0 44 44" class="w-full h-full">
              <rect x="4" y="5" width="14" height="11" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
              <rect x="25" y="5" width="15" height="11" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
              <rect x="8" y="27" width="16" height="12" rx="2" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
              <path
                d="M11 16 L11 22 L33 22 L33 32"
                fill="none"
                :stroke="tile.color"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="11" cy="22" r="2.2" fill="#ffffff" :stroke="tile.color" stroke-width="1.5" />
              <circle cx="33" cy="22" r="2.2" fill="#ffffff" :stroke="tile.color" stroke-width="1.5" />
            </svg>
          </div>
          <span
            class="text-[10px] leading-none font-semibold whitespace-nowrap"
            :class="currentModeId === tile.id ? 'text-[#1a73e8] font-bold' : 'text-slate-600 group-hover:text-slate-900'"
          >
            {{ tile.label }}
          </span>
        </button>

        <div class="w-px h-11 bg-slate-200 mx-0.5 shrink-0" />

        <!-- Map Visibility Detail Tiles (Grid & Layer Rute) -->
        <button
          type="button"
          @click="emit('toggle-grid')"
          title="Tampilkan / Sembunyikan Grid Kanvas"
          class="flex flex-col items-center gap-1 group cursor-pointer w-11"
        >
          <div
            class="w-11 h-11 rounded-xl border transition-all flex items-center justify-center"
            :class="
              showGrid
                ? 'bg-blue-50/70 ring-2 ring-[#1a73e8] border-[#1a73e8] text-[#1a73e8]'
                : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:border-slate-400'
            "
          >
            <Grid2x2 class="w-5 h-5" />
          </div>
          <span
            class="text-[10px] leading-none font-semibold whitespace-nowrap"
            :class="showGrid ? 'text-[#1a73e8] font-bold' : 'text-slate-600'"
          >
            Grid
          </span>
        </button>

        <button
          type="button"
          @click="emit('toggle-graph')"
          title="Tampilkan / Sembunyikan Layer Jalur Rute"
          class="flex flex-col items-center gap-1 group cursor-pointer w-11"
        >
          <div
            class="w-11 h-11 rounded-xl border transition-all flex items-center justify-center"
            :class="
              showGraph
                ? 'bg-blue-50/70 ring-2 ring-[#1a73e8] border-[#1a73e8] text-[#1a73e8]'
                : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:border-slate-400'
            "
          >
            <GitBranch class="w-5 h-5" />
          </div>
          <span
            class="text-[10px] leading-none font-semibold whitespace-nowrap"
            :class="showGraph ? 'text-[#1a73e8] font-bold' : 'text-slate-600'"
          >
            Rute
          </span>
        </button>

        <button
          v-if="hasBlueprint"
          type="button"
          @click="emit('toggle-blueprint')"
          title="Tampilkan / Sembunyikan Blueprint Denah"
          class="flex flex-col items-center gap-1 group cursor-pointer w-11"
        >
          <div
            class="w-11 h-11 rounded-xl border transition-all flex items-center justify-center relative"
            :class="
              showBlueprint
                ? 'bg-blue-50/70 ring-2 ring-[#1a73e8] border-[#1a73e8] text-[#1a73e8]'
                : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:border-slate-400'
            "
          >
            <ImageIcon class="w-5 h-5" />
            <Eye v-if="showBlueprint" class="w-2.5 h-2.5 absolute bottom-1.5 right-1.5" />
          </div>
          <span
            class="text-[10px] leading-none font-semibold whitespace-nowrap"
            :class="showBlueprint ? 'text-[#1a73e8] font-bold' : 'text-slate-600'"
          >
            Denah
          </span>
        </button>
      </div>
    </Transition>
  </div>
</template>
