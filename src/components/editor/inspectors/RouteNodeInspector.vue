<script setup>
import { ROUTE_TYPES } from '../../../data/hospitalDemoData'
import SearchableCombobox from '../../common/SearchableCombobox.vue'

defineProps({
  type: { type: String, required: true }, // 'node' | 'edge'
  entity: { type: Object, required: true }
})

const nodeKindOptions = [
  { value: 'corridor', label: 'Titik Koridor' },
  { value: 'door', label: 'Pintu Ruangan' },
  { value: 'room', label: 'Titik Dalam Ruangan' },
  { value: 'portal', label: 'Portal Antar-Lantai / Gedung' }
]

const routeTypeOptions = Object.values(ROUTE_TYPES).map((rt) => ({
  value: rt.id,
  label: rt.label,
  sublabel: rt.desc,
  dotColor: rt.color
}))

const portalTypeOptions = [
  { value: 'elevator', label: 'Lift (Ramah Troli)' },
  { value: 'ramp', label: 'Ramp (Ramah Troli)' },
  { value: 'bridge', label: 'Selasar / Skybridge' },
  { value: 'stairs', label: 'Tangga (Non-Troli)' }
]
</script>

<template>
  <div class="space-y-3">
    <div v-if="type === 'node'">
      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Label Titik Rute</label>
      <input v-model="entity.label" type="text" class="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5" />
    </div>

    <div v-if="type === 'node'" class="space-y-1.5">
      <label class="block text-[10px] font-bold uppercase text-slate-400">Jenis Titik</label>
      <SearchableCombobox v-model="entity.kind" :options="nodeKindOptions" :searchable="false" compact />
    </div>

    <div class="space-y-1.5">
      <label class="block text-[10px] font-bold uppercase text-slate-400">Akses Jalur Rute</label>
      <SearchableCombobox v-model="entity.routeType" :options="routeTypeOptions" :searchable="false" compact />
    </div>

    <div v-if="type === 'node' && entity.kind === 'portal'" class="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
      <SearchableCombobox v-model="entity.portalType" :options="portalTypeOptions" :searchable="false" compact />
      <input
        v-model="entity.portalGroup"
        type="text"
        placeholder="Portal Group ID (mis. LIFT-UTAMA)"
        class="w-full text-xs font-mono bg-white border border-indigo-200 rounded-lg px-2 py-1"
      />
    </div>

    <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
      <input type="checkbox" v-model="entity.accessible" />
      <span>Dapat Dilalui Troli (Bebas Tangga)</span>
    </label>
  </div>
</template>
