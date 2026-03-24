<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="isOpen"
        class="fixed inset-0 bg-black/40 z-40 lg:hidden"
        @click="close"
      />
    </Transition>

    <!-- Sidebar panel -->
    <Transition name="slide">
      <div
        v-if="isOpen"
        class="fixed top-0 right-0 bottom-0 w-[320px] max-w-[85vw] bg-white shadow-xl z-50 flex flex-col lg:hidden"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4">
          <span class="text-lg font-bold text-neutral-900">OPI Tool</span>
          <button
            class="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            @click="close"
          >
            <span>close</span>
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Gold separator -->
        <div class="h-1 bg-[#f2b233]" />

        <!-- Navigation links -->
        <nav class="flex-1 overflow-y-auto px-6 py-6">
          <div class="space-y-1">
            <router-link
              v-for="tab in tabs"
              :key="tab.name"
              :to="tab.to"
              class="block px-2 py-3 text-base font-semibold transition-colors rounded"
              :class="isActive(tab.name)
                ? 'text-[#0f3f52] bg-neutral-100'
                : 'text-[#0f3f52] hover:bg-neutral-50'"
              @click="close"
            >
              {{ tab.label }}
            </router-link>
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { X } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const route = useRoute();
const authStore = useAuthStore();

const close = () => emit('close');

const routeNamespace = computed<'admin' | 'coordinator' | 'evaluator'>(() => {
  const name = String(route.name || '');
  if (name.startsWith('admin-')) return 'admin';
  if (name.startsWith('coordinator-')) return 'coordinator';
  if (name.startsWith('evaluator-')) {
    // For shared evaluator pages (e.g. assessment form accessed by admin/coordinator),
    // check the source query param or fall back to role
    const from = route.query.from as string | undefined;
    if (from === 'admin-verification' && authStore.isAdmin) return 'admin';
    if (from === 'coordinator-verification' && authStore.isCoordinator) return 'coordinator';
    if (authStore.isAdmin) return 'admin';
    if (authStore.isCoordinator) return 'coordinator';
  }

  return 'evaluator';
});

const adminTabs = computed(() => {
  const all = [
    { name: 'admin-dashboard', label: 'Dashboard (Home)', adminOnly: false },
    { name: 'admin-assignments', label: 'Assignments', adminOnly: false },
    { name: 'admin-scheduling', label: 'Scheduling', adminOnly: false },
    { name: 'admin-data-verification', label: 'Data Verification', adminOnly: false },
    { name: 'admin-user-management', label: 'User Management', adminOnly: true },
    { name: 'admin-class-view', label: 'Class View', adminOnly: false },
    { name: 'admin-cycle-classes', label: 'Class Management', adminOnly: true },
    { name: 'admin-students', label: 'Students', adminOnly: true },
    { name: 'admin-cycle', label: 'Cycle', adminOnly: true },
  ];
  return all
    .filter((tab) => !tab.adminOnly || authStore.isAdmin)
    .map((tab) => ({ name: tab.name, label: tab.label, to: { name: tab.name } }));
});

const coordinatorTabs = [
  { name: 'coordinator-dashboard', label: 'Dashboard (Home)', to: { name: 'coordinator-dashboard' } },
  { name: 'coordinator-assignments', label: 'Assignments', to: { name: 'coordinator-assignments' } },
  { name: 'coordinator-scheduling', label: 'Scheduling', to: { name: 'coordinator-scheduling' } },
  { name: 'coordinator-class-view', label: 'Class View', to: { name: 'coordinator-class-view' } },
  { name: 'coordinator-data-verification', label: 'Data Verification', to: { name: 'coordinator-data-verification' } },
];

const evaluatorTabs = [
  { name: 'evaluator-dashboard', label: 'Dashboard (Home)', to: { name: 'evaluator-dashboard' } },
  { name: 'evaluator-assignments', label: 'My Assignments', to: { name: 'evaluator-assignments' } },
  { name: 'evaluator-class-view', label: 'Class View', to: { name: 'evaluator-class-view' } },
];

const tabs = computed(() => {
  if (routeNamespace.value === 'admin') return adminTabs.value;
  if (routeNamespace.value === 'coordinator') return coordinatorTabs;
  return evaluatorTabs;
});

const isActive = (tabName: string): boolean => {
  const name = String(route.name || '');
  if (tabName === 'admin-class-view') {
    return name === 'admin-class-view' || name === 'admin-class-students';
  }
  if (tabName === 'coordinator-class-view') {
    return name === 'coordinator-class-view' || name === 'coordinator-class-students';
  }
  return name === tabName;
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
