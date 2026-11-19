<script setup>
import { Check, GitBranch, Image as ImageIcon, Magnet, Ruler, SlidersHorizontal, X } from 'lucide-vue-next'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  store: { type: Object, required: true }
})

const floor = computed(() => props.store.activeFloor.value)
const scalePresets = [10, 15, 20, 30, 40]
const gridSizes = [10, 20, 50]

const draftPpm = ref(20)
const draftSnapToGrid = ref(true)
const draftGridSize = ref(20)
const draftShowGraph = ref(true)
const draftShowBlueprint = ref(true)

watch(
  () => [props.store.showMapSettingsModal.value, floor.value?.id],
  ([open]) => {
    if (!open) return
    draftPpm.value = Number(floor.value?.pixelsPerMeter) || 20
    draftSnapToGrid.value = Boolean(props.store.snapToGrid.value)
    draftGridSize.value = Number(props.store.gridSize.value) || 20
    draftShowGraph.value = Boolean(props.store.showCorridorGraph.value)
    draftShowBlueprint.value = Boolean(props.store.showBlueprint.value)
  },
  { immediate: true }
)

const metersPerMajorGrid = computed(() => {
  const ppm = Math.max(1, Number(draftPpm.value) || 20)
  return (100 / ppm).toFixed(1)
})

const closeModal = () => {
  props.store.showMapSettingsModal.value = false
}

const applySettings = () => {
  if (floor.value) {
    const clampedPpm = Math.min(100, Math.max(5, Math.round(Number(draftPpm.value) || 20)))
    if (floor.value.pixelsPerMeter !== clampedPpm) {
      props.store.pushSnapshot()
      floor.value.pixelsPerMeter = clampedPpm
    }
  }
  props.store.snapToGrid.value = draftSnapToGrid.value
  props.store.gridSize.value = draftGridSize.value
  props.store.showCorridorGraph.value = draftShowGraph.value
  props.store.showBlueprint.value = draftShowBlueprint.value
  closeModal()
}

const onKeyDown = (e) => {
  if (e.key === 'Escape' && props.store.showMapSettingsModal.value) {
    closeModal()
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.showMapSettingsModal.value"
      @mousedown.self="closeModal"
      class="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div class="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <!-- Modal Header -->
        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-blue-50 text-[#1a73e8] flex items-center justify-center shrink-0">
              <SlidersHorizontal class="w-4.5 h-4.5" />
            </div>
            <div class="min-w-0">
              <h3 class="text-sm font-bold text-slate-900">Setting Editor Peta</h3>
              <p class="text-[11px] text-slate-500 truncate">
                {{ floor ? floor.nama_lantai : 'Pengaturan Skala, Grid Snap & Layer' }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="closeModal"
            title="Tutup modal (Esc)"
            class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <!-- 1. Kalibrasi Skala -->
          <div v-if="floor" class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <Ruler class="w-4 h-4 text-teal-600 shrink-0" />
                <div>
                  <div class="text-xs font-bold text-slate-800">Kalibrasi Skala</div>
                  <div class="text-[10px] text-slate-500">Atur rasio jarak pada lantai aktif</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <input
                  v-model.number="draftPpm"
                  type="number"
                  min="5"
                  max="100"
                  class="w-18 text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white font-mono text-right focus:outline-none focus:ring-2 focus:ring-teal-500/25 focus:border-teal-500"
                />
                <span class="text-[11px] font-medium text-slate-600">px = 1 m</span>
              </div>
            </div>

            <input
              v-model.number="draftPpm"
              type="range"
              min="5"
              max="100"
              step="1"
              class="w-full accent-teal-600 cursor-pointer"
            />

            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-1.5 flex-wrap">
                <button
                  v-for="p in scalePresets"
                  :key="p"
                  type="button"
                  @click="draftPpm = p"
                  class="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border cursor-pointer transition-colors"
                  :class="
                    Number(draftPpm) === p
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  "
                >
                  {{ p }} px/m
                </button>
              </div>
              <span class="text-[10px] text-teal-700 font-mono font-semibold">
                100 px ≈ {{ metersPerMajorGrid }} m
              </span>
            </div>
          </div>

          <!-- 2. Snap ke Grid & Ukuran -->
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <button
              type="button"
              @click="draftSnapToGrid = !draftSnapToGrid"
              class="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
            >
              <div class="flex items-center gap-2">
                <Magnet class="w-4 h-4 text-[#1a73e8] shrink-0" />
                <div>
                  <div class="text-xs font-bold text-slate-800">Snap ke Grid &amp; Smart Guides</div>
                  <div class="text-[10px] text-slate-500">Kunci pergerakan elemen ke titik grid &amp; garis sejajar</div>
                </div>
              </div>
              <span
                class="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center"
                :class="draftSnapToGrid ? 'bg-[#1a73e8] justify-end' : 'bg-slate-300 justify-start'"
              >
                <span class="w-4 h-4 rounded-full bg-white shadow-xs" />
              </span>
            </button>

            <div v-if="draftSnapToGrid" class="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
              <span class="text-[11px] font-medium text-slate-600">Ukuran Kotak Grid</span>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="sz in gridSizes"
                  :key="sz"
                  type="button"
                  @click="draftGridSize = sz"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border cursor-pointer transition-colors"
                  :class="
                    draftGridSize === sz
                      ? 'bg-[#1a73e8] text-white border-[#1a73e8]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  "
                >
                  {{ sz }}px
                </button>
              </div>
            </div>
          </div>

          <!-- 3. Tampilan Layer Peta -->
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tampilan Layer Peta</div>

            <button
              type="button"
              @click="draftShowGraph = !draftShowGraph"
              class="w-full flex items-center justify-between gap-3 py-1 text-left cursor-pointer"
            >
              <span class="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <GitBranch class="w-4 h-4 text-indigo-600" /> Layer Jalur Rute
              </span>
              <span
                class="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center"
                :class="draftShowGraph ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'"
              >
                <span class="w-4 h-4 rounded-full bg-white shadow-xs" />
              </span>
            </button>

            <button
              type="button"
              @click="draftShowBlueprint = !draftShowBlueprint"
              class="w-full flex items-center justify-between gap-3 py-1 text-left cursor-pointer"
            >
              <span class="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <ImageIcon class="w-4 h-4 text-amber-600" /> Gambar Blueprint Denah
              </span>
              <span
                class="w-9 h-5 rounded-full p-0.5 transition-colors shrink-0 flex items-center"
                :class="draftShowBlueprint ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'"
              >
                <span class="w-4 h-4 rounded-full bg-white shadow-xs" />
              </span>
            </button>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            @click="closeModal"
            class="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-600 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            @click="applySettings"
            class="px-4 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Check class="w-3.5 h-3.5" /> Simpan Pengaturan
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
