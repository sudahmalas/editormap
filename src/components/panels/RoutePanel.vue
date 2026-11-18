<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useRouteStore } from '@/stores/route'
import { validateDocument, countIssues } from '@/core/validation'
import type { ValidationIssue } from '@/core/validation'
import { findFloor } from '@/core/document'
import PanelSection from '@/components/ui/PanelSection.vue'

const editor = useEditorStore()
const route = useRouteStore()
const showAllIssues = ref(false)

/** Mode Pencari Rute: tampilan khusus pengunjung, tanpa alat penyuntingan & validasi. */
const visitorMode = computed(() => editor.mode === 'route')

const issues = computed(() =>
  validateDocument(editor.doc, editor.activeFloorId ?? null),
)
const counts = computed(() => countIssues(issues.value))

const visibleIssues = computed(() => {
  const list = showAllIssues.value
    ? issues.value
    : issues.value.filter((i) => !i.floorId || i.floorId === editor.activeFloorId)
  return [...list].sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))
})

const distanceMeters = computed(() => {
  const res = route.result
  if (!res || !res.found) return null
  const ppm = editor.activeFloor?.pixelsPerMeter ?? 20
  return res.distance / ppm
})

const stepsByFloor = computed(() => {
  const res = route.result
  if (!res || !res.found) return []
  const groups: { floorId: string; label: string; steps: typeof res.steps }[] = []
  for (const step of res.steps) {
    const last = groups[groups.length - 1]
    if (last && last.floorId === step.floorId) last.steps.push(step)
    else {
      const floor = findFloor(editor.doc, step.floorId)
      groups.push({ floorId: step.floorId, label: floor?.name ?? 'Lantai', steps: [step] })
    }
  }
  return groups
})

const canSetStart = computed(
  () => editor.selection?.kind === 'node' || editor.selection?.kind === 'pin',
)

/** Di mode pengunjung, rute dihitung otomatis begitu awal & tujuan lengkap. */
watch(
  () => [route.startNodeId, route.goalNodeId],
  () => {
    if (!visitorMode.value) return
    if (route.startNodeId && route.goalNodeId) route.calculate()
  },
)

const floorOptions = computed(() =>
  editor.allFloors.map(({ building, floor }) => ({
    id: floor.id,
    label: `${building.name} · ${floor.name}`,
  })),
)

function focusIssue(issue: ValidationIssue) {
  if (issue.floorId) editor.setActiveFloor(issue.floorId)
  if (issue.entityId && issue.entityKind) {
    const kind = issue.entityKind === 'building' ? null : issue.entityKind
    if (kind) editor.select({ kind, id: issue.entityId })
  }
}

function goToFloor(floorId: string) {
  editor.setActiveFloor(floorId)
}

