<script setup>
import {
  Building2,
  CheckCircle2,
  Download,
  FileWarning,
  Layers,
  Map,
  PackageSearch,
  Redo2,
  RotateCcw,
  ShieldCheck,
  Truck,
  Undo2,
  Upload
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { exportToWorklistPayload, importFromWorklistPayload } from '../../adapters/worklistSchema'
import SearchableCombobox from './SearchableCombobox.vue'

const props = defineProps({
  store: { type: Object, required: true }
})

const emit = defineEmits(['toast'])
const importInputRef = ref(null)

const buildingOptions = computed(() =>
  (props.store.campus.buildings || []).map((b) => ({
    value: b.id,
    label: b.nama,
    sublabel: `${b.kode} · ${b.floors?.length || 0} lantai`,
    badge: b.kode,
    badgeClass: 'bg-slate-800 text-slate-300 border-slate-700'
  }))
)

const floorOptions = computed(() =>
  (props.store.activeBuilding.value?.floors || []).map((f) => ({
    value: f.id,
    label: f.nama_lantai,
    sublabel: `${f.kode_lantai} · ${f.rooms?.length || 0} ruangan`,
    badge: f.status === 'published' ? 'Published' : 'Draft',
    badgeClass:
      f.status === 'published'
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  }))
)

const handleExport = () => {
  const payload = exportToWorklistPayload(props.store.campus)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `editormap-worklist-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  emit('toast', { title: 'Export Berhasil', message: 'Payload JSON Worklist (denah_maps & stock_containers) diunduh.' })
}

const handleImportFile = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = JSON.parse(text)
    const imported = importFromWorklistPayload(parsed)
    props.store.replaceCampusData(imported)
    emit('toast', { title: 'Import Berhasil', message: `${parsed.denah_maps?.length || 0} lantai berhasil dimuat.` })
  } catch (err) {
    emit('toast', { title: 'Import Gagal', message: err.message || 'File JSON tidak valid.', variant: 'error' })
  } finally {
    e.target.value = ''
  }
}

const handleValidate = () => {
  const issues = props.store.runValidation()
  if (issues.length === 0) {
    emit('toast', { title: 'Audit Peta Bersih', message: 'Semua elemen dan rute terhubung rapi.' })
  } else {
    emit('toast', {
      title: `Ditemukan ${issues.length} Catatan Audit`,
      message: 'Lihat tab Audit di panel Properti kanan.',
      variant: 'warning'
    })
  }
}
</script>

<template>
  <header class="h-12 bg-[#1e222a] text-slate-200 border-b border-slate-800 px-3 flex items-center justify-between gap-3 shrink-0 z-30">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-sky-500 text-slate-950 flex items-center justify-center shadow-xs">
          <Map class="w-4 h-4 stroke-[2.25]" />
        </div>
        <span class="text-xs font-bold tracking-tight text-white hidden sm:inline">EditorMap</span>
      </div>

      <span class="text-slate-600 hidden md:inline">/</span>

      <div class="flex items-center gap-1.5 min-w-0">
        <div class="w-48">
          <SearchableCombobox
            :model-value="store.activeBuildingId.value"
            :options="buildingOptions"
            theme="dark"
            placeholder="Pilih Bangunan"
            search-placeholder="Cari bangunan..."
            popover-width-class="w-72"
            @update:model-value="store.selectBuilding(Number($event))"
          >
            <template #icon><Building2 class="w-3.5 h-3.5 text-slate-400 shrink-0" /></template>
          </SearchableCombobox>
        </div>

        <div v-if="store.activeBuilding.value" class="w-52">
          <SearchableCombobox
            :model-value="store.activeFloorId.value"
            :options="floorOptions"
            theme="dark"
            placeholder="Pilih Lantai"
            search-placeholder="Cari lantai..."
            popover-width-class="w-80"
            @update:model-value="store.selectFloor(Number($event))"
          >
            <template #icon><Layers class="w-3.5 h-3.5 text-slate-400 shrink-0" /></template>
          </SearchableCombobox>
        </div>

        <button
          v-if="store.activeFloor.value && store.appMode.value === 'editor'"
          type="button"
          @click="store.toggleFloorPublishStatus(store.activeFloor.value.id)"
          class="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 cursor-pointer shrink-0"
          :class="
            store.activeFloor.value.status === 'published'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
          "
        >
          <CheckCircle2 v-if="store.activeFloor.value.status === 'published'" class="w-3 h-3" />
          <FileWarning v-else class="w-3 h-3" />
          {{ store.activeFloor.value.status === 'published' ? 'Published' : 'Draft' }}
        </button>
      </div>
    </div>

    <nav class="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-700/80 shrink-0">
      <button
        type="button"
        @click="store.appMode.value = 'editor'"
        class="px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="store.appMode.value === 'editor' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
      >
        <Map class="w-3.5 h-3.5" /> <span>Studio Editor</span>
      </button>
      <button
        type="button"
        @click="store.appMode.value = 'finder'"
        class="px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="store.appMode.value === 'finder' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
      >
        <PackageSearch class="w-3.5 h-3.5" /> <span>Cari Barang</span>
      </button>
      <button
        type="button"
        @click="store.appMode.value = 'porter'"
        class="px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="store.appMode.value === 'porter' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'"
      >
        <Truck class="w-3.5 h-3.5" /> <span>Portal Porter</span>
      </button>
    </nav>

    <div class="flex items-center gap-1.5 shrink-0">
      <template v-if="store.appMode.value === 'editor'">
        <button type="button" :disabled="store.historyStack.value.length === 0" @click="store.undo()" title="Undo (Ctrl+Z)" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
          <Undo2 class="w-3.5 h-3.5" />
        </button>
        <button type="button" :disabled="store.redoStack.value.length === 0" @click="store.redo()" title="Redo (Ctrl+Shift+Z)" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 disabled:opacity-35 cursor-pointer">
          <Redo2 class="w-3.5 h-3.5" />
        </button>
        <button type="button" @click="handleValidate" class="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 flex items-center gap-1.5 cursor-pointer">
          <ShieldCheck class="w-3.5 h-3.5 text-teal-400" />
          <span class="hidden xl:inline">Audit Peta</span>
        </button>
      </template>

      <input ref="importInputRef" type="file" accept="application/json" class="hidden" @change="handleImportFile" />
      <button type="button" @click="importInputRef?.click()" title="Import JSON Worklist" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 cursor-pointer">
        <Upload class="w-3.5 h-3.5" />
      </button>
      <button type="button" @click="handleExport" title="Export Schema JSON Worklist" class="px-2.5 py-1 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer">
        <Download class="w-3.5 h-3.5" /> <span class="hidden lg:inline">Export</span>
      </button>
      <button type="button" @click="store.resetDemoData()" title="Reset Data Demo" class="p-1.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 hover:text-rose-400 cursor-pointer">
        <RotateCcw class="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
</template>
