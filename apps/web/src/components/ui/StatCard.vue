<template>
  <div class="rounded-card border px-6 py-5 text-center" :class="containerClass">
    <div class="text-4xl font-bold mb-2" :class="valueColorClass">
      {{ value }}
    </div>
    <div class="text-sm text-neutral-600 uppercase tracking-wide">
      {{ label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  value: string | number;
  label: string;
  variant?: 'default' | 'blue' | 'green' | 'yellow' | 'red';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
});

const valueColorClass = computed(() => {
  const colorMap = {
    default: 'text-neutral-900',
    blue: 'text-yukon-navy',
    green: 'text-yukon-green',
    yellow: 'text-yukon-yellow',
    red: 'text-yukon-red',
  };
  return colorMap[props.variant];
});

const containerClass = computed(() => {
  const colorMap = {
    default: 'border-neutral-300 bg-neutral-50',
    blue: 'border-blue-300 bg-blue-50',
    green: 'border-green-400 bg-green-50',
    yellow: 'border-yellow-400 bg-yellow-50',
    red: 'border-red-300 bg-red-50',
  };
  return colorMap[props.variant];
});
</script>
