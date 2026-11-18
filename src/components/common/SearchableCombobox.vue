<script setup>
import { Check, ChevronDown, Search, X } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number, null], default: null },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Pilih lokasi...' },
  searchPlaceholder: { type: String, default: 'Cari...' },
  prefixLabel: { type: String, default: '' },
  theme: { type: String, default: 'light' },
  searchable: { type: Boolean, default: true },
  filterTabs: { type: Array, default: () => [] },
  popoverWidthClass: { type: String, default: 'w-full' },
  dotIndicatorColor: { type: String, default: '' },
  compact: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const popoverRef = ref(null)
const searchInputRef = ref(null)
const isOpen = ref(false)
const searchQuery = ref('')
const activeTab = ref(props.filterTabs[0]?.id || 'all')
const floatingStyle = ref({})

watch(
  () => props.filterTabs,
  (tabs) => {
    if (!tabs?.some((t) => t.id === activeTab.value)) {
      activeTab.value = tabs?.[0]?.id || 'all'
    }
  }
)

const sanitizedWidthClass = computed(() =>
  props.popoverWidthClass.replace(/\bw-full\b/g, '').trim()
)

const selectedOption = computed(
  () => props.options.find((o) => String(o.value) === String(props.modelValue)) || null
)

const filteredOptions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return props.options.filter((opt) => {
    if (activeTab.value !== 'all' && opt.kind && opt.kind !== activeTab.value) {
      return false
    }
    if (!q) return true
    const hay = `${opt.label || ''} ${opt.sublabel || ''} ${opt.group || ''} ${opt.badge || ''}`.toLowerCase()
    return hay.includes(q)
  })
})

const groupedOptions = computed(() => {
  const groups = []
  const map = new Map()
  for (const opt of filteredOptions.value) {
    const gName = opt.group || ''
    if (!map.has(gName)) {
      const grp = { name: gName, items: [] }
      map.set(gName, grp)
      groups.push(grp)
    }
    map.get(gName).items.push(opt)
  }
  return groups
})

/**
 * Hitung posisi floating popover terhadap viewport agar tidak terpotong parent overflow-y-auto.
 */
const updatePosition = async () => {
  if (!isOpen.value || !rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const viewportW = window.innerWidth
  const viewportH = window.innerHeight
  const pad = 12
  const gap = 6
  const hasExplicitWidth = /\bw-(?:\d+|\[[^\]]+\])/.test(sanitizedWidthClass.value)

  const style = {
    position: 'fixed',
    zIndex: 9999,
    minWidth: `${Math.round(rect.width)}px`,
    maxWidth: `${Math.max(200, viewportW - pad * 2)}px`,
    left: `${Math.max(pad, Math.round(rect.left))}px`
  }
  if (!hasExplicitWidth) {
    style.width = `${Math.round(rect.width)}px`
  }

  const spaceBelow = viewportH - rect.bottom - gap - pad
  const spaceAbove = rect.top - gap - pad
  const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow
  const availableH = Math.max(150, openUpward ? spaceAbove : spaceBelow)
  style.maxHeight = `${Math.min(340, Math.floor(availableH))}px`

  if (openUpward) {
    style.bottom = `${Math.round(viewportH - rect.top + gap)}px`
  } else {
    style.top = `${Math.round(rect.bottom + gap)}px`
  }

  floatingStyle.value = style

  await nextTick()
  if (popoverRef.value && isOpen.value) {
    const popRect = popoverRef.value.getBoundingClientRect()
    let left = rect.left
    if (left + popRect.width > viewportW - pad) {
      left = Math.min(rect.right - popRect.width, viewportW - popRect.width - pad)
    }
    if (left < pad) left = pad
    floatingStyle.value = {
      ...floatingStyle.value,
      left: `${Math.round(left)}px`
    }
  }
}

const toggleOpen = async () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    await nextTick()
    await updatePosition()
    searchInputRef.value?.focus()
  }
}

const selectOption = (opt) => {
  emit('update:modelValue', opt.value)
  emit('change', opt)
  isOpen.value = false
}

const handleClickOutside = (e) => {
  if (!isOpen.value) return
  if (rootRef.value?.contains(e.target) || popoverRef.value?.contains(e.target)) return
  isOpen.value = false
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && isOpen.value) isOpen.value = false
}

const handleViewportScroll = (e) => {
  if (!isOpen.value) return
  if (popoverRef.value?.contains(e.target)) return
  updatePosition()
}

