<template>
  <AppShell :user="currentUser">
    <CoordinatorSubNav />

    <div class="container mx-auto px-6 py-8">
      <BaseCard>
        <h2 class="text-xl font-bold text-neutral-900 mb-4">Reports</h2>
        <div class="text-center py-12 text-neutral-500">
          <div class="text-4xl mb-3">📊</div>
          <div class="text-lg font-semibold text-neutral-700 mb-2">Reports Coming Soon</div>
          <p class="text-sm">Progress tracking and analytics will be available here.</p>
        </div>
      </BaseCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import CoordinatorSubNav from '../../components/layout/CoordinatorSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';

const authStore = useAuthStore();

const currentUser = computed(() =>
  authStore.user
    ? {
        firstName: authStore.user.firstName,
        lastName: authStore.user.lastName,
        email: authStore.user.email,
      }
    : null,
);
</script>
