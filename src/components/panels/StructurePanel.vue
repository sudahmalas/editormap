<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import PanelSection from '@/components/ui/PanelSection.vue'
import FieldRow from '@/components/ui/FieldRow.vue'

const editor = useEditorStore()
const expanded = ref<Record<string, boolean>>({})
const buildingFormOpen = ref(false)
const newBuildingName = ref('')
const newBuildingCode = ref('')
const floorFormOpen = ref(false)
const newFloorName = ref('')
const newFloorCode = ref('')
const newFloorLevel = ref(1)
const pendingBuildingId = ref<string | null>(null)

const buildings = computed(() => editor.doc.buildings)

function isExpanded(id: string): boolean {
  return expanded.value[id] !== false
}

function toggle(id: string) {
  expanded.value[id] = !isExpanded(id)
}

function selectFloor(id: string) {
  editor.setActiveFloor(id)
}

function addBuilding() {
  const name = newBuildingName.value.trim()
  const code = newBuildingCode.value.trim().toUpperCase()
  if (!name || !code) return
  editor.addBuilding(name, code)
  newBuildingName.value = ''
  newBuildingCode.value = ''
  buildingFormOpen.value = false
}

function openFloorForm(buildingId: string) {
  const building = buildings.value.find((b) => b.id === buildingId)
  const maxLevel = building ? Math.max(...building.floors.map((f) => f.level), 0) : 0
  pendingBuildingId.value = buildingId
  newFloorLevel.value = maxLevel + 1
  newFloorName.value = `Lantai ${maxLevel + 1}`
  newFloorCode.value = `${building?.code ?? 'GD'}-L${maxLevel + 1}`
  floorFormOpen.value = true
}

function addFloor() {
  const name = newFloorName.value.trim()
  const code = newFloorCode.value.trim().toUpperCase()
  if (!name || !code || !pendingBuildingId.value) return
  editor.addFloor(pendingBuildingId.value, name, code, newFloorLevel.value)
  floorFormOpen.value = false
}

function deleteFloor(floorId: string) {
  const building = buildings.value.find((b) => b.floors.some((f) => f.id === floorId))
  if (!building || building.floors.length <= 1) return
  if (!window.confirm('Hapus lantai ini beserta seluruh isinya?')) return
  editor.removeFloor(floorId)
}

