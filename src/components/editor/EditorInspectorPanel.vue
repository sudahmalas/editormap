<script setup>
import { AlertTriangle, CheckCircle2, Info, SlidersHorizontal, Trash2 } from 'lucide-vue-next'
import { computed } from 'vue'
import FloorSettingsInspector from './inspectors/FloorSettingsInspector.vue'
import LayersListPanel from './inspectors/LayersListPanel.vue'
import RoomInspector from './inspectors/RoomInspector.vue'
import RouteNodeInspector from './inspectors/RouteNodeInspector.vue'
import StorageInspector from './inspectors/StorageInspector.vue'

const props = defineProps({
  store: { type: Object, required: true },
  open: { type: Boolean, default: true }
})

const sel = computed(() => props.store.selection.value)
const ent = computed(() => props.store.selectedEntity.value)
const floor = computed(() => props.store.activeFloor.value)
</script>

<template>
  <aside
    v-if="open"
    class="w-[282px] my-2.5 mr-2.5 flex flex-col gap-2.5 shrink-0 min-h-0 z-10"
  >
    <!-- TOP CARD: MODIFIKASI PROPERTI ELEMEN & AUDIT -->
    <div class="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 flex flex-col shrink-0 max-h-[60%]">
      <div class="px-3 pt-2.5 pb-2 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div class="flex bg-slate-100 p-0.5 rounded-lg">
          <button
            type="button"
            @click="store.rightInspectorTab.value = 'design'"
            class="px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
            :class="store.rightInspectorTab.value === 'design' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
          >
            <SlidersHorizontal class="w-3 h-3" /> Properti
          </button>
          <button
            type="button"
            @click="store.rightInspectorTab.value = 'audit'"
            class="px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
            :class="store.rightInspectorTab.value === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
          >
            <span>Audit</span>
            <span v-if="store.validationIssues.value.length > 0" class="px-1.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800">
              {{ store.validationIssues.value.length }}
            </span>
          </button>
        </div>

        <button
          v-if="sel && ent"
          type="button"
          @click="store.deleteSelected()"
          title="Hapus elemen terpilih (Del)"
          class="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- TAB: PROPERTI -->
      <div v-if="store.rightInspectorTab.value === 'design'" class="overflow-y-auto p-3">
        <RoomInspector v-if="sel?.type === 'room' && ent" :store="store" :room="ent" />
        <StorageInspector v-else-if="sel?.type === 'rack' && ent" :store="store" :rack="ent" />
        <RouteNodeInspector v-else-if="(sel?.type === 'node' || sel?.type === 'edge') && ent" :type="sel.type" :entity="ent" />
        <FloorSettingsInspector v-else-if="floor" :store="store" :floor="floor" />
      </div>

      <!-- TAB: AUDIT -->
      <div v-else class="overflow-y-auto p-3 space-y-2.5">
        <button
          type="button"
          @click="store.runValidation()"
          class="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
        >
          Jalankan Audit Peta &amp; Rute
        </button>

        <div
          v-if="store.validationIssues.value.length === 0"
          class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-700 flex items-center gap-2"
        >
          <CheckCircle2 class="w-4 h-4 shrink-0" />
          <span>Semua elemen dan rute lolos pengecekan.</span>
        </div>

        <div v-else class="space-y-1.5">
          <div
            v-for="(issue, idx) in store.validationIssues.value"
            :key="idx"
            @click="store.selectFloor(issue.floorId)"
            class="p-2 rounded-xl border text-[11px] flex items-start gap-1.5 cursor-pointer"
            :class="
              issue.severity === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : issue.severity === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
            "
          >
            <AlertTriangle v-if="issue.severity !== 'info'" class="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <Info v-else class="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{{ issue.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- BOTTOM CARD: LAYERS LIST UNTUK MEMILIH & MEMODIFIKASI ELEMEN -->
    <LayersListPanel :store="store" />
  </aside>
</template>
