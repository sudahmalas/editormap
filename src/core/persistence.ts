import { get, set } from 'idb-keyval'
import type { MapDocument } from '@/types/map'
import { STORAGE_KEY_DOC } from '@/core/document'

const LS_PREFS = 'idgrow.editormap.prefs'

export interface EditorPrefs {
  gridSize: number
  snapToGrid: boolean
  showGrid: boolean
  showBackground: boolean
}

export const defaultPrefs: EditorPrefs = {
  gridSize: 10,
  snapToGrid: true,
  showGrid: true,
  showBackground: true,
}

export async function loadDocument(): Promise<MapDocument | null> {
  try {
    const stored = await get<MapDocument>(STORAGE_KEY_DOC)
    if (stored && stored.version === 2) return stored
    return null
  } catch {
    return null
  }
}

export async function saveDocument(doc: MapDocument): Promise<void> {
  await set(STORAGE_KEY_DOC, doc)
}

export function loadPrefs(): EditorPrefs {
  try {
    const raw = localStorage.getItem(LS_PREFS)
    if (!raw) return { ...defaultPrefs }
    return { ...defaultPrefs, ...(JSON.parse(raw) as Partial<EditorPrefs>) }
  } catch {
    return { ...defaultPrefs }
  }
}

export function savePrefs(prefs: EditorPrefs): void {
  try {
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs))
  } catch {
    // penyimpanan preferensi bersifat opsional
  }
}
