<script setup>
import { CheckCircle2, Compass, Navigation, Package, Truck } from 'lucide-vue-next'
import { computed } from 'vue'
import FloorCanvas from '../components/canvas/FloorCanvas.vue'
import RouteStepsCard from '../components/wayfinding/RouteStepsCard.vue'

const props = defineProps({
  store: { type: Object, required: true }
})

const activeTask = computed(
  () => props.store.campus.porterTasks?.find((t) => t.id === props.store.activePorterTaskId.value) || null
)

const selectAndRouteTask = (task) => {
  props.store.routingProfile.value = task.routeMode || (task.judul.toLowerCase().includes('steril') ? 'steril' : 'umum')
  props.store.runPorterTaskRoute(task)
}

const switchRouteMode = (mode) => {
  props.store.routingProfile.value = mode
  if (activeTask.value) props.store.runPorterTaskRoute(activeTask.value)
}
</script>

<template>
  <div class="flex-1 relative flex min-h-0 overflow-hidden">
    <FloorCanvas :store="store" :read-only="true" :viewport-inset="{ left: 376, right: 0 }" />

    <aside class="absolute top-3 left-3 bottom-12 w-[360px] max-w-[calc(100vw-1.5rem)] z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 flex flex-col overflow-hidden">
      <div class="p-3.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/90 to-teal-50/90 space-y-2.5">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Truck class="w-5 h-5" />
          </div>
          <div>
            <h2 class="text-xs font-bold text-slate-900">Portal Distribusi &amp; Porter RS</h2>
            <p class="text-[10px] text-slate-600">Pilih Rute Umum atau Rute Steril</p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-1 bg-white/80 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            @click="switchRouteMode('umum')"
            class="py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
            :class="store.routingProfile.value !== 'steril' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Rute Umum
          </button>
          <button
            type="button"
            @click="switchRouteMode('steril')"
            class="py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
            :class="store.routingProfile.value === 'steril' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Rute Steril
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-2.5 space-y-2">
        <div
          v-for="task in store.campus.porterTasks"
          :key="task.id"
          @click="selectAndRouteTask(task)"
          class="p-3 rounded-xl border transition-all cursor-pointer space-y-2"
          :class="
            store.activePorterTaskId.value === task.id && store.activeRoute.value
              ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
              : 'border-slate-200 bg-white hover:border-emerald-300'
          "
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-mono font-bold text-slate-500">{{ task.kode }}</span>
            <div class="flex items-center gap-1">
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" :class="task.routeMode === 'steril' ? 'bg-teal-100 text-teal-800' : 'bg-sky-100 text-sky-800'">
                {{ task.routeMode === 'steril' ? 'Rute Steril' : 'Rute Umum' }}
              </span>
              <span
                class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase"
                :class="task.urgensi === 'cito' ? 'bg-rose-100 text-rose-700' : task.urgensi === 'tinggi' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'"
              >
                {{ task.urgensi }}
              </span>
            </div>
          </div>

          <div class="text-xs font-bold text-slate-900">{{ task.judul }}</div>

          <div class="text-[11px] bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-1">
            <div class="flex items-start gap-2">
              <span class="w-2 h-2 rounded-full bg-teal-500 mt-1 shrink-0" />
              <div>
                <span class="text-[9px] text-slate-400 block">Ambil dari:</span>
                <strong class="text-slate-800">{{ task.asal.label }}</strong>
              </div>
            </div>
            <div class="flex items-start gap-2">
              <span class="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
              <div>
                <span class="text-[9px] text-slate-400 block">Antar ke:</span>
                <strong class="text-slate-800">{{ task.tujuan.label }}</strong>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-1">
            <span v-for="(it, idx) in task.items" :key="idx" class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-md text-slate-700">
              <Package class="w-3 h-3 text-teal-600" />
              {{ it.nama }} ({{ it.qty }} {{ it.satuan }})
            </span>
          </div>

          <div class="flex gap-1.5 pt-0.5">
            <button type="button" @click.stop="selectAndRouteTask(task)" class="flex-1 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer">
              <Compass class="w-3.5 h-3.5" /> Rute
            </button>
            <button
              v-if="task.status === 'Siap Diantar'"
              type="button"
              @click.stop="store.advancePorterTaskStatus(task.id, 'Dalam Pengantaran'); selectAndRouteTask(task)"
              class="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Navigation class="w-3.5 h-3.5" /> Mulai Antar
            </button>
            <button
              v-else-if="task.status === 'Dalam Pengantaran'"
              type="button"
              @click.stop="store.advancePorterTaskStatus(task.id, 'Selesai')"
              class="flex-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <CheckCircle2 class="w-3.5 h-3.5" /> Tiba / Selesai
            </button>
          </div>
        </div>
      </div>
    </aside>

    <RouteStepsCard :store="store" title-prefix="Rute Pengantaran" />
  </div>
</template>
