<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import TopBar from '@/components/layout/TopBar.vue'
import ToolbarBar from '@/components/layout/ToolbarBar.vue'
import StatusBar from '@/components/layout/StatusBar.vue'
import StructurePanel from '@/components/panels/StructurePanel.vue'
import InspectorPanel from '@/components/panels/InspectorPanel.vue'
import RoutePanel from '@/components/panels/RoutePanel.vue'
import MapCanvas from '@/components/canvas/MapCanvas.vue'

type RightTab = 'inspector' | 'route'

const editor = useEditorStore()
const rightTab = ref<RightTab>('inspector')

const hasFloor = computed(() => Boolean(editor.activeFloor))
/** Mode Pencari Rute: sembunyikan alat penyuntingan, tampilkan panel rute saja. */
const isRoute = computed(() => editor.mode === 'route')

const tabs: { id: RightTab; label: string }[] = [
  { id: 'inspector', label: 'Properti' },
  { id: 'route', label: 'Rute & Validasi' },
]

function pickTab(tab: RightTab) {
  rightTab.value = tab
}

onMounted(async () => {
  await editor.init()
})
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
    <TopBar />
    <ToolbarBar v-if="!isRoute" />

    <main class="flex min-h-0 flex-1">
      <!-- Panel kiri: struktur gedung & lantai -->
      <aside
        v-if="!isRoute"
        class="hidden w-72 shrink-0 border-r border-slate-200 bg-slate-50/60 md:block"
      >
        <StructurePanel />
      </aside>

      <!-- Kanvas -->
      <section class="relative min-w-0 flex-1">
        <MapCanvas v-if="hasFloor" />
        <div
          v-else
          class="flex h-full flex-col items-center justify-center gap-2 px-6 text-center"
        >
          <p class="text-sm font-black text-slate-700">Belum ada lantai aktif</p>
          <p class="max-w-sm text-xs font-semibold text-slate-500">
            Tambahkan gedung dan lantai pada panel kiri untuk mulai memetakan ruangan dan jalur
            navigasi.
          </p>
        </div>
      </section>

      <!-- Panel kanan: properti / rute -->
      <aside
        v-if="isRoute"
        class="flex w-80 shrink-0 flex-col border-l border-slate-200 bg-slate-50/60"
      >
        <div class="min-h-0 flex-1">
          <RoutePanel />
        </div>
      </aside>
      <aside
        v-else
        class="hidden w-80 shrink-0 border-l border-slate-200 bg-slate-50/60 lg:flex lg:flex-col"
      >
        <div class="flex gap-1 border-b border-slate-200 bg-white px-2 py-1.5">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="flex-1 rounded-sm border px-2 py-1 text-[11px] font-bold transition-colors"
            :class="
              rightTab === tab.id
                ? 'border-[#3db6bc] bg-[#3db6bc] text-white shadow-2xs'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="pickTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>
        <div class="min-h-0 flex-1">
          <InspectorPanel v-if="rightTab === 'inspector'" />
          <RoutePanel v-else />
        </div>
      </aside>
    </main>

    <StatusBar />
  </div>
</template>
