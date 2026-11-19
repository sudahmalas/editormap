<script setup>
import { Building2, ChevronRight, MapPin, Navigation, Search, ShieldCheck, X } from 'lucide-vue-next'
import { computed } from 'vue'
import FloorCanvas from '../components/canvas/FloorCanvas.vue'
import SearchableCombobox from '../components/common/SearchableCombobox.vue'
import RouteStepsCard from '../components/wayfinding/RouteStepsCard.vue'
import { ROUTE_TYPES } from '../data/hospitalDemoData'

const props = defineProps({
  store: { type: Object, required: true }
})

const currentAnchorValue = computed(() => {
  const a = props.store.userAnchor.value
  if (a.roomOptionValue) return a.roomOptionValue
  return `${a.floorId}::${a.nodeId}`
})

const anchorOptions = computed(() => {
  const list = []
  for (const b of props.store.campus.buildings || []) {
    for (const f of b.floors || []) {
      const coveredRoomIds = new Set()

      for (const n of f.nav_nodes || []) {
        if (n.kind === 'room' && n.roomId) coveredRoomIds.add(n.roomId)
        const rt = n.routeType || 'bersama'
        const kindGroup = n.kind === 'portal' ? 'portal' : n.kind === 'room' || n.kind === 'door' ? 'room' : 'corridor'
        const kindBadge = n.kind === 'portal' ? 'Portal' : n.kind === 'room' ? 'Ruangan' : n.kind === 'door' ? 'Pintu' : 'Koridor'
        list.push({
          value: `${f.id}::${n.id}`,
          floorId: f.id,
          nodeId: n.id,
          roomId: n.roomId || null,
          x: n.x,
          y: n.y,
          kind: kindGroup,
          label: n.label || n.id,
          sublabel: `${b.nama} • ${f.nama_lantai}`,
          group: `${b.kode} — ${f.nama_lantai}`,
          badge: kindBadge,
          badgeClass:
            n.kind === 'portal'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : n.kind === 'room' || n.kind === 'door'
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: ROUTE_TYPES[rt]?.color || '#6366f1'
        })
      }

      // Tambahkan ruangan yang belum memiliki node kind='room' eksplisit agar bisa dipilih sebagai titik awal
      for (const r of f.rooms || []) {
        const refId = r.masterRoomId || r.id
        if (coveredRoomIds.has(refId) || coveredRoomIds.has(r.id)) continue
        list.push({
          value: `${f.id}::room::${r.id}`,
          floorId: f.id,
          nodeId: null,
          roomId: refId,
          x: r.x + r.w / 2,
          y: r.y + r.h / 2,
          kind: 'room',
          label: r.nama,
          sublabel: `${b.nama} • ${f.nama_lantai}`,
          group: `${b.kode} — ${f.nama_lantai}`,
          badge: r.is_medis ? 'Medis' : 'Non-Medis',
          badgeClass: r.is_medis
            ? 'bg-sky-50 text-sky-700 border-sky-200'
            : 'bg-slate-100 text-slate-600 border-slate-200',
          dotColor: r.is_medis ? '#0284c7' : '#64748b'
        })
      }
    }
  }
  return list
})

const anchorFilterTabs = [
  { id: 'all', label: 'Semua' },
  { id: 'room', label: 'Ruangan / Pintu' },
  { id: 'portal', label: 'Lift / Portal' }
]

const scopeTabs = [
  { id: 'all', label: 'Semua' },
  { id: 'rooms', label: 'Ruangan' },
  { id: 'items', label: 'Barang' }
]

const visibleRooms = computed(() =>
  props.store.searchScope.value === 'items' ? [] : props.store.finderRoomResults.value
)

const visibleItems = computed(() =>
  props.store.searchScope.value === 'rooms' ? [] : props.store.finderResults.value
)

const totalResultsCount = computed(() => visibleRooms.value.length + visibleItems.value.length)

const refreshSelectedRoute = () => {
  if (props.store.selectedFinderResult.value) {
    const cur = props.store.selectedFinderResult.value
    const updated = props.store.finderResults.value.find(
      (r) => r.rackId === cur.rackId && r.slot.row === cur.slot.row && r.slot.col === cur.slot.col
    )
    if (updated) props.store.routeToFinderItem(updated)
  } else if (props.store.selectedRoomResult.value) {
    const curRoom = props.store.selectedRoomResult.value
    const updatedRoom = props.store.finderRoomResults.value.find(
      (r) => r.floorId === curRoom.floorId && r.roomId === curRoom.roomId
    )
    if (updatedRoom) props.store.routeToRoom(updatedRoom)
  }
}

