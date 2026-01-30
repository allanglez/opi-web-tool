<template>
  <div class="flex flex-col items-center justify-center py-12">
    <svg class="w-16 h-16 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
    <h3 class="text-lg font-semibold text-neutral-900 mb-2">{{ title }}</h3>
    <p class="text-neutral-600 text-center max-w-md">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string;
  message?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'No data available',
  message: 'There is no data to display at this time.',
});
</script>
