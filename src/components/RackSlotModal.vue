<script setup>
import { Archive, MapPin, Plus, ShieldCheck, Trash2, X } from 'lucide-vue-next'
import { computed, reactive, ref, watch } from 'vue'

const props = defineProps({
  store: { type: Object, required: true }
})

const target = computed(() => props.store.rackModalTarget.value)
const selectedCell = ref({ row: 1, col: 1 })

const slotForm = reactive({
  kodeBarang: '',
  namaBarang: '',
  satuan: 'Box',
  qty: 10,
  batchNo: '',
  expiredAt: '',
  isSteril: true
})

const currentSlotItem = computed(() => {
  if (!target.value) return null
  return (
    target.value.rack.slots.find(
      (s) => s.row === selectedCell.value.row && s.col === selectedCell.value.col
    ) || null
  )
})

watch(
  [target, selectedCell],
  () => {
    const hl = props.store.highlightedSlot.value
    if (target.value && hl && hl.rackId === target.value.rack.id && selectedCell.value.row === 1 && selectedCell.value.col === 1) {
      // keep user click if changed, otherwise highlight
    }
    const existing = currentSlotItem.value
    if (existing) {
      slotForm.kodeBarang = existing.kodeBarang || ''
      slotForm.namaBarang = existing.namaBarang || ''
      slotForm.satuan = existing.satuan || 'Box'
      slotForm.qty = existing.qty ?? 0
      slotForm.batchNo = existing.batchNo || ''
      slotForm.expiredAt = existing.expiredAt || ''
      slotForm.isSteril = Boolean(existing.isSteril)
    } else {
      slotForm.kodeBarang = ''
      slotForm.namaBarang = ''
      slotForm.satuan = 'Box'
      slotForm.qty = 10
      slotForm.batchNo = ''
      slotForm.expiredAt = ''
      slotForm.isSteril = true
    }
  },
  { immediate: true }
)

const selectCell = (r, c) => {
  selectedCell.value = { row: r, col: c }
}

const getSlotAt = (r, c) => {
  if (!target.value) return null
  return target.value.rack.slots.find((s) => s.row === r && s.col === c) || null
}

const saveSlot = () => {
  if (!target.value || !slotForm.namaBarang.trim()) return
  props.store.pushSnapshot()
  const rack = target.value.rack
  const idx = rack.slots.findIndex(
    (s) => s.row === selectedCell.value.row && s.col === selectedCell.value.col
  )
  const entry = {
    row: selectedCell.value.row,
    col: selectedCell.value.col,
    assetId: idx >= 0 ? rack.slots[idx].assetId : Date.now(),
    kodeBarang: slotForm.kodeBarang.trim() || `ITM-${Date.now().toString().slice(-4)}`,
    namaBarang: slotForm.namaBarang.trim(),
    satuan: slotForm.satuan || 'Box',
    qty: Number(slotForm.qty) || 0,
    batchNo: slotForm.batchNo.trim(),
    expiredAt: slotForm.expiredAt,
    isSteril: Boolean(slotForm.isSteril)
  }
  if (idx >= 0) {
    rack.slots[idx] = entry
  } else {
    rack.slots.push(entry)
  }
}

const clearSlot = () => {
  if (!target.value) return
  props.store.pushSnapshot()
  target.value.rack.slots = target.value.rack.slots.filter(
    (s) => !(s.row === selectedCell.value.row && s.col === selectedCell.value.col)
  )
}
</script>

