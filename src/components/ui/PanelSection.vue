<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    dense?: boolean
  }>(),
  { title: '', dense: false },
)
</script>

<template>
  <section class="rounded-sm border border-slate-200 bg-white shadow-2xs">
    <header
      v-if="title"
      class="flex items-center justify-between border-b border-slate-200 px-2.5 py-1.5"
    >
      <h2 class="text-[11px] font-black uppercase tracking-wide text-slate-500">{{ title }}</h2>
      <slot name="actions" />
    </header>
    <div :class="dense ? 'p-1.5' : 'p-2.5'">
      <slot />
    </div>
  </section>
</template>
