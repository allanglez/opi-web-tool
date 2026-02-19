<template>
  <div class="flex flex-col items-center justify-center py-12">
    <AlertCircle class="w-16 h-16 text-red-500 mb-4" />
    <h3 class="text-lg font-semibold text-neutral-900 mb-2">{{ title }}</h3>
    <p class="text-neutral-600 text-center max-w-md">{{ message }}</p>
    <button 
      v-if="showRetry"
      class="mt-4 px-4 py-2 bg-yukon-teal text-white rounded hover:bg-yukon-navy transition-colors"
      @click="$emit('retry')"
    >
      Try Again
    </button>
  </div>
</template>

<script setup lang="ts">
import { AlertCircle } from 'lucide-vue-next';

interface Props {
  title?: string;
  message?: string;
  showRetry?: boolean;
}

withDefaults(defineProps<Props>(), {
  title: 'Something went wrong',
  message: 'An error occurred while loading this content. Please try again.',
  showRetry: true,
});

defineEmits<{
  retry: [];
}>();
</script>