const handleViewportResize = () => {
  if (isOpen.value) updatePosition()
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('keydown', handleKeyDown)
  window.addEventListener('scroll', handleViewportScroll, true)
  window.addEventListener('resize', handleViewportResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('scroll', handleViewportScroll, true)
  window.removeEventListener('resize', handleViewportResize)
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      type="button"
      @click="toggleOpen"
      class="w-full flex items-center justify-between gap-2 text-left transition-all cursor-pointer"
      :class="
        theme === 'dark'
          ? 'bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-slate-100 rounded-md px-2.5 py-1 text-[11px]'
          : compact
            ? 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 text-slate-800 rounded-lg px-2.5 py-1.5 text-xs'
            : 'bg-slate-50 hover:bg-white border border-slate-200 hover:border-sky-300 text-slate-800 rounded-xl px-2.5 py-2 text-xs shadow-2xs'
      "
    >
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <span v-if="dotIndicatorColor" class="w-2.5 h-2.5 rounded-full shrink-0 ring-4" :class="dotIndicatorColor" />
        <slot name="icon" />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-1 min-w-0">
            <span v-if="prefixLabel" class="text-[10px] font-bold uppercase text-slate-400 shrink-0">{{ prefixLabel }}</span>
            <span class="font-semibold truncate">{{ selectedOption?.label || placeholder }}</span>
          </div>
          <div v-if="!compact && theme === 'light' && selectedOption?.sublabel" class="text-[10px] text-slate-400 truncate">
            {{ selectedOption.sublabel }}
          </div>
        </div>
      </div>
      <ChevronDown class="w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform duration-150" :class="isOpen ? 'rotate-180' : ''" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        :style="floatingStyle"
        class="rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
        :class="[
          sanitizedWidthClass,
          theme === 'dark' ? 'bg-[#1e222a] border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        ]"
      >
        <div
          v-if="searchable || filterTabs.length > 0"
          class="p-2 border-b space-y-1.5 shrink-0"
          :class="theme === 'dark' ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50/80'"
        >
          <div v-if="searchable" class="relative">
            <Search class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              :placeholder="searchPlaceholder"
              class="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border focus:outline-none"
              :class="
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20'
              "
            />
            <button v-if="searchQuery" type="button" @click="searchQuery = ''" class="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X class="w-3.5 h-3.5" />
            </button>
          </div>

          <div v-if="filterTabs.length > 0" class="flex items-center gap-1 flex-wrap">
            <button
              v-for="tab in filterTabs"
              :key="tab.id"
              type="button"
              @click="activeTab = tab.id"
              class="px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
              :class="
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : theme === 'dark'
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-600 bg-white border border-slate-200/80 hover:bg-slate-100'
              "
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto p-1.5 space-y-2">
          <div v-if="groupedOptions.length === 0" class="py-6 text-center text-xs text-slate-400">Data tidak ditemukan</div>

          <div v-for="grp in groupedOptions" :key="grp.name" class="space-y-0.5">
            <div
              v-if="grp.name"
              class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider sticky top-0 backdrop-blur-xs"
              :class="theme === 'dark' ? 'text-slate-400 bg-[#1e222a]/95' : 'text-slate-400 bg-white/95'"
            >
              {{ grp.name }}
            </div>

            <button
              v-for="opt in grp.items"
              :key="opt.value"
              type="button"
              @click="selectOption(opt)"
              class="w-full px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
              :class="
                String(opt.value) === String(modelValue)
                  ? theme === 'dark' ? 'bg-blue-600/20 text-blue-300' : 'bg-sky-50 text-sky-900'
                  : theme === 'dark' ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700'
              "
            >
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span v-if="opt.dotColor" class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: opt.dotColor }" />
                <div class="min-w-0 flex-1">
                  <div class="text-xs font-semibold truncate">{{ opt.label }}</div>
                  <div v-if="opt.sublabel" class="text-[10px] text-slate-400 truncate">{{ opt.sublabel }}</div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <span v-if="opt.badge" class="px-1.5 py-0.5 rounded-md text-[9px] font-bold border" :class="opt.badgeClass || 'bg-slate-100 text-slate-600 border-slate-200'">
                  {{ opt.badge }}
                </span>
                <Check v-if="String(opt.value) === String(modelValue)" class="w-3.5 h-3.5 shrink-0" :class="theme === 'dark' ? 'text-blue-400' : 'text-sky-600'" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
