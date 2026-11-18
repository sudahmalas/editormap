<script setup>
import { Archive, ArrowUpDown, ChevronDown, ChevronRight, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'

const props = defineProps({
  store: { type: Object, required: true }
})

const layerSearch = ref('')
const expandedRooms = ref({})
const floor = computed(() => props.store.activeFloor.value)
const sel = computed(() => props.store.selection.value)

const filteredRooms = computed(() => {
  const rooms = floor.value?.rooms || []
  const q = layerSearch.value.trim().toLowerCase()
  if (!q) return rooms
  return rooms.filter(
    (r) =>
      r.nama.toLowerCase().includes(q) ||
      r.kode.toLowerCase().includes(q) ||
      floor.value.racks.some(
        (rk) => (rk.ruangan_id === r.masterRoomId || rk.ruangan_id === r.id) && rk.nama.toLowerCase().includes(q)
      )
  )
})

const unassignedRacks = computed(() => {
  if (!floor.value) return []
  const roomIds = new Set()
  for (const r of floor.value.rooms || []) {
    roomIds.add(r.id)
    if (r.masterRoomId) roomIds.add(r.masterRoomId)
  }
  const q = layerSearch.value.trim().toLowerCase()
  return (floor.value.racks || []).filter((rk) => {
    const isOrphan = !rk.ruangan_id || !roomIds.has(rk.ruangan_id)
    if (!isOrphan) return false
    return !q || rk.nama.toLowerCase().includes(q) || rk.kode.toLowerCase().includes(q)
  })
})

const portalNodes = computed(() => (floor.value?.nav_nodes || []).filter((n) => n.kind === 'portal'))

const getRoomRacks = (room) =>
  (floor.value?.racks || []).filter(
    (x) => x.ruangan_id === room.id || (room.masterRoomId && x.ruangan_id === room.masterRoomId)
  )

const isRoomExpanded = (room) => expandedRooms.value[room.id] !== false
const toggleRoomExpand = (roomId) => {
  expandedRooms.value[roomId] = expandedRooms.value[roomId] === false
}

const selectLayer = (type, id) => {
  props.store.selection.value = { type, id }
  props.store.rightInspectorTab.value = 'design'
}
</script>

<template>
  <div class="flex-1 min-h-[180px] bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 flex flex-col overflow-hidden">
    <div class="px-3 pt-2.5 pb-2 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        Layers · {{ (floor?.rooms?.length || 0) + (floor?.racks?.length || 0) }}
      </span>
      <div class="relative flex-1 max-w-[148px]">
        <Search class="w-3 h-3 text-slate-400 absolute left-2 top-1.5" />
        <input
          v-model="layerSearch"
          type="text"
          placeholder="Cari layer..."
          class="w-full pl-6 pr-2 py-0.5 text-[11px] bg-slate-100/80 border border-transparent focus:border-blue-400 focus:bg-white rounded-md focus:outline-none"
        />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-2 space-y-0.5">
      <div v-for="room in filteredRooms" :key="room.id">
        <div
          class="group flex items-center gap-1 px-1.5 py-1.5 rounded-lg cursor-pointer transition-colors"
          :class="sel?.type === 'room' && sel?.id === room.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-800'"
          @click="selectLayer('room', room.id)"
        >
          <button
            v-if="getRoomRacks(room).length > 0"
            type="button"
            @click.stop="toggleRoomExpand(room.id)"
            class="w-4 h-4 flex items-center justify-center rounded opacity-70 hover:opacity-100 shrink-0 cursor-pointer"
          >
            <ChevronDown v-if="isRoomExpanded(room)" class="w-3 h-3" />
            <ChevronRight v-else class="w-3 h-3" />
          </button>
          <span v-else class="w-4 shrink-0" />

          <span
            class="w-2 h-2 rounded-full shrink-0"
            :class="
              sel?.type === 'room' && sel?.id === room.id
                ? 'bg-white'
                : !room.masterRoomId
                  ? 'bg-amber-400'
                  : room.is_medis
                    ? 'bg-sky-500'
                    : 'bg-slate-400'
            "
          />
          <span class="text-[11px] font-medium truncate flex-1">{{ room.nama }}</span>
          <span
            class="text-[9px] font-mono shrink-0 whitespace-nowrap"
            :class="sel?.type === 'room' && sel?.id === room.id ? 'text-blue-100' : 'text-slate-400'"
          >
            {{ room.masterRoomId ? room.kode : 'Unlinked' }}
          </span>
        </div>

        <div v-if="getRoomRacks(room).length > 0 && isRoomExpanded(room)" class="pl-5 space-y-0.5 mt-0.5">
          <div
            v-for="rk in getRoomRacks(room)"
            :key="rk.id"
            @click="selectLayer('rack', rk.id)"
            class="flex items-center justify-between gap-2 px-2 py-1 rounded-lg cursor-pointer transition-colors"
            :class="sel?.type === 'rack' && sel?.id === rk.id ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'"
          >
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <Archive class="w-3 h-3 shrink-0 opacity-80" />
              <span class="text-[11px] truncate">{{ rk.nama }}</span>
            </div>
            <span
              class="text-[9px] font-mono shrink-0 whitespace-nowrap"
              :class="sel?.type === 'rack' && sel?.id === rk.id ? 'text-teal-100' : 'text-slate-400'"
            >
              {{ rk.masterStorageId ? rk.kode : 'Unlinked' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Unassigned Storages -->
      <div v-if="unassignedRacks.length > 0" class="pt-1.5 space-y-0.5">
        <div class="px-2 text-[9px] font-bold uppercase tracking-wider text-amber-600">Di Luar Ruangan</div>
        <div
          v-for="rk in unassignedRacks"
          :key="rk.id"
          @click="selectLayer('rack', rk.id)"
          class="flex items-center justify-between gap-2 px-2 py-1 rounded-lg cursor-pointer"
          :class="sel?.type === 'rack' && sel?.id === rk.id ? 'bg-teal-600 text-white' : 'hover:bg-amber-50 text-slate-700'"
        >
          <span class="text-[11px] truncate flex items-center gap-1.5">
            <Archive class="w-3 h-3 shrink-0 text-amber-600" />
            {{ rk.nama }}
          </span>
          <span class="text-[9px] font-mono shrink-0 whitespace-nowrap">{{ rk.masterStorageId ? rk.kode : 'Unlinked' }}</span>
        </div>
      </div>

      <!-- Portals -->
      <div v-if="portalNodes.length > 0" class="pt-1.5 space-y-0.5">
        <div class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Portal Lantai</div>
        <div
          v-for="pn in portalNodes"
          :key="pn.id"
          @click="selectLayer('node', pn.id)"
          class="flex items-center justify-between gap-2 px-2 py-1 rounded-lg cursor-pointer"
          :class="sel?.type === 'node' && sel?.id === pn.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-700'"
        >
          <span class="text-[11px] truncate flex items-center gap-1.5">
            <ArrowUpDown class="w-3 h-3 shrink-0 opacity-75" />
            {{ pn.label }}
          </span>
          <span class="text-[9px] font-mono shrink-0 whitespace-nowrap opacity-75">{{ pn.portalGroup }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
