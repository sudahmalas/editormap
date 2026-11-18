<script setup>
import { computed } from 'vue'
import { getWorklistRoomOptions } from '../../../services/worklistMasterService'
import SearchableCombobox from '../../common/SearchableCombobox.vue'

const props = defineProps({
  store: { type: Object, required: true },
  room: { type: Object, required: true }
})

const roomOptions = computed(() => getWorklistRoomOptions(props.store.activeBuilding.value))

const roomFilterTabs = [
  { id: 'all', label: 'Semua' },
  { id: 'medis', label: 'Medis' },
  { id: 'non_medis', label: 'Non-Medis' }
]

const mappedRoomOptions = computed(() =>
  roomOptions.value.map((opt) => ({
    ...opt,
    kind: opt.is_medis ? 'medis' : 'non_medis'
  }))
)

const handleSelectMasterRoom = (masterId) => {
  props.store.bindRoomToMaster(props.room.id, masterId)
}
</script>

<template>
  <div class="space-y-3.5">
    <!-- Combobox Dropdown Ruangan (Master Worklist) -->
    <div class="space-y-1.5">
      <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Pilih Master Ruangan (Worklist)
      </label>
      <SearchableCombobox
        :model-value="room.masterRoomId"
        :options="mappedRoomOptions"
        :filter-tabs="roomFilterTabs"
        placeholder="-- Pilih Ruangan dari Worklist --"
        search-placeholder="Cari nama / kode ruangan..."
        @update:model-value="handleSelectMasterRoom"
      />
    </div>

    <!-- Info Master Terpilih -->
    <div
      v-if="room.masterRoomId"
      class="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
    >
      <div class="flex items-center justify-between">
        <span class="text-[10px] font-mono text-slate-500">{{ room.kode }}</span>
        <span
          class="px-1.5 py-0.5 rounded text-[9px] font-bold"
          :class="room.is_medis ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'"
        >
          {{ room.is_medis ? 'Ruangan Medis' : 'Ruangan Non-Medis' }}
        </span>
      </div>
      <div class="text-xs font-bold text-slate-900">{{ room.nama }}</div>
    </div>
    <div
      v-else
      class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800"
    >
      Kotak area ruangan ini belum terhubung ke data Master Ruangan Worklist.
    </div>

    <!-- Geometri Denah -->
    <div>
      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Posisi &amp; Ukuran (px)</label>
      <div class="grid grid-cols-2 gap-1.5">
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">X</span>
          <input v-model.number="room.x" type="number" step="20" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">Y</span>
          <input v-model.number="room.y" type="number" step="20" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">W</span>
          <input v-model.number="room.w" type="number" step="20" min="40" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">H</span>
          <input v-model.number="room.h" type="number" step="20" min="40" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
      </div>
    </div>
  </div>
</template>
