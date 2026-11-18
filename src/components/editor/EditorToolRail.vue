<script setup>
import {
  Archive,
  ArrowUpDown,
  DoorOpen,
  GitCommitHorizontal,
  Hand,
  Link2,
  Magnet,
  MousePointer2,
  PanelRightClose,
  PanelRightOpen,
  Route,
  Square
} from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ROUTE_TYPES } from '../../data/hospitalDemoData'

const props = defineProps({
  store: { type: Object, required: true },
  rightInspectorOpen: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle-right'])

const flyoutOpen = ref(false)
const flyoutRootRef = ref(null)

const activeRouteMeta = computed(
  () => ROUTE_TYPES[props.store.activeRouteDrawType.value] || ROUTE_TYPES.bersama
)

const toolGroups = [
  {
    group: 'Navigasi',
    items: [
      { id: 'select', key: 'V', label: 'Pick Tool — Pilih & Posisikan', icon: MousePointer2 },
      { id: 'hand', key: 'H', label: 'Pan Tool — Geser Kanvas', icon: Hand }
    ]
  },
  {
    group: 'Elemen',
    items: [
      { id: 'room', key: 'R', label: 'Kotak Ruangan (Seret di kanvas / Drag ikon)', icon: Square, dragKind: 'room' },
      { id: 'rack', key: 'K', label: 'Kotak Penyimpanan / Rak (Klik kanvas / Drag ikon)', icon: Archive, dragKind: 'rack' },
      { id: 'door', key: 'D', label: 'Pintu Ruangan (Klik dinding / Drag ikon)', icon: DoorOpen, dragKind: 'door' },
      { id: 'portal', key: 'P', label: 'Portal Lift / Tangga (Klik kanvas / Drag ikon)', icon: ArrowUpDown, dragKind: 'portal' }
    ]
  },
  {
    group: 'Rute',
    items: [
      { id: 'node', key: 'N', label: 'Titik Rute (Klik koridor/ruang)', icon: GitCommitHorizontal },
      { id: 'edge', key: 'E', label: 'Sambung Jalur Rute (Titik A → B)', icon: Link2 }
    ]
  }
]

const onToolDragStart = (e, dragKind) => {
  if (!dragKind) return
  e.dataTransfer?.setData('application/x-editormap-element', dragKind)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}

const selectRouteType = (rtId) => {
  props.store.activeRouteDrawType.value = rtId
  flyoutOpen.value = false
}

const handleClickOutside = (e) => {
  if (flyoutRootRef.value && !flyoutRootRef.value.contains(e.target)) {
    flyoutOpen.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <aside class="w-12 bg-[#181b22] text-slate-300 border-r border-slate-800/90 flex flex-col items-center py-2.5 justify-between shrink-0 z-20 select-none">
    <!-- CorelDRAW-style Slim Toolbox -->
    <div class="w-full flex flex-col items-center gap-1">
      <template v-for="(grp, gi) in toolGroups" :key="grp.group">
        <div class="w-full flex flex-col items-center gap-1">
          <button
            v-for="t in grp.items"
            :key="t.id"
            type="button"
            :draggable="Boolean(t.dragKind)"
            @dragstart="onToolDragStart($event, t.dragKind)"
            @click="store.activeTool.value = t.id; store.edgeDraftFromNodeId.value = null"
            :title="`${t.label} [${t.key}]`"
            class="w-9 h-9 rounded-lg flex items-center justify-center relative transition-all cursor-pointer"
            :class="
              store.activeTool.value === t.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            "
          >
            <component :is="t.icon" class="w-4 h-4" />
            <span class="absolute bottom-0.5 right-1 text-[7px] font-mono opacity-55">{{ t.key }}</span>
          </button>
        </div>
        <div v-if="gi < toolGroups.length - 1" class="w-6 h-px bg-slate-800 my-1" />
      </template>

      <!-- CorelDRAW-style Flyout Selector for Route Type (Umum / Steril / Bersama) -->
      <div ref="flyoutRootRef" class="relative mt-0.5">
        <button
          type="button"
          @click="flyoutOpen = !flyoutOpen"
          :title="`Jenis Jalur Aktif: ${activeRouteMeta.label}`"
          class="w-9 h-9 rounded-lg flex items-center justify-center relative bg-slate-800/70 hover:bg-slate-800 text-slate-200 border border-slate-700/70 cursor-pointer transition-colors"
        >
          <Route class="w-4 h-4" />
          <span
            class="w-2 h-2 rounded-full absolute top-1.5 right-1.5 ring-2 ring-[#181b22]"
            :style="{ backgroundColor: activeRouteMeta.color }"
          />
          <!-- CorelDRAW corner flyout triangle -->
          <span class="absolute bottom-1 right-1 w-0 h-0 border-l-[4px] border-l-transparent border-b-[4px] border-b-slate-400" />
        </button>

        <!-- Flyout Popover -->
        <div
          v-if="flyoutOpen"
          class="absolute left-11 top-0 w-56 bg-[#1e222a] border border-slate-700 rounded-xl shadow-2xl p-2 space-y-1 z-50"
        >
          <div class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Jenis Jalur Rute
          </div>
          <button
            v-for="rt in Object.values(ROUTE_TYPES)"
            :key="rt.id"
            type="button"
            @click="selectRouteType(rt.id)"
            class="w-full px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer"
            :class="
              store.activeRouteDrawType.value === rt.id
                ? 'bg-blue-600/20 text-white border border-blue-500/40'
                : 'text-slate-300 hover:bg-slate-800 border border-transparent'
            "
          >
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: rt.color }" />
                {{ rt.label }}
              </span>
              <span v-if="store.activeRouteDrawType.value === rt.id" class="text-[9px] text-blue-300 font-bold">
                Aktif
              </span>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5 leading-snug">{{ rt.desc }}</p>
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Utilities: Snap & Right Docker Toggle -->
    <div class="w-full flex flex-col items-center gap-1">
      <button
        type="button"
        @click="store.snapToGrid.value = !store.snapToGrid.value"
        :title="store.snapToGrid.value ? 'Snap to Grid: ON' : 'Snap to Grid: OFF'"
        class="w-9 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
        :class="store.snapToGrid.value ? 'bg-teal-500/20 text-teal-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'"
      >
        <Magnet class="w-4 h-4" />
      </button>
      <button
        type="button"
        @click="emit('toggle-right')"
        :title="rightInspectorOpen ? 'Tutup Docker Kanan' : 'Buka Docker Kanan'"
        class="w-9 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800/70 cursor-pointer"
      >
        <PanelRightClose v-if="rightInspectorOpen" class="w-4 h-4" />
        <PanelRightOpen v-else class="w-4 h-4" />
      </button>
    </div>
  </aside>
</template>
