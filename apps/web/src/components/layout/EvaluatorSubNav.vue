<template>
  <nav class="bg-white border-b border-neutral-200">
    <div class="container mx-auto px-6">
      <div class="flex space-x-0">
        <router-link
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.to"
          class="px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors duration-150"
          :class="isActive(tab.name) 
            ? 'border-neutral-900 text-neutral-900 bg-neutral-100' 
            : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'"
        >
          {{ tab.label }}
        </router-link>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();

const tabs = [
  { name: 'evaluator-dashboard', label: 'Dashboard', to: { name: 'evaluator-dashboard' } },
  { name: 'evaluator-assignments', label: 'My Assignments', to: { name: 'evaluator-assignments' } },
  { name: 'evaluator-class-view', label: 'Class View', to: { name: 'evaluator-class-view' } },
];

const isActive = (tabName: string): boolean => {
  return route.name === tabName;
};
</script>
