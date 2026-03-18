<template>
  <div class="relative bg-white border-b-4 border-[#f2b233]">
    <!-- <img
      src="../../assets/branding/Aurora-main-full.svg"
      alt=""
      class="pointer-events-none absolute right-0 top-[52px] z-0 h-24 md:h-28 lg:h-32 w-auto max-w-none"
      @error="handleWaveError"
    /> -->
    <nav class="relative z-10 bg-white border-b border-neutral-200">
      <div class="container mx-auto px-4 md:px-6">
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
    <!-- <div class="pointer-events-none absolute inset-x-0 top-full z-0 h-20 md:h-24 lg:h-28 overflow-hidden">
      <img
        src="../../assets/branding/Aurora-main-full.svg"
        alt=""
        class="absolute right-0 top-[-22px] md:top-[-26px] lg:top-[-30px] h-24 md:h-28 lg:h-32 w-auto max-w-none"
        @error="handleWaveError"
      />
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useAuthStore } from '../../stores/auth';

const route = useRoute();
const authStore = useAuthStore();
const navRef = ref<HTMLElement | null>(null);

const allTabs = [
  { name: 'admin-dashboard', label: 'Dashboard', adminOnly: false },
  { name: 'admin-assignments', label: 'Assignments', adminOnly: false },
  { name: 'admin-scheduling', label: 'Scheduling', adminOnly: false },
  { name: 'admin-data-verification', label: 'Data Verification', adminOnly: false },
  { name: 'admin-user-management', label: 'User Management', adminOnly: true },
  { name: 'admin-class-view', label: 'Class View', adminOnly: false },
  { name: 'admin-reports', label: 'Reports', adminOnly: false },
  { name: 'admin-audit-log', label: 'Audit Log', adminOnly: false },
];

const tabs = computed(() =>
  allTabs
    .filter((tab) => !tab.adminOnly || authStore.isAdmin)
    .map((tab) => ({ name: tab.name, label: tab.label, to: { name: tab.name } })),
);

const isActive = (tabName: string): boolean => {
  if (tabName === 'admin-class-view') {
    return route.name === 'admin-class-view' || route.name === 'admin-class-students';
  }
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

</script>
