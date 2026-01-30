<template>
  <BaseCard class="text-center">
    <div class="text-4xl font-bold mb-2" :class="valueColorClass">
      {{ value }}
    </div>
    <div class="text-sm text-neutral-600 uppercase tracking-wide">
      {{ label }}
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import BaseCard from './BaseCard.vue';

interface Props {
  value: string | number;
  label: string;
  variant?: 'default' | 'green' | 'yellow' | 'red';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
});

const valueColorClass = computed(() => {
  const colorMap = {
    default: 'text-neutral-900',
    green: 'text-yukon-green',
    yellow: 'text-yukon-yellow',
    red: 'text-yukon-red',
  };
  return colorMap[props.variant];
});
</script>
