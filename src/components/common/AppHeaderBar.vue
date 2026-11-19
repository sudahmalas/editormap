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
  ShieldCheck,
  Truck,
  Undo2
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { exportToWorklistPayload, importFromWorklistPayload } from '../../adapters/worklistSchema'
import HeaderMenuDropdown from './HeaderMenuDropdown.vue'
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
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
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
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-amber-50 text-amber-700 border-amber-200'
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
  <header class="h-14 bg-white/95 backdrop-blur-md text-slate-800 border-b border-slate-200/90 px-3.5 flex items-center justify-between gap-3 shrink-0 z-30 shadow-2xs">
    <!-- LEFT: Menu + Brand + Breadcrumb Bangunan / Lantai -->
    <div class="flex items-center gap-2.5 min-w-0">
      <HeaderMenuDropdown
        :store="store"
        @import-file="importInputRef?.click()"
        @export-file="handleExport"
        @validate-map="handleValidate"
        @reset-demo="store.resetDemoData()"
      />

      <div class="flex items-center gap-2 shrink-0 pr-1">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1a73e8] to-teal-500 text-white flex items-center justify-center shadow-xs">
          <Map class="w-4 h-4 stroke-[2.2]" />
        </div>
        <div class="hidden md:block leading-tight">
          <div class="text-xs font-extrabold tracking-tight text-slate-900">EditorMap</div>
          <div class="text-[10px] text-slate-400 truncate max-w-[120px]">{{ store.campus.outlet?.nama || 'Indoor Maps' }}</div>
        </div>
      </div>

      <div class="h-6 w-px bg-slate-200 hidden lg:block shrink-0" />

      <div class="flex items-center gap-1.5 min-w-0">
        <div class="w-36 lg:w-48">
          <SearchableCombobox
            :model-value="store.activeBuildingId.value"
            :options="buildingOptions"
            compact
            placeholder="Pilih Bangunan"
            search-placeholder="Cari bangunan..."
            popover-width-class="w-72"
            @update:model-value="store.selectBuilding(Number($event))"
          >
            <template #icon><Building2 class="w-3.5 h-3.5 text-[#1a73e8] shrink-0" /></template>
          </SearchableCombobox>
        </div>

        <span class="text-slate-300 hidden sm:inline font-light">/</span>

        <div v-if="store.activeBuilding.value" class="w-40 lg:w-52">
          <SearchableCombobox
            :model-value="store.activeFloorId.value"
            :options="floorOptions"
            compact
            placeholder="Pilih Lantai"
            search-placeholder="Cari lantai..."
            popover-width-class="w-80"
            @update:model-value="store.selectFloor(Number($event))"
          >
            <template #icon><Layers class="w-3.5 h-3.5 text-teal-600 shrink-0" /></template>
          </SearchableCombobox>
        </div>

        <button
          v-if="store.activeFloor.value && store.appMode.value === 'editor'"
          type="button"
          @click="store.toggleFloorPublishStatus(store.activeFloor.value.id)"
          title="Klik untuk ubah status Published / Draft"
          class="hidden xl:flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border items-center gap-1 cursor-pointer shrink-0 transition-colors"
          :class="
            store.activeFloor.value.status === 'published'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          "
        >
          <CheckCircle2 v-if="store.activeFloor.value.status === 'published'" class="w-3 h-3" />
          <FileWarning v-else class="w-3 h-3" />
          {{ store.activeFloor.value.status === 'published' ? 'Published' : 'Draft' }}
        </button>
      </div>
    </div>

    <!-- CENTER: Google Maps / Figma Segmented View Switcher -->
    <nav class="flex items-center bg-slate-100/90 p-1 rounded-full border border-slate-200/80 shrink-0">
      <button
        type="button"
        @click="store.appMode.value = 'editor'"
        class="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="
          store.appMode.value === 'editor'
            ? 'bg-white text-[#1a73e8] shadow-xs ring-1 ring-slate-200/80'
            : 'text-slate-600 hover:text-slate-900'
        "
      >
        <Map class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Studio Editor</span>
      </button>
      <button
        type="button"
        @click="store.appMode.value = 'finder'"
        class="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="
          store.appMode.value === 'finder'
            ? 'bg-white text-sky-700 shadow-xs ring-1 ring-slate-200/80'
            : 'text-slate-600 hover:text-slate-900'
        "
      >
        <PackageSearch class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Cari Barang</span>
      </button>
      <button
        type="button"
        @click="store.appMode.value = 'porter'"
        class="px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        :class="
          store.appMode.value === 'porter'
            ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-slate-200/80'
            : 'text-slate-600 hover:text-slate-900'
        "
      >
        <Truck class="w-3.5 h-3.5" /> <span class="hidden sm:inline">Portal Porter</span>
      </button>
    </nav>

    <!-- RIGHT: History + Audit + Primary Export CTA -->
    <div class="flex items-center gap-2 shrink-0">
      <div
        v-if="store.appMode.value === 'editor'"
        class="hidden md:flex items-center bg-slate-50 border border-slate-200/90 rounded-xl p-0.5"
      >
        <button
          type="button"
          :disabled="store.historyStack.value.length === 0"
          @click="store.undo()"
          title="Undo (Ctrl+Z)"
          class="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-35 cursor-pointer"
        >
          <Undo2 class="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          :disabled="store.redoStack.value.length === 0"
          @click="store.redo()"
          title="Redo (Ctrl+Shift+Z)"
          class="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 disabled:opacity-35 cursor-pointer"
        >
          <Redo2 class="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        v-if="store.appMode.value === 'editor'"
        type="button"
        @click="handleValidate"
        title="Audit Koneksi & Rute"
        class="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer transition-colors"
      >
        <ShieldCheck class="w-3.5 h-3.5 text-teal-600" />
        <span class="hidden xl:inline">Audit</span>
      </button>

      <input ref="importInputRef" type="file" accept="application/json" class="hidden" @change="handleImportFile" />

      <button
        type="button"
        @click="handleExport"
        title="Export Schema JSON Worklist"
        class="px-3.5 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
      >
        <Download class="w-3.5 h-3.5" /> <span class="hidden lg:inline">Export</span>
      </button>
    </div>
  </header>
</template>
