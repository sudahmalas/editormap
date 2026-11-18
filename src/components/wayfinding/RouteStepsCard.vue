<script setup>
import { Archive, Compass, Grid3X3, ShieldCheck } from 'lucide-vue-next'

defineProps({
  store: { type: Object, required: true },
  titlePrefix: { type: String, default: 'Rute' }
})
</script>

<template>
  <section
    v-if="store.activeRoute.value?.found"
    class="hidden lg:flex absolute top-3 right-3 w-80 max-h-[calc(100vh-8rem)] z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex-col overflow-hidden"
  >
    <div
      class="p-3.5 text-white flex items-center justify-between"
      :class="
        store.routingProfile.value === 'steril'
          ? 'bg-gradient-to-r from-teal-600 to-emerald-600'
          : 'bg-gradient-to-r from-sky-600 to-blue-600'
      "
    >
      <div>
        <div class="text-[10px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
          <ShieldCheck class="w-3.5 h-3.5" />
          {{ titlePrefix }} ({{ store.routingProfile.value === 'steril' ? 'Jalur Steril' : 'Jalur Umum' }})
        </div>
        <div class="text-lg font-extrabold leading-tight mt-0.5">
          {{ store.activeRoute.value.totalMeters }} m
          <span class="text-xs font-medium opacity-90">(~{{ store.activeRoute.value.etaSeconds }} dtk)</span>
        </div>
      </div>
      <Compass class="w-6 h-6 opacity-90" />
    </div>

    <div
      v-if="store.highlightedSlot.value"
      class="px-3.5 py-2.5 bg-teal-50 border-b border-teal-100 flex items-center justify-between"
    >
      <div class="text-[11px] font-bold text-teal-800 flex items-center gap-1.5">
        <Archive class="w-3.5 h-3.5" />
        Slot Baris {{ store.highlightedSlot.value.row }} · Kolom {{ store.highlightedSlot.value.col }}
      </div>
      <button
        type="button"
        @click="store.rackModalTargetId.value = store.highlightedSlot.value.rackId"
        class="px-2 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
      >
        <Grid3X3 class="w-3 h-3" /> Buka Rak
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
      <div
        v-for="(step, idx) in store.activeRoute.value.steps"
        :key="idx"
        @click="store.selectFloor(step.floorId)"
        class="p-2 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-sky-50/60 flex items-start gap-2 cursor-pointer transition-colors"
      >
        <span
          class="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
          :class="
            step.type === 'start'
              ? 'bg-emerald-600 text-white'
              : step.type === 'portal'
                ? 'bg-indigo-600 text-white'
                : step.type === 'arrive'
                  ? 'bg-rose-600 text-white'
                  : 'bg-sky-100 text-sky-800'
          "
        >
          {{ idx + 1 }}
        </span>
        <span class="text-[11px] text-slate-700 leading-snug">{{ step.text }}</span>
      </div>
    </div>
  </section>
</template>
