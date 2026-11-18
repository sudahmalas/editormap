import { ref } from 'vue'

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj))
}

export function useHistory(campus, selection, maxSteps = 40) {
  const historyStack = ref([])
  const redoStack = ref([])

  function pushSnapshot() {
    historyStack.value.push(cloneDeep({ buildings: campus.buildings }))
    if (historyStack.value.length > maxSteps) historyStack.value.shift()
    redoStack.value = []
  }

  function undo() {
    if (historyStack.value.length === 0) return
    redoStack.value.push(cloneDeep({ buildings: campus.buildings }))
    const prev = historyStack.value.pop()
    campus.buildings = prev.buildings
    selection.value = null
  }

  function redo() {
    if (redoStack.value.length === 0) return
    historyStack.value.push(cloneDeep({ buildings: campus.buildings }))
    const next = redoStack.value.pop()
    campus.buildings = next.buildings
    selection.value = null
  }

  function clearHistory() {
    historyStack.value = []
    redoStack.value = []
  }

  return {
    historyStack,
    redoStack,
    pushSnapshot,
    undo,
    redo,
    clearHistory
  }
}
