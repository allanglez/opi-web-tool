<template>
  <div class="flex flex-col items-center justify-center py-12">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-yukon-teal mb-4"></div>
    <p class="text-neutral-600">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  message?: string;
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
});
</script>
