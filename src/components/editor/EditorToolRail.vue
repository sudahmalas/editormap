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
  Square
} from 'lucide-vue-next'

defineProps({
  store: { type: Object, required: true },
  rightInspectorOpen: { type: Boolean, default: true }
})

const emit = defineEmits(['toggle-right'])

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
      { id: 'edge', key: 'E', label: 'Jalur Rute ala Google Maps (Klik titik berantai • Esc/Dbl-Click selesai)', icon: Link2 },
      { id: 'node', key: 'N', label: 'Pin Titik Rute Tunggal (Klik koridor/ruang)', icon: GitCommitHorizontal }
    ]
  }
]

const onToolDragStart = (e, dragKind) => {
  if (!dragKind) return
  e.dataTransfer?.setData('application/x-editormap-element', dragKind)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copy'
}
</script>

<template>
  <aside class="w-12 bg-[#181b22] text-slate-300 border-r border-slate-800/90 flex flex-col items-center py-2.5 justify-between shrink-0 z-20 select-none">
    <!-- Slim Toolbox Tools -->
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