function deleteBuilding(buildingId: string) {
  if (buildings.value.length <= 1) return
  if (!window.confirm('Hapus gedung ini beserta seluruh lantainya?')) return
  editor.removeBuilding(buildingId)
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-y-auto p-2">
    <PanelSection title="Gedung & Lantai">
      <template #actions>
        <button
          class="rounded-sm border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          @click="buildingFormOpen = !buildingFormOpen"
        >
          + Gedung
        </button>
      </template>

      <div v-if="buildingFormOpen" class="mb-2 space-y-1.5 rounded-sm border border-slate-200 bg-slate-50 p-2">
        <FieldRow label="Nama Gedung">
          <input
            id="building-name"
            v-model="newBuildingName"
            name="building-name"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            placeholder="Gedung A"
          />
        </FieldRow>
        <FieldRow label="Kode">
          <input
            id="building-code"
            v-model="newBuildingCode"
            name="building-code"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs uppercase outline-none focus:border-[#3db6bc]"
            placeholder="GA"
          />
        </FieldRow>
        <button
          class="w-full rounded-sm bg-[#3db6bc] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#349fa4]"
          @click="addBuilding"
        >
          Simpan Gedung
        </button>
      </div>

      <div class="space-y-1.5">
        <div
          v-for="building in buildings"
          :key="building.id"
          class="rounded-sm border border-slate-200"
        >
          <div class="flex items-center gap-1 px-1.5 py-1.5">
            <button class="text-[10px] text-slate-400" @click="toggle(building.id)">
              {{ isExpanded(building.id) ? '▾' : '▸' }}
            </button>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-black text-slate-900">{{ building.name }}</p>
              <p class="text-[10px] font-semibold text-slate-400">
                {{ building.code }} · {{ building.floors.length }} lantai
              </p>
            </div>
            <button
              class="rounded-sm border border-slate-200 px-1 py-0.5 text-[10px] font-bold text-slate-500 hover:bg-slate-50"
              @click="openFloorForm(building.id)"
            >
              +
            </button>
            <button
              v-if="buildings.length > 1"
              class="rounded-sm px-1 py-0.5 text-[10px] font-bold text-rose-500 hover:bg-rose-50"
              @click="deleteBuilding(building.id)"
            >
              ×
            </button>
          </div>

          <div v-if="isExpanded(building.id)" class="space-y-0.5 px-1.5 pb-1.5">
            <div
              v-for="floor in building.floors"
              :key="floor.id"
              class="group flex cursor-pointer items-center gap-1.5 rounded-sm border px-1.5 py-1 transition-colors"
              :class="
                floor.id === editor.activeFloorId
                  ? 'border-[#3db6bc] bg-teal-50/60'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
              "
              @click="selectFloor(floor.id)"
            >
              <span
                class="flex h-4 w-4 items-center justify-center rounded-sm text-[9px] font-black"
                :class="
                  floor.id === editor.activeFloorId
                    ? 'bg-[#3db6bc] text-white'
                    : 'bg-slate-100 text-slate-500'
                "
              >
                {{ floor.level }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-[11px] font-bold text-slate-800">{{ floor.name }}</p>
                <p class="text-[9px] font-semibold text-slate-400">
                  {{ floor.nodes.length }} titik · {{ floor.rooms.length }} ruang
                </p>
              </div>
              <button
                v-if="building.floors.length > 1"
                class="hidden rounded-sm px-1 text-[10px] font-bold text-rose-500 group-hover:block hover:bg-rose-50"
                @click.stop="deleteFloor(floor.id)"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      </div>
    </PanelSection>

    <PanelSection v-if="floorFormOpen" title="Lantai Baru">
      <div class="space-y-1.5">
        <FieldRow label="Nama Lantai">
          <input
            id="floor-name"
            v-model="newFloorName"
            name="floor-name"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
          />
        </FieldRow>
        <div class="grid grid-cols-2 gap-1.5">
          <FieldRow label="Kode">
            <input
              id="floor-code"
              v-model="newFloorCode"
              name="floor-code"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs uppercase outline-none focus:border-[#3db6bc]"
            />
          </FieldRow>
          <FieldRow label="Level">
            <input
              id="floor-level"
              v-model.number="newFloorLevel"
              name="floor-level"
              type="number"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            />
          </FieldRow>
        </div>
        <div class="flex gap-1.5">
          <button
            class="flex-1 rounded-sm bg-[#3db6bc] px-2 py-1 text-[11px] font-bold text-white hover:bg-[#349fa4]"
            @click="addFloor"
          >
            Simpan
          </button>
          <button
            class="rounded-sm border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            @click="floorFormOpen = false"
          >
            Batal
          </button>
        </div>
      </div>
    </PanelSection>

    <PanelSection title="Properti Lantai">
      <div v-if="editor.activeFloor" class="space-y-1.5">
        <FieldRow label="Nama">
          <input
            id="active-floor-name"
            name="active-floor-name"
            :value="editor.activeFloor.name"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updateFloor(editor.activeFloorId, {
                name: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </FieldRow>
        <div class="grid grid-cols-2 gap-1.5">
          <FieldRow label="Kode">
            <input
              id="active-floor-code"
              name="active-floor-code"
              :value="editor.activeFloor.code"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs uppercase outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateFloor(editor.activeFloorId, {
                  code: ($event.target as HTMLInputElement).value.toUpperCase(),
                })
              "
            />
          </FieldRow>
          <FieldRow label="Level">
            <input
              id="active-floor-level"
              name="active-floor-level"
              :value="editor.activeFloor.level"
              type="number"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateFloor(editor.activeFloorId, {
                  level: Number(($event.target as HTMLInputElement).value),
                })
              "
            />
          </FieldRow>
        </div>
        <div class="grid grid-cols-2 gap-1.5">
          <FieldRow label="Lebar (px)">
            <input
              id="active-floor-width"
              name="active-floor-width"
              :value="editor.activeFloor.size.width"
              type="number"
              min="200"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateFloorSize(
                  Number(($event.target as HTMLInputElement).value),
                  editor.activeFloor!.size.height,
                )
              "
            />
          </FieldRow>
          <FieldRow label="Tinggi (px)">
            <input
              id="active-floor-height"
              name="active-floor-height"
              :value="editor.activeFloor.size.height"
              type="number"
              min="200"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateFloorSize(
                  editor.activeFloor!.size.width,
                  Number(($event.target as HTMLInputElement).value),
                )
              "
            />
          </FieldRow>
        </div>
        <FieldRow label="Skala (px per meter)" hint="Dipakai untuk menghitung luas ruangan dan panjang rute.">
          <input
            id="active-floor-ppm"
            name="active-floor-ppm"
            :value="editor.activeFloor.pixelsPerMeter"
            type="number"
            min="1"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.mutate(() => {
                const floor = editor.activeFloor
                if (floor) floor.pixelsPerMeter = Number(($event.target as HTMLInputElement).value) || 20
              })
            "
          />
        </FieldRow>
      </div>
    </PanelSection>
  </div>
</template>