const handleAnchorSelect = (opt) => {
  if (!opt) return
  props.store.userAnchor.value = {
    floorId: opt.floorId,
    nodeId: opt.nodeId,
    roomId: opt.roomId || null,
    roomOptionValue: opt.value,
    x: opt.x,
    y: opt.y,
    label: opt.label
  }
  refreshSelectedRoute()
}

const switchRoutingProfile = (mode) => {
  props.store.routingProfile.value = mode
  refreshSelectedRoute()
}
</script>

<template>
  <div class="flex-1 relative flex min-h-0 overflow-hidden">
    <FloorCanvas :store="store" :read-only="true" :viewport-inset="{ left: 376, right: 0 }" />

    <section class="absolute top-3 left-3 bottom-12 w-[360px] max-w-[calc(100vw-1.5rem)] z-20 pointer-events-none flex flex-col gap-2.5">
      <div class="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 p-3.5 space-y-2.5 pointer-events-auto">
        <!-- Google Maps Origin -> Destination Connector -->
        <div class="flex items-stretch gap-2.5">
          <div class="flex flex-col items-center justify-between py-2.5 shrink-0">
            <span class="w-3 h-3 rounded-full bg-[#1a73e8] ring-4 ring-blue-100" />
            <span class="flex-1 w-px border-l-2 border-dotted border-slate-300 my-1" />
            <MapPin class="w-4 h-4 text-[#ea4335] shrink-0" />
          </div>

          <div class="flex-1 min-w-0 space-y-2">
            <SearchableCombobox
              :model-value="currentAnchorValue"
              :options="anchorOptions"
              :filter-tabs="anchorFilterTabs"
              prefix-label="Dari:"
              placeholder="Pilih lokasi awal..."
              search-placeholder="Cari ruangan, lantai, atau lift..."
              popover-width-class="w-full min-w-[330px]"
              @change="handleAnchorSelect"
            />

            <div class="relative">
              <Search class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                v-model="store.itemSearchQuery.value"
                type="text"
                placeholder="Tujuan: Cari ruangan, barang, atau kode..."
                class="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/25 focus:border-[#1a73e8]"
              />
              <button v-if="store.itemSearchQuery.value" type="button" @click="store.itemSearchQuery.value = ''" class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2">
          <div class="flex flex-wrap gap-1">
            <button
              v-for="q in ['Kasa Steril', 'Spuit', 'IGD', 'CSSD', 'Farmasi']"
              :key="q"
              type="button"
              @click="store.itemSearchQuery.value = q"
              class="px-2 py-0.5 rounded-full text-[10px] font-semibold border cursor-pointer transition-colors"
              :class="store.itemSearchQuery.value === q ? 'bg-[#1a73e8] text-white border-[#1a73e8]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
            >
              {{ q }}
            </button>
          </div>
          <button
            v-if="store.searchScope.value !== 'rooms'"
            type="button"
            @click="store.itemSterileOnly.value = !store.itemSterileOnly.value"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shrink-0 cursor-pointer"
            :class="store.itemSterileOnly.value ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'"
          >
            <ShieldCheck class="w-3 h-3" /> Steril
          </button>
        </div>

        <div class="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg">
          <button
            v-for="tab in scopeTabs"
            :key="tab.id"
            type="button"
            @click="store.searchScope.value = tab.id"
            class="py-1 rounded-md text-[10px] font-bold cursor-pointer transition-all"
            :class="store.searchScope.value === tab.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            @click="switchRoutingProfile('umum')"
            class="py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
            :class="store.routingProfile.value !== 'steril' ? 'bg-[#1a73e8] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Jalur Rute Umum
          </button>
          <button
            type="button"
            @click="switchRoutingProfile('steril')"
            class="py-1.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all"
            :class="store.routingProfile.value === 'steril' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Jalur Rute Steril
          </button>
        </div>
      </div>

      <div class="flex-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden flex flex-col pointer-events-auto">
        <div class="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <span class="text-[11px] font-bold text-slate-600">{{ totalResultsCount }} Hasil Ditemukan</span>
          <span class="text-[10px] text-slate-400">Urut rute terdekat</span>
        </div>

        <div class="flex-1 overflow-y-auto p-2.5 space-y-2.5">
          <div v-if="totalResultsCount === 0" class="py-8 text-center text-xs text-slate-400">
            Ruangan atau barang tidak ditemukan.
          </div>

          <!-- HASIL RUANGAN -->
          <template v-if="visibleRooms.length > 0">
            <div class="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ruangan ({{ visibleRooms.length }})
            </div>

            <div
              v-for="(roomRes, idx) in visibleRooms"
              :key="`room-${roomRes.floorId}-${roomRes.roomId}`"
              @click="store.routeToRoom(roomRes)"
              class="p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5"
              :class="
                store.selectedRoomResult.value?.floorId === roomRes.floorId &&
                store.selectedRoomResult.value?.roomId === roomRes.roomId
                  ? 'border-sky-500 bg-sky-50/80 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-sky-300'
              "
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span v-if="idx === 0 && roomRes.route.found" class="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-full bg-emerald-600 text-white">Terdekat</span>
                    <span class="truncate">{{ roomRes.roomName }}</span>
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono">
                    {{ roomRes.roomKode }} · {{ roomRes.rackCount }} penyimpanan · {{ roomRes.itemCount }} item
                  </div>
                </div>
                <span
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0"
                  :class="roomRes.roomIsMedis ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'"
                >
                  {{ roomRes.roomIsMedis ? 'Medis' : 'Non-Medis' }}
                </span>
              </div>

              <div class="text-[10px] text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100 flex items-center gap-1.5">
                <Building2 class="w-3 h-3 text-sky-600 shrink-0" />
                <span class="truncate">{{ roomRes.buildingName }} • {{ roomRes.floorName }}</span>
              </div>

              <div class="flex items-center justify-between text-[11px]">
                <span v-if="roomRes.route.found" class="font-bold text-sky-700 flex items-center gap-1">
                  <Navigation class="w-3 h-3" /> {{ roomRes.route.totalMeters }} m · ~{{ roomRes.route.etaSeconds }} dtk
                </span>
                <span v-else class="text-rose-600 text-[10px]">{{ roomRes.route.reason }}</span>
                <span class="text-sky-600 font-semibold flex items-center">Arahkan <ChevronRight class="w-3 h-3" /></span>
              </div>
            </div>
          </template>

          <!-- HASIL STOK BARANG -->
          <template v-if="visibleItems.length > 0">
            <div class="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Lokasi Stok Barang ({{ visibleItems.length }})
            </div>

            <div
              v-for="(res, idx) in visibleItems"
              :key="`${res.rackId}-${res.slot.row}-${res.slot.col}-${idx}`"
              @click="store.routeToFinderItem(res)"
              class="p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5"
              :class="
                store.selectedFinderResult.value?.rackId === res.rackId &&
                store.selectedFinderResult.value?.slot?.row === res.slot.row &&
                store.selectedFinderResult.value?.slot?.col === res.slot.col
                  ? 'border-sky-500 bg-sky-50/80 shadow-xs'
                  : 'border-slate-200 bg-white hover:border-sky-300'
              "
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                    <span v-if="idx === 0 && res.route.found" class="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded-full bg-emerald-600 text-white">Terdekat</span>
                    <span class="truncate">{{ res.slot.namaBarang }}</span>
                  </div>
                  <div class="text-[10px] text-slate-500 font-mono">{{ res.slot.kodeBarang }} · Exp {{ res.slot.expiredAt || '-' }}</div>
                </div>
                <div class="text-right shrink-0">
                  <div class="text-xs font-extrabold text-teal-700">{{ res.slot.qty }} {{ res.slot.satuan }}</div>
                  <div v-if="res.slot.isSteril" class="text-[9px] font-bold text-teal-600 uppercase">Steril</div>
                </div>
              </div>

              <div class="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100 space-y-0.5">
                <div class="flex items-center gap-1 font-semibold text-slate-700">
                  <MapPin class="w-3 h-3 text-sky-600 shrink-0" />
                  <span class="truncate">{{ res.buildingName }}</span>
                </div>
                <div class="pl-4 text-[10px] text-slate-500">
                  {{ res.floorName }} → <strong class="text-slate-700">{{ res.roomName }}</strong>
                  <span class="ml-1 text-[9px] px-1 py-0.2 rounded bg-slate-200/70 text-slate-600">{{ res.roomIsMedis ? 'Medis' : 'Non-Medis' }}</span>
                </div>
                <div class="pl-4 text-[10px] text-teal-700 font-bold">{{ res.rackName }} · Baris {{ res.slot.row }}, Kolom {{ res.slot.col }}</div>
              </div>

              <div class="flex items-center justify-between text-[11px]">
                <span v-if="res.route.found" class="font-bold text-sky-700 flex items-center gap-1">
                  <Navigation class="w-3 h-3" /> {{ res.route.totalMeters }} m · ~{{ res.route.etaSeconds }} dtk
                </span>
                <span v-else class="text-rose-600 text-[10px]">{{ res.route.reason }}</span>
                <span class="text-sky-600 font-semibold flex items-center">Arahkan <ChevronRight class="w-3 h-3" /></span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </section>

    <RouteStepsCard :store="store" title-prefix="Rute Pengambilan" />
  </div>
</template>
