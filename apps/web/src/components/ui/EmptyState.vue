<template>
  <div class="flex flex-col items-center justify-center py-12">
    <Inbox class="w-16 h-16 text-neutral-400 mb-4" />
    <h3 class="text-lg font-semibold text-neutral-900 mb-2">{{ title }}</h3>
    <p class="text-neutral-600 text-center max-w-md">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';

interface Props {
  title?: string;
  message?: string;
}

withDefaults(defineProps<Props>(), {
  title: 'No data available',
  message: 'There is no data to display at this time.',
});
</script>
