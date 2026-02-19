<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="mt-8 mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Progress Tracking</h1>
      <p class="text-neutral-600">Monitor assessment progress across schools, classes, and evaluators.</p>
    </div>

    <BaseCard>
      <EmptyState
        title="Coming Soon"
        message="Progress tracking dashboards will be available in a future update."
      />
    </BaseCard>
  </AppShell>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import EmptyState from '../../components/ui/EmptyState.vue';

const authStore = useAuthStore();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);
</script>
