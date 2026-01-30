<template>
  <div 
    class="card p-6"
    :class="[
      { 'card-hover': hover },
      variantClasses
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  hover?: boolean;
  variant?: 'default' | 'warning' | 'error';
}

const props = withDefaults(defineProps<Props>(), {
  hover: false,
  variant: 'default',
});

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'warning':
      return 'bg-yellow-50 border border-yellow-200';
    case 'error':
      return 'bg-red-50 border border-red-200';
    default:
      return '';
  }
});
</script>
