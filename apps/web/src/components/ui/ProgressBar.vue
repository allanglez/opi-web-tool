<template>
  <div>
    <div v-if="showLabel" class="flex justify-between items-center mb-2">
      <span class="text-sm font-medium text-neutral-700">{{ label }}</span>
      <span class="text-sm font-medium text-neutral-700">{{ percentage }}%</span>
    </div>
    <div class="w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
      <div 
        class="h-full rounded-full transition-all duration-300"
        :class="barColorClass"
        :style="{ width: `${percentage}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  percentage: number;
  label?: string;
  showLabel?: boolean;
  variant?: 'default' | 'green' | 'yellow' | 'red';
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  showLabel: true,
  variant: 'green',
});

const barColorClass = computed(() => {
  const colorMap = {
    default: 'bg-neutral-500',
    green: 'bg-yukon-green',
    yellow: 'bg-yukon-yellow',
    red: 'bg-yukon-red',
  };
  return colorMap[props.variant];
});
</script>
