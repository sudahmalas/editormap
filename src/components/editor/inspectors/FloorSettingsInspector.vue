<script setup>
import { ImagePlus, Plus } from 'lucide-vue-next'
import { ref } from 'vue'

const props = defineProps({
  store: { type: Object, required: true },
  floor: { type: Object, required: true }
})

const blueprintInputRef = ref(null)
const showAddFloor = ref(false)
const newFloorName = ref('')

const handleBlueprintUpload = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => props.store.updateBlueprint(reader.result)
  reader.readAsDataURL(file)
  e.target.value = ''
}

const submitAddFloor = () => {
  if (!newFloorName.value.trim() || !props.store.activeBuilding.value) return
  props.store.addFloor(props.store.activeBuilding.value.id, newFloorName.value.trim())
  newFloorName.value = ''
  showAddFloor.value = false
}
</script>

<template>
  <div class="space-y-3.5">
    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="text-[10px] font-bold uppercase text-slate-400">Artboard Lantai</label>
        <button
          type="button"
          @click="showAddFloor = !showAddFloor"
          class="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
        >
          <Plus class="w-3 h-3" /> Tambah Lantai
        </button>
      </div>

      <div v-if="showAddFloor" class="p-2.5 mb-2 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
        <input
          v-model="newFloorName"
          type="text"
          placeholder="Nama Lantai baru..."
          class="w-full text-xs px-2 py-1 bg-white border border-blue-200 rounded-lg"
        />
        <div class="flex gap-1">
          <button type="button" @click="submitAddFloor" class="flex-1 text-[11px] font-semibold bg-blue-600 text-white rounded-lg py-1 cursor-pointer">
            Buat
          </button>
          <button type="button" @click="showAddFloor = false" class="px-2 text-[11px] text-slate-500 cursor-pointer">
            Batal
          </button>
        </div>
      </div>

      <input v-model="floor.nama_lantai" type="text" class="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 mb-2" />
      <div class="grid grid-cols-2 gap-1.5">
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">W</span>
          <input v-model.number="floor.width" type="number" step="50" min="400" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
        <label class="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg px-2 py-1 text-[11px]">
          <span class="text-slate-400 w-4 font-mono">H</span>
          <input v-model.number="floor.height" type="number" step="50" min="400" class="w-full bg-transparent text-right font-mono focus:outline-none" />
        </label>
      </div>
    </div>

    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
      <div class="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
        <ImagePlus class="w-3.5 h-3.5 text-blue-600" />
        Blueprint Denah Gedung
      </div>
      <input ref="blueprintInputRef" type="file" accept="image/*,.svg" class="hidden" @change="handleBlueprintUpload" />
      <div class="flex gap-1.5">
        <button
          type="button"
          @click="blueprintInputRef?.click()"
          class="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          Upload PNG / SVG
        </button>
        <button
          v-if="floor.image_url"
          type="button"
          @click="store.updateBlueprint(null)"
          class="px-2 py-1.5 rounded-lg bg-white border border-rose-200 text-[11px] text-rose-600 hover:bg-rose-50 cursor-pointer"
        >
          Hapus
        </button>
      </div>
      <div v-if="floor.image_url">
        <div class="flex justify-between text-[10px] text-slate-500">
          <span>Opacity</span>
          <span>{{ Math.round((floor.image_opacity ?? 0.35) * 100) }}%</span>
        </div>
        <input v-model.number="floor.image_opacity" type="range" min="0.1" max="0.9" step="0.05" class="w-full" />
      </div>
    </div>
  </div>
</template>
