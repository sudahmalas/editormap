<script setup>
import { Grid3X3 } from 'lucide-vue-next'
import { computed } from 'vue'
import { RACK_TYPES } from '../../../data/hospitalDemoData'
import { getWorklistStorageOptions } from '../../../services/worklistMasterService'
import SearchableCombobox from '../../common/SearchableCombobox.vue'

const props = defineProps({
  store: { type: Object, required: true },
  rack: { type: Object, required: true }
})

const storageOptions = computed(() =>
  getWorklistStorageOptions(props.store.campus, props.rack.ruangan_id)
)

const roomSelectOptions = computed(() => [
  { value: '', label: '-- Tanpa Ruangan --', sublabel: 'Belum di dalam ruangan' },
  ...(props.store.activeFloor.value?.rooms || []).map((r) => ({
    value: r.masterRoomId || r.id,
    label: r.nama,
    sublabel: r.kode,
    badge: r.is_medis ? 'Medis' : 'Non-Medis',
    badgeClass: r.is_medis ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-600 border-slate-200'
  }))
])

const handleSelectStorage = (masterStorageId) => {
  props.store.bindStorageToMaster(props.rack.id, masterStorageId)
}
</script>

<template>
  <div class="space-y-3.5">
    <!-- Combobox Dropdown Penyimpanan (Master Asset Storage Worklist) -->
    <div class="space-y-1.5">
      <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Pilih Master Penyimpanan (Asset Storage)
      </label>
      <SearchableCombobox
        :model-value="rack.masterStorageId"
        :options="storageOptions"
        placeholder="-- Pilih Rak / Lemari dari Asset --"
        search-placeholder="Cari nama atau kode wadah..."
        @update:model-value="handleSelectStorage"
      />
    </div>

    <!-- Info Storage Terpilih -->
    <div
      v-if="rack.masterStorageId"
      class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
    >
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono text-slate-500">{{ rack.kode }}</span>
        <span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
          {{ RACK_TYPES[rack.rackType]?.label || rack.rackType }}
        </span>
      </div>
      <div class="text-xs font-bold text-slate-900">{{ rack.nama }}</div>
    </div>
    <div
      v-else
      class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800"
    >
      Kotak penyimpanan ini belum dihubungkan ke data Asset Storage Worklist.
    </div>

    <!-- Ruangan Induk pada Denah -->
    <div class="space-y-1">
      <label class="block text-[10px] font-bold uppercase text-slate-400">Ruangan Induk di Lantai</label>
      <SearchableCombobox
        :model-value="rack.ruangan_id ?? ''"
        :options="roomSelectOptions"
        search-placeholder="Cari ruangan..."
        compact
        @update:model-value="rack.ruangan_id = $event === '' ? null : Number($event)"
      />
    </div>

    <!-- Transform & Grid -->
    <div>
      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Posisi, Rotasi &amp; Grid Slot</label>
      <div class="grid grid-cols-2 gap-1.5">
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">X</span>
          <input v-model.number="rack.x" type="number" step="20" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">Y</span>
          <input v-model.number="rack.y" type="number" step="20" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-6 font-mono">Rot°</span>
          <input v-model.number="rack.rotation" type="number" step="15" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <div class="grid grid-cols-2 gap-1">
          <input v-model.number="rack.rows" type="number" min="1" max="8" title="Baris" class="bg-slate-50 border border-slate-200/80 rounded-lg px-1.5 py-1 text-[11px] text-center font-mono" />
          <input v-model.number="rack.cols" type="number" min="1" max="8" title="Kolom" class="bg-slate-50 border border-slate-200/80 rounded-lg px-1.5 py-1 text-[11px] text-center font-mono" />
        </div>
      </div>
    </div>

    <button
      type="button"
      @click="store.rackModalTargetId.value = rack.id"
      class="w-full py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
    >
      <Grid3X3 class="w-3.5 h-3.5" />
      Atur Isi Slot Rak (`rack_map`)
    </button>
  </div>
</template>
