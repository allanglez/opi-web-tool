<template>
  <div class="flex flex-col items-center justify-center py-12">
    <svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <h3 class="text-lg font-semibold text-neutral-900 mb-2">{{ title }}</h3>
    <p class="text-neutral-600 text-center max-w-md">{{ message }}</p>
    <button 
      v-if="showRetry"
      @click="$emit('retry')"
      class="mt-4 px-4 py-2 bg-yukon-teal text-white rounded hover:bg-yukon-navy transition-colors"
    >
      Try Again
    </button>
  </div>
</template>

<script setup lang="ts">
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
