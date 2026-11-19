<script setup>
import { Archive, Grid3X3, MapPin, Navigation, Play, ShieldCheck, Square as StopIcon, X } from 'lucide-vue-next'

defineProps({
  store: { type: Object, required: true },
  titlePrefix: { type: String, default: 'Rute' }
})
</script>

<template>
  <section
    v-if="store.activeRoute.value?.found"
    class="hidden lg:flex absolute top-3 right-3 w-80 max-h-[calc(100vh-14rem)] z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex-col overflow-hidden"
  >
    <!-- Header Google Maps Directions -->
    <div
      class="p-3.5 text-white space-y-2.5"
      :class="
        store.routingProfile.value === 'steril'
          ? 'bg-gradient-to-r from-teal-600 to-emerald-600'
          : 'bg-[#1a73e8]'
      "
    >
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-[10px] font-bold uppercase tracking-wider opacity-90 flex items-center gap-1">
            <ShieldCheck class="w-3.5 h-3.5" />
            {{ titlePrefix }} · {{ store.routingProfile.value === 'steril' ? 'Jalur Steril' : 'Jalur Umum' }}
          </div>
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-xl font-extrabold leading-tight">~{{ store.activeRoute.value.etaSeconds }} dtk</span>
            <span class="text-xs font-medium opacity-90">({{ store.activeRoute.value.totalMeters }} m)</span>
          </div>
        </div>

        <button
          type="button"
          @click="store.resetRouteState()"
          title="Tutup petunjuk arah"
          class="p-1 rounded-full hover:bg-white/20 text-white/90 hover:text-white cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="!store.isSimulating.value"
          type="button"
          @click="store.startSimulation()"
          class="flex-1 py-1.5 px-3 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Navigation class="w-3.5 h-3.5 text-[#1a73e8]" /> Mulai Navigasi
        </button>
        <button
          v-else
          type="button"
          @click="store.stopSimulation()"
          class="flex-1 py-1.5 px-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
        >
          <StopIcon class="w-3.5 h-3.5" /> Hentikan Navigasi
        </button>
      </div>
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
        class="px-2.5 py-1 rounded-full bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
      >
        <Grid3X3 class="w-3 h-3" /> Buka Rak
      </button>
    </div>

    <!-- Google Maps Turn-by-Turn Vertical Timeline -->
    <div class="flex-1 overflow-y-auto p-3">
      <div class="relative space-y-1">
        <div
          v-for="(step, idx) in store.activeRoute.value.steps"
          :key="idx"
          @click="store.selectFloor(step.floorId)"
          class="relative pl-7 pr-2 py-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <div
            v-if="idx < store.activeRoute.value.steps.length - 1"
            class="absolute left-[13px] top-6 bottom-[-6px] w-0.5 bg-slate-200"
          />
          <span
            class="absolute left-1.5 top-2.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
            :class="
              step.type === 'start'
                ? 'bg-[#1a73e8] text-white'
                : step.type === 'portal'
                  ? 'bg-indigo-600 text-white'
                  : step.type === 'arrive'
                    ? 'bg-[#ea4335] text-white'
                    : 'bg-slate-200 text-slate-700'
            "
          >
            <Play v-if="step.type === 'start'" class="w-2 h-2 fill-current" />
            <MapPin v-else-if="step.type === 'arrive'" class="w-2.5 h-2.5" />
            <span v-else>{{ idx + 1 }}</span>
          </span>
          <span class="text-[11px] text-slate-700 leading-snug block">{{ step.text }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
