<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { nearestNode } from '@/core/routing'
import { polygonArea } from '@/core/geometry'
import { NAV_NODE_LABEL, ROOM_CATEGORY_LABEL, WALL_KIND_LABEL } from '@/types/map'
import type { NavNodeType, RoomCategory, WallKind } from '@/types/map'
import PanelSection from '@/components/ui/PanelSection.vue'
import FieldRow from '@/components/ui/FieldRow.vue'

const editor = useEditorStore()
const imageInput = ref<HTMLInputElement | null>(null)

const floor = computed(() => editor.activeFloor)
const selection = computed(() => editor.selection)

const roomCategories = Object.keys(ROOM_CATEGORY_LABEL) as RoomCategory[]
const nodeTypes = Object.keys(NAV_NODE_LABEL) as NavNodeType[]
const wallKinds = Object.keys(WALL_KIND_LABEL) as WallKind[]

const roomArea = computed(() => {
  if (!editor.selectedRoom || !floor.value) return 0
  return polygonArea(editor.selectedRoom.polygon) / floor.value.pixelsPerMeter ** 2
})

function onPickImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const src = String(reader.result)
    const img = new Image()
    img.onload = () => {
      editor.setBackground(src, img.width, img.height)
    }
    img.src = src
  }
  reader.readAsDataURL(file)
  input.value = ''
}

function attachPinToNearestNode() {
  const pin = editor.selectedPin
  if (!pin || !floor.value) return
  const nearest = nearestNode(floor.value.nodes, pin.position.x, pin.position.y)
  if (!nearest) return
  editor.mutate(() => {
    const target = editor.activeFloor?.pins.find((p) => p.id === pin.id)
    if (!target) return
    target.nodeId = nearest.id
    target.position = { ...nearest.position }
    const activeFloor = editor.activeFloor
    if (!activeFloor) return
    activeFloor.edges = activeFloor.edges.filter((e) => e.from !== pin.id && e.to !== pin.id)
    activeFloor.edges.push({ id: `eg_${pin.id}_${nearest.id}`, from: pin.id, to: nearest.id })
  })
}

