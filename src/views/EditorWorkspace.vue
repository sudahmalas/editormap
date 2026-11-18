<script setup>
import { ref } from 'vue'
import FloorCanvas from '../components/canvas/FloorCanvas.vue'
import EditorInspectorPanel from '../components/editor/EditorInspectorPanel.vue'
import EditorToolRail from '../components/editor/EditorToolRail.vue'
import { useEditorShortcuts } from '../composables/useEditorShortcuts'

const props = defineProps({
  store: { type: Object, required: true }
})

const rightInspectorOpen = ref(true)

const { spacePanning } = useEditorShortcuts(props.store, [
  { id: 'select', key: 'V' },
  { id: 'hand', key: 'H' },
  { id: 'room', key: 'R' },
  { id: 'rack', key: 'K' },
  { id: 'door', key: 'D' },
  { id: 'node', key: 'N' },
  { id: 'edge', key: 'E' },
  { id: 'portal', key: 'P' }
])
</script>

<template>
  <div class="flex-1 flex min-h-0 overflow-hidden bg-[#e5e8ee]">
    <EditorToolRail
      :store="store"
      :right-inspector-open="rightInspectorOpen"
      @toggle-right="rightInspectorOpen = !rightInspectorOpen"
    />
    <FloorCanvas :store="store" :read-only="false" :space-panning="spacePanning" />
    <EditorInspectorPanel :store="store" :open="rightInspectorOpen" />
  </div>
</template>
