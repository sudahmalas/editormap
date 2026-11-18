<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    hint?: string
  }>(),
  { hint: '' },
)
</script>

<template>
  <label class="block">
    <span class="mb-0.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
      {{ label }}
    </span>
    <slot />
    <span v-if="hint" class="mt-0.5 block text-[10px] text-slate-400">{{ hint }}</span>
  </label>
</template>