function numeric(target: EventTarget | null): number {
  return Number((target as HTMLInputElement).value) || 0
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-y-auto p-2">
    <PanelSection title="Latar Denah">
      <div class="space-y-1.5">
        <div v-if="floor?.background" class="flex items-center gap-2">
          <img
            :src="floor.background.src"
            alt="Latar denah"
            class="h-12 w-16 rounded-sm border border-slate-200 object-cover"
          />
          <div class="min-w-0 flex-1">
            <p class="text-[10px] font-bold text-slate-700">
              {{ floor.background.width }} × {{ floor.background.height }} px
            </p>
            <button
              class="mt-0.5 text-[10px] font-bold text-rose-500 hover:underline"
              @click="editor.removeBackground()"
            >
              Hapus latar
            </button>
          </div>
        </div>
        <button
          class="w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:border-[#3db6bc] hover:text-[#2b8b90]"
          @click="imageInput?.click()"
        >
          {{ floor?.background ? 'Ganti gambar denah' : 'Unggah gambar denah' }}
        </button>
        <div
          v-if="floor?.background"
          class="flex items-center gap-2 rounded-sm border border-slate-200 px-2 py-1"
        >
          <span class="text-[10px] font-bold text-slate-500">Opasitas</span>
          <input
            id="background-opacity"
            name="background-opacity"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            :value="floor.background.opacity"
            class="flex-1 accent-[#3db6bc]"
            @input="editor.updateBackground({ opacity: Number(($event.target as HTMLInputElement).value) })"
          />
        </div>
        <input ref="imageInput" id="background-image" name="background-image" type="file" accept="image/*" class="hidden" @change="onPickImage" />
      </div>
    </PanelSection>

    <PanelSection v-if="!selection" title="Inspector">
      <p class="text-[11px] leading-relaxed text-slate-500">
        Tidak ada objek terpilih. Gunakan alat di toolbar untuk menambah titik jalur, dinding,
        ruangan, atau lokasi.
      </p>
      <dl class="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
        <div class="rounded-sm border border-slate-200 px-1.5 py-1">
          <dt class="text-slate-400">Titik jalur</dt>
          <dd class="text-sm font-black text-slate-800">{{ floor?.nodes.length ?? 0 }}</dd>
        </div>
        <div class="rounded-sm border border-slate-200 px-1.5 py-1">
          <dt class="text-slate-400">Jalur</dt>
          <dd class="text-sm font-black text-slate-800">{{ floor?.edges.length ?? 0 }}</dd>
        </div>
        <div class="rounded-sm border border-slate-200 px-1.5 py-1">
          <dt class="text-slate-400">Ruangan</dt>
          <dd class="text-sm font-black text-slate-800">{{ floor?.rooms.length ?? 0 }}</dd>
        </div>
        <div class="rounded-sm border border-slate-200 px-1.5 py-1">
          <dt class="text-slate-400">Lokasi</dt>
          <dd class="text-sm font-black text-slate-800">{{ floor?.pins.length ?? 0 }}</dd>
        </div>
      </dl>
    </PanelSection>

    <PanelSection v-if="editor.selectedNode" title="Titik Jalur">
      <div class="space-y-1.5">
        <FieldRow label="Tipe Titik">
          <select
            id="node-type"
            name="node-type"
            :value="editor.selectedNode.type"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updateNode(editor.selectedNode!.id, {
                type: ($event.target as HTMLSelectElement).value as NavNodeType,
              })
            "
          >
            <option v-for="type in nodeTypes" :key="type" :value="type">
              {{ NAV_NODE_LABEL[type] }}
            </option>
          </select>
        </FieldRow>
        <FieldRow label="Label">
          <input
            id="node-label"
            name="node-label"
            :value="editor.selectedNode.label"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            placeholder="mis. Koridor Depan IGD"
            @change="
              editor.updateNode(editor.selectedNode!.id, {
                label: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </FieldRow>
        <div class="grid grid-cols-2 gap-1.5">
          <FieldRow label="X">
            <input
              id="node-x"
              name="node-x"
              :value="Math.round(editor.selectedNode.position.x)"
              type="number"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateNode(editor.selectedNode!.id, {
                  position: {
                    x: numeric($event.target),
                    y: editor.selectedNode!.position.y,
                  },
                })
              "
            />
          </FieldRow>
          <FieldRow label="Y">
            <input
              id="node-y"
              name="node-y"
              :value="Math.round(editor.selectedNode.position.y)"
              type="number"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateNode(editor.selectedNode!.id, {
                  position: {
                    x: editor.selectedNode!.position.x,
                    y: numeric($event.target),
                  },
                })
              "
            />
          </FieldRow>
        </div>
        <button
          class="w-full rounded-sm border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
          @click="editor.removeSelection()"
        >
          Hapus Titik
        </button>
      </div>
    </PanelSection>

    <PanelSection v-if="editor.selectedPin" title="Lokasi / Unit">
      <div class="space-y-1.5">
        <FieldRow label="Nama Lokasi">
          <input
            id="pin-label"
            name="pin-label"
            :value="editor.selectedPin.label"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updatePin(editor.selectedPin!.id, {
                label: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </FieldRow>
        <FieldRow label="Kategori">
          <select
            id="pin-category"
            name="pin-category"
            :value="editor.selectedPin.category"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updatePin(editor.selectedPin!.id, {
                category: ($event.target as HTMLSelectElement).value as RoomCategory,
              })
            "
          >
            <option v-for="category in roomCategories" :key="category" :value="category">
              {{ ROOM_CATEGORY_LABEL[category] }}
            </option>
          </select>
        </FieldRow>
        <FieldRow label="Catatan">
          <textarea
            id="pin-note"
            name="pin-note"
            :value="editor.selectedPin.note"
            rows="2"
            class="w-full resize-none rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updatePin(editor.selectedPin!.id, {
                note: ($event.target as HTMLTextAreaElement).value,
              })
            "
          />
        </FieldRow>
        <div class="rounded-sm border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">
          Titik jalur:
          <span class="font-black text-slate-800">
            {{ editor.selectedPin.nodeId ? 'tersambung' : 'belum tersambung' }}
          </span>
        </div>
        <div class="flex gap-1.5">
          <button
            class="flex-1 rounded-sm border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            :disabled="(floor?.nodes.length ?? 0) === 0"
            @click="attachPinToNearestNode"
          >
            Tempel ke titik terdekat
          </button>
          <button
            class="rounded-sm border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
            @click="editor.removeSelection()"
          >
            Hapus
          </button>
        </div>
      </div>
    </PanelSection>

    <PanelSection v-if="editor.selectedRoom" title="Ruangan">
      <div class="space-y-1.5">
        <FieldRow label="Nama Ruangan">
          <input
            id="room-name"
            name="room-name"
            :value="editor.selectedRoom.name"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updateRoom(editor.selectedRoom!.id, {
                name: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </FieldRow>
        <div class="grid grid-cols-2 gap-1.5">
          <FieldRow label="Kode">
            <input
              id="room-code"
              name="room-code"
              :value="editor.selectedRoom.code"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs uppercase outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateRoom(editor.selectedRoom!.id, {
                  code: ($event.target as HTMLInputElement).value.toUpperCase(),
                })
              "
            />
          </FieldRow>
          <FieldRow label="Kategori">
            <select
              id="room-category"
              name="room-category"
              :value="editor.selectedRoom.category"
              class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
              @change="
                editor.updateRoom(editor.selectedRoom!.id, {
                  category: ($event.target as HTMLSelectElement).value as RoomCategory,
                })
              "
            >
              <option v-for="category in roomCategories" :key="category" :value="category">
                {{ ROOM_CATEGORY_LABEL[category] }}
              </option>
            </select>
          </FieldRow>
        </div>
        <FieldRow label="Catatan">
          <textarea
            id="room-note"
            name="room-note"
            :value="editor.selectedRoom.note"
            rows="2"
            class="w-full resize-none rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.updateRoom(editor.selectedRoom!.id, {
                note: ($event.target as HTMLTextAreaElement).value,
              })
            "
          />
        </FieldRow>
        <div class="rounded-sm border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500">
          Luas perkiraan: <span class="font-black text-slate-800">{{ roomArea.toFixed(1) }} m²</span>
        </div>
        <button
          class="w-full rounded-sm border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
          @click="editor.removeSelection()"
        >
          Hapus Ruangan
        </button>
      </div>
    </PanelSection>

    <PanelSection v-if="editor.selectedWall" title="Dinding">
      <div class="space-y-1.5">
        <FieldRow label="Jenis">
          <select
            id="wall-kind"
            name="wall-kind"
            :value="editor.selectedWall.kind"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.mutate(() => {
                const wall = editor.activeFloor?.walls.find((w) => w.id === editor.selectedWall!.id)
                if (wall) wall.kind = ($event.target as HTMLSelectElement).value as WallKind
              })
            "
          >
            <option v-for="kind in wallKinds" :key="kind" :value="kind">
              {{ WALL_KIND_LABEL[kind] }}
            </option>
          </select>
        </FieldRow>
        <FieldRow label="Ketebalan (px)">
          <input
            id="wall-thickness"
            name="wall-thickness"
            :value="editor.selectedWall.thickness"
            type="number"
            min="2"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-xs outline-none focus:border-[#3db6bc]"
            @change="
              editor.mutate(() => {
                const wall = editor.activeFloor?.walls.find((w) => w.id === editor.selectedWall!.id)
                if (wall) wall.thickness = Math.max(2, numeric($event.target))
              })
            "
          />
        </FieldRow>
        <button
          class="w-full rounded-sm border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
          @click="editor.removeSelection()"
        >
          Hapus Dinding
        </button>
      </div>
    </PanelSection>

    <PanelSection v-if="selection?.kind === 'edge' || selection?.kind === 'door'" title="Objek Terpilih">
      <p class="mb-1.5 text-[11px] text-slate-500">
        {{ selection?.kind === 'edge' ? 'Jalur penghubung antar titik' : 'Penanda pintu' }}
      </p>
      <button
        class="w-full rounded-sm border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-100"
        @click="editor.removeSelection()"
      >
        Hapus
      </button>
    </PanelSection>
  </div>
</template>