/** Pengunjung: memilih pin pada lantai aktif sebagai titik tujuan. */
function setGoalFromPin(pinId: string) {
  route.setGoalByPin(editor.activeFloorId, pinId)
  if (route.startNodeId) route.calculate()
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 overflow-y-auto p-2">
    <!-- Panel khusus pengunjung: cari rute -->
    <PanelSection v-if="visitorMode" title="Cari Rute">
      <div class="space-y-1.5">
        <label class="block">
          <span class="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">
            Lantai
          </span>
          <select
            id="route-floor"
            name="route-floor"
            class="w-full rounded-sm border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-800 outline-none focus:border-[#3db6bc]"
            :value="editor.activeFloorId"
            @change="goToFloor(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in floorOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
          </select>
        </label>

        <p class="text-[10px] leading-relaxed text-slate-500">
          Klik lokasi atau titik jalur pada denah: klik pertama menjadi awal (A), klik kedua menjadi
          tujuan (B). Rute dihitung otomatis.
        </p>

        <div class="rounded-sm border border-slate-200 px-2 py-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-wide text-emerald-600">Dari</span>
            <span class="truncate text-[11px] font-bold text-slate-800">
              {{ route.startPoint?.label ?? 'belum dipilih' }}
            </span>
          </div>
          <div class="mt-0.5 flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-wide text-rose-600">Ke</span>
            <span class="truncate text-[11px] font-bold text-slate-800">
              {{ route.goalPoint?.label ?? 'belum dipilih' }}
            </span>
          </div>
        </div>

        <div v-if="editor.activeFloor?.pins.length" class="space-y-1">
          <p class="text-[10px] font-black uppercase tracking-wide text-slate-500">
            Lokasi di lantai ini
          </p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="pin in editor.activeFloor.pins"
              :key="pin.id"
              type="button"
              class="rounded-sm border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:border-[#3db6bc] hover:text-[#2b8b90]"
              :title="`Jadikan tujuan: ${pin.label}`"
              @click="setGoalFromPin(pin.id)"
            >
              {{ pin.label }}
            </button>
          </div>
        </div>

        <div class="flex gap-1.5">
          <button
            type="button"
            class="flex-1 rounded-sm bg-[#3db6bc] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#349fa4]"
            @click="route.calculate()"
          >
            Hitung Rute
          </button>
          <button
            type="button"
            class="rounded-sm border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            @click="route.swap()"
          >
            Tukar
          </button>
          <button
            type="button"
            class="rounded-sm border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            @click="route.clear()"
          >
            Reset
          </button>
        </div>

        <div
          v-if="route.result"
          class="rounded-sm border px-2 py-1.5 text-[11px] font-semibold"
          :class="
            route.result.found
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          "
        >
          <template v-if="route.result.found">
            Rute ditemukan · {{ distanceMeters?.toFixed(1) }} m ·
            {{ route.result.steps.length }} titik
          </template>
          <template v-else>
            {{ route.result.message ?? 'Rute tidak ditemukan.' }}
          </template>
        </div>
      </div>
    </PanelSection>

    <!-- Panel penyusun peta: uji rute + validasi -->
    <PanelSection v-else title="Uji Rute">
      <div class="space-y-1.5">
        <button
          type="button"
          class="w-full rounded-sm border px-2 py-1.5 text-[11px] font-bold"
          :class="
            route.active
              ? 'border-[#3db6bc] bg-[#3db6bc] text-white shadow-2xs'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          "
          @click="route.toggle()"
        >
          {{ route.active ? 'Mode Uji Rute Aktif' : 'Aktifkan Mode Uji Rute' }}
        </button>

        <p v-if="route.active" class="text-[10px] leading-relaxed text-slate-500">
          Klik titik jalur atau pin di kanvas: klik pertama menjadi awal (A), klik kedua menjadi
          tujuan (B). Klik berikutnya memulai ulang.
        </p>

        <div class="rounded-sm border border-slate-200 px-2 py-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-wide text-emerald-600">Awal</span>
            <span class="truncate text-[11px] font-bold text-slate-800">
              {{ route.startPoint?.label ?? 'belum dipilih' }}
            </span>
          </div>
          <div class="mt-0.5 flex items-center justify-between gap-2">
            <span class="text-[10px] font-black uppercase tracking-wide text-rose-600">Tujuan</span>
            <span class="truncate text-[11px] font-bold text-slate-800">
              {{ route.goalPoint?.label ?? 'belum dipilih' }}
            </span>
          </div>
        </div>

        <div class="flex gap-1.5">
          <button
            type="button"
            class="flex-1 rounded-sm border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            :disabled="!canSetStart"
            @click="route.setStartFromSelection()"
          >
            Awal dari pilihan
          </button>
          <button
            type="button"
            class="flex-1 rounded-sm border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            :disabled="!canSetStart"
            @click="route.setGoalFromSelection()"
          >
            Tujuan dari pilihan
          </button>
        </div>

        <div class="flex gap-1.5">
          <button
            type="button"
            class="flex-1 rounded-sm bg-[#3db6bc] px-2 py-1.5 text-[11px] font-bold text-white hover:bg-[#349fa4]"
            @click="route.calculate()"
          >
            Hitung Rute
          </button>
          <button
            type="button"
            class="rounded-sm border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            @click="route.swap()"
          >
            Tukar
          </button>
          <button
            type="button"
            class="rounded-sm border border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
            @click="route.clear()"
          >
            Reset
          </button>
        </div>

        <div
          v-if="route.result"
          class="rounded-sm border px-2 py-1.5 text-[11px] font-semibold"
          :class="
            route.result.found
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          "
        >
          <template v-if="route.result.found">
            Rute ditemukan · {{ distanceMeters?.toFixed(1) }} m ·
            {{ route.result.steps.length }} titik
          </template>
          <template v-else>
            {{ route.result.message ?? 'Rute tidak ditemukan.' }}
          </template>
        </div>
      </div>
    </PanelSection>

    <PanelSection v-if="route.result?.found" title="Langkah Rute">
      <div class="space-y-1.5">
        <div
          v-for="group in stepsByFloor"
          :key="group.floorId"
          class="rounded-sm border border-slate-200"
        >
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 px-2 py-1 text-left hover:bg-slate-50"
            @click="goToFloor(group.floorId)"
          >
            <span class="text-[10px] font-black uppercase tracking-wide text-slate-500">
              {{ group.label }}
            </span>
            <span class="text-[10px] font-semibold text-slate-400">{{ group.steps.length }} titik</span>
          </button>
          <ol class="space-y-0.5 px-2 pb-1.5">
            <li
              v-for="(step, index) in group.steps"
              :key="`${step.nodeId}-${index}`"
              class="flex items-center gap-1.5 text-[10px] text-slate-600"
            >
              <span
                class="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm text-[8px] font-black"
                :class="
                  step.vertical
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-500'
                "
              >
                {{ step.vertical ? '↕' : index + 1 }}
              </span>
              <span class="truncate">{{ step.label }}</span>
            </li>
          </ol>
        </div>
      </div>
    </PanelSection>

    <PanelSection v-if="!visitorMode" title="Validasi Peta">
      <template #actions>
        <button
          type="button"
          class="rounded-sm border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
          @click="showAllIssues = !showAllIssues"
        >
          {{ showAllIssues ? 'Lantai ini' : 'Semua lantai' }}
        </button>
      </template>

      <div class="mb-1.5 flex items-center gap-1.5">
        <span
          class="rounded-sm border px-1.5 py-0.5 text-[10px] font-bold"
          :class="
            counts.errors > 0
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          "
        >
          {{ counts.errors }} error
        </span>
        <span
          class="rounded-sm border px-1.5 py-0.5 text-[10px] font-bold"
          :class="
            counts.warnings > 0
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          "
        >
          {{ counts.warnings }} peringatan
        </span>
      </div>

      <p v-if="visibleIssues.length === 0" class="text-[11px] text-slate-500">
        Tidak ada masalah pada cakupan ini.
      </p>

      <ul v-else class="space-y-1">
        <li v-for="issue in visibleIssues" :key="issue.id">
          <button
            type="button"
            class="w-full rounded-sm border px-2 py-1 text-left text-[10px] font-semibold leading-relaxed"
            :class="
              issue.level === 'error'
                ? 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-50'
                : 'border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-50'
            "
            @click="focusIssue(issue)"
          >
            {{ issue.message }}
          </button>
        </li>
      </ul>
    </PanelSection>
  </div>
</template>
