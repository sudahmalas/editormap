<script setup>
import { onUnmounted, ref } from 'vue'
import AppHeaderBar from './components/common/AppHeaderBar.vue'
import RackSlotModal from './components/RackSlotModal.vue'
import MapSettingsModal from './components/editor/MapSettingsModal.vue'
import { useMapStore } from './composables/useMapStore'
import EditorWorkspace from './views/EditorWorkspace.vue'
import ItemFinderView from './views/ItemFinderView.vue'
import PorterModeView from './views/PorterModeView.vue'

const store = useMapStore()
const toast = ref(null)
let toastTimer = null

const showToast = (payload) => {
  toast.value = payload
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 3600)
}

onUnmounted(() => {
  store.stopSimulation()
})
</script>

<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-slate-100">
    <AppHeaderBar :store="store" @toast="showToast" />

    <EditorWorkspace v-if="store.appMode.value === 'editor'" :store="store" />
    <ItemFinderView v-else-if="store.appMode.value === 'finder'" :store="store" />
    <PorterModeView v-else :store="store" />

    <RackSlotModal :store="store" />
    <MapSettingsModal :store="store" />

    <div
      v-if="toast"
      class="fixed bottom-14 right-6 z-50 max-w-sm rounded-xl shadow-xl border px-4 py-3 bg-white"
      :class="toast.variant === 'error' ? 'border-rose-300' : toast.variant === 'warning' ? 'border-amber-300' : 'border-teal-300'"
    >
      <div class="text-xs font-bold text-slate-900">{{ toast.title }}</div>
      <div class="text-[11px] text-slate-600 mt-0.5">{{ toast.message }}</div>
    </div>
  </div>
</template>
