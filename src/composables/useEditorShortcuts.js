import { onMounted, onUnmounted, ref } from 'vue'

export function useEditorShortcuts(store, toolShortcuts) {
  const spacePanning = ref(false)

  const onKeyDown = (e) => {
    const tag = document.activeElement?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return

    if (e.code === 'Space') {
      e.preventDefault()
      spacePanning.value = true
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      store.deleteSelected()
      return
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) store.redo()
      else store.undo()
      return
    }
    const key = e.key.toUpperCase()
    const found = toolShortcuts.find((t) => t.key === key)
    if (found) {
      store.activeTool.value = found.id
      store.edgeDraftFromNodeId.value = null
    }
  }

  const onKeyUp = (e) => {
    if (e.code === 'Space') spacePanning.value = false
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
  })

  return { spacePanning }
}
