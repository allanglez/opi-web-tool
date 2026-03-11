<template>
  <nav class="relative overflow-hidden bg-white border-b border-neutral-200">
    <img
      src="../../assets/branding/Aurora-main-full.svg"
      alt=""
      class="pointer-events-none absolute right-0 top-0 h-full w-auto max-w-none opacity-95"
      @error="handleWaveError"
    />
    <div class="container relative z-10 mx-auto px-4 md:px-6">
      <div ref="navRef" class="flex space-x-0 overflow-x-auto scrollbar-hide">
        <router-link
          v-for="tab in tabs"
          :key="tab.name"
          :to="tab.to"
          class="px-4 py-3 text-xs font-semibold tracking-wider uppercase border-b-2 transition-colors duration-150 whitespace-nowrap flex-shrink-0"
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
import { ref, onMounted, watch, nextTick } from 'vue';

const route = useRoute();
const navRef = ref<HTMLElement | null>(null);

const tabs = [
  { name: 'evaluator-dashboard', label: 'Dashboard', to: { name: 'evaluator-dashboard' } },
  { name: 'evaluator-assignments', label: 'My Assignments', to: { name: 'evaluator-assignments' } },
  { name: 'evaluator-class-view', label: 'Class View', to: { name: 'evaluator-class-view' } },
];

const isActive = (tabName: string): boolean => {
  return route.name === tabName;
};

function scrollToActiveTab() {
  nextTick(() => {
    if (!navRef.value) return;
    const activeLink = navRef.value.querySelector('.border-neutral-900');
    if (activeLink) {
      activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
}

onMounted(() => {
  scrollToActiveTab();
});

watch(() => route.name, () => {
  scrollToActiveTab();
});

const handleWaveError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};
</script>