<template>
  <div
    v-if="target"
    class="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-4"
    @click.self="store.rackModalTargetId.value = null"
  >
    <div class="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
      <!-- Header -->
      <div class="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center">
            <Archive class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-900">{{ target.rack.nama }}</h3>
            <p class="text-[11px] text-slate-500 flex items-center gap-1">
              <MapPin class="w-3 h-3 text-teal-600" />
              {{ target.building.nama }} → {{ target.floor.nama_lantai }} →
              <strong>{{ target.room?.nama || 'Tanpa Ruangan' }}</strong>
            </p>
          </div>
        </div>
        <button
          type="button"
          @click="store.rackModalTargetId.value = null"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 grid grid-cols-1 md:grid-cols-12 gap-5 overflow-y-auto">
        <!-- Shelf Visual Grid -->
        <div class="md:col-span-7 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700">
              Visual Rak (`rack_map`: {{ target.rack.rows }} Baris × {{ target.rack.cols }} Kolom)
            </span>
            <span class="text-[10px] text-slate-400">Klik sel untuk pilih/isi barang</span>
          </div>

          <div class="p-3 bg-slate-100 rounded-xl border border-slate-200 space-y-2">
            <div
              v-for="r in target.rack.rows"
              :key="r"
              class="grid gap-2"
              :style="{ gridTemplateColumns: `repeat(${target.rack.cols}, minmax(0, 1fr))` }"
            >
              <button
                v-for="c in target.rack.cols"
                :key="`${r}-${c}`"
                type="button"
                @click="selectCell(r, c)"
                class="p-2 rounded-lg border text-left transition-all cursor-pointer min-h-[76px] flex flex-col justify-between relative"
                :class="[
                  selectedCell.row === r && selectedCell.col === c
                    ? 'ring-2 ring-sky-500 border-sky-500 bg-white shadow-xs'
                    : getSlotAt(r, c)
                      ? 'bg-white border-teal-200 hover:border-teal-400'
                      : 'bg-slate-50/70 border-dashed border-slate-300 hover:bg-white',
                  store.highlightedSlot.value?.rackId === target.rack.id &&
                  store.highlightedSlot.value?.row === r &&
                  store.highlightedSlot.value?.col === c
                    ? 'ring-2 ring-rose-500 bg-rose-50/50'
                    : ''
                ]"
              >
                <div class="flex items-center justify-between w-full">
                  <span class="text-[9px] font-mono font-bold text-slate-400">B{{ r }}·K{{ c }}</span>
                  <ShieldCheck
                    v-if="getSlotAt(r, c)?.isSteril"
                    class="w-3 h-3 text-teal-600"
                    title="Item Steril"
                  />
                </div>
                <template v-if="getSlotAt(r, c)">
                  <div class="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                    {{ getSlotAt(r, c).namaBarang }}
                  </div>
                  <div class="text-[10px] font-semibold text-teal-700">
                    {{ getSlotAt(r, c).qty }} {{ getSlotAt(r, c).satuan }}
                  </div>
                </template>
                <div v-else class="text-[10px] text-slate-400 italic">Kosong</div>
              </button>
            </div>
          </div>
        </div>

        <!-- Slot Item Editor -->
        <div class="md:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800">
              Isi Slot Baris {{ selectedCell.row }}, Kolom {{ selectedCell.col }}
            </span>
            <button
              v-if="currentSlotItem"
              type="button"
              @click="clearSlot"
              class="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 class="w-3 h-3" /> Kosongkan
            </button>
          </div>

          <div class="space-y-2.5">
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Nama Barang / Alat</label>
              <input
                v-model="slotForm.namaBarang"
                type="text"
                placeholder="Mis. Kasa Steril 10x10 cm"
                class="w-full text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Kode Barang</label>
                <input
                  v-model="slotForm.kodeBarang"
                  type="text"
                  placeholder="BHP-001"
                  class="w-full text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Batch</label>
                <input
                  v-model="slotForm.batchNo"
                  type="text"
                  placeholder="BTH-2611"
                  class="w-full text-xs font-mono bg-white border border-slate-200 rounded px-2 py-1.5"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Jumlah Stok</label>
                <input
                  v-model.number="slotForm.qty"
                  type="number"
                  min="0"
                  class="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Satuan</label>
                <input
                  v-model="slotForm.satuan"
                  type="text"
                  class="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
                />
              </div>
            </div>
            <div>
              <label class="block text-[11px] font-semibold text-slate-600 mb-1">Kadaluarsa (FEFO)</label>
              <input
                v-model="slotForm.expiredAt"
                type="date"
                class="w-full text-xs bg-white border border-slate-200 rounded px-2 py-1.5"
              />
            </div>
            <label class="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input type="checkbox" v-model="slotForm.isSteril" />
              <span>Item / Paket Steril (CSSD)</span>
            </label>
          </div>

          <button
            type="button"
            @click="saveSlot"
            class="w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus class="w-3.5 h-3.5" />
            Simpan ke Slot Rak
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
