<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore, type AppMode } from '@/stores/editor'
import { useRouteStore } from '@/stores/route'
import { downloadJson, parseDocument, sanitizeFilename, toDenahMapsBundle } from '@/core/portability'

const editor = useEditorStore()
const route = useRouteStore()
const fileInput = ref<HTMLInputElement | null>(null)
const notice = ref('')

const modes: { id: AppMode; label: string; hint: string }[] = [
  { id: 'editor', label: 'Editor', hint: 'Menyusun denah, ruangan, dan jalur' },
  { id: 'route', label: 'Pencari Rute', hint: 'Mencari rute dari satu lokasi ke lokasi lain' },
]

function pickMode(next: AppMode) {
  if (next === editor.mode) return
  editor.setMode(next)
  route.active = next === 'route'
  route.clear()
}

function flash(message: string) {
  notice.value = message
  window.setTimeout(() => {
    if (notice.value === message) notice.value = ''
  }, 2600)
}

function exportDocument() {
  downloadJson(editor.doc, `${sanitizeFilename(editor.doc.meta.name)}.editormap.json`)
  editor.markSaved()
  flash('Dokumen berhasil diekspor.')
}

function exportDenahContract() {
  downloadJson(
    toDenahMapsBundle(editor.doc),
    `${sanitizeFilename(editor.doc.meta.name)}.denah-maps.json`,
  )
  flash('Kontrak denah_maps berhasil diekspor.')
}

function openFilePicker() {
  fileInput.value?.click()
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const parsed = parseDocument(JSON.parse(text))
    if (!parsed) {
      flash('Berkas tidak dikenali sebagai dokumen editor peta versi 2.')
      return
    }
    editor.replaceDocument(parsed)
    flash(`Dokumen "${parsed.meta.name}" berhasil dimuat.`)
  } catch {
    flash('Gagal membaca berkas. Pastikan berkas JSON valid.')
  } finally {
    input.value = ''
  }
}

function createNew() {
  if (editor.dirty && !window.confirm('Perubahan belum disimpan ke berkas. Buat dokumen baru?')) return
  editor.newDocument()
  flash('Dokumen baru dibuat.')
}

function loadSample() {
  if (
    editor.dirty &&
    !window.confirm('Perubahan pada dokumen saat ini akan diganti dengan contoh RS. Lanjutkan?')
  )
    return
  editor.useSeedDocument()
  route.clear()
  flash('Contoh RS bawaan berhasil dimuat.')
}

const statusText = computed(() => (editor.dirty ? 'Belum diekspor' : 'Tersimpan lokal'))
</script>

<template>
  <header class="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
    <div class="flex items-center gap-2">
      <div class="flex h-7 w-7 items-center justify-center rounded-sm bg-[#3db6bc] text-[11px] font-black text-white">
        ID
      </div>
      <div class="leading-tight">
        <p class="text-xs font-black text-slate-900">
          {{ editor.mode === 'route' ? 'Pencari Rute Rumah Sakit' : 'Editor Map Rumah Sakit' }}
        </p>
        <p class="text-[10px] font-semibold text-slate-400">
          {{ editor.mode === 'route' ? 'Demo · data contoh lokal' : 'Denah · Jalur · Navigasi Indoor' }}
        </p>
      </div>
    </div>

    <div class="mx-1 h-6 w-px bg-slate-200" />

    <!-- Pemilih mode -->
    <div class="flex items-center gap-1 rounded-sm border border-slate-200 bg-slate-50 p-0.5">
      <button
        v-for="item in modes"
        :key="item.id"
        type="button"
        :title="item.hint"
        class="rounded-sm px-2.5 py-1 text-[11px] font-bold transition-colors"
        :class="
          editor.mode === item.id
            ? 'bg-[#3db6bc] text-white shadow-2xs'
            : 'text-slate-600 hover:bg-white'
        "
        @click="pickMode(item.id)"
      >
        {{ item.label }}
      </button>
    </div>

    <div class="mx-1 h-6 w-px bg-slate-200" />

    <input
      id="map-name"
      v-model="editor.doc.meta.name"
      name="map-name"
      :readonly="editor.mode === 'route'"
      class="w-52 rounded-sm border border-slate-200 px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-[#3db6bc] read-only:bg-slate-50 read-only:text-slate-500"
      placeholder="Nama peta"
    />

    <div class="ml-auto flex flex-wrap items-center gap-1.5">
      <span
        class="rounded-sm border px-2 py-1 text-[10px] font-bold"
        :class="
          editor.dirty
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        "
      >
        {{ statusText }}
      </span>
      <button
        class="rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
        @click="loadSample"
      >
        Muat contoh RS
      </button>
      <template v-if="editor.mode === 'editor'">
        <button
          class="rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          @click="createNew"
        >
          Baru
        </button>
        <button
          class="rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          @click="openFilePicker"
        >
          Impor
        </button>
        <button
          class="rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          @click="exportDocument"
        >
          Ekspor
        </button>
        <button
          class="rounded-sm border border-[#3db6bc] bg-[#3db6bc] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-[#349fa4]"
          @click="exportDenahContract"
        >
          Ekspor denah_maps
        </button>
      </template>
      <input ref="fileInput" id="import-map-file" name="import-map-file" type="file" accept="application/json,.json" class="hidden" @change="onFilePicked" />
    </div>

    <p
      v-if="notice"
      class="w-full rounded-sm border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700"
    >
      {{ notice }}
    </p>
  </header>
</template>
