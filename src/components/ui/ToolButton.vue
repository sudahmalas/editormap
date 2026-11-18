<script setup lang="ts">
defineProps<{
  label: string
  active?: boolean
  disabled?: boolean
  title?: string
}>()

const emit = defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <button
    type="button"
    :title="title ?? label"
    :disabled="disabled"
    class="flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
    :class="
      active
        ? 'border-[#3db6bc] bg-[#3db6bc] text-white shadow-2xs'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
    "
    @click="emit('click')"
  >
    <slot />
    <span>{{ label }}</span>
  </button>
</template>
