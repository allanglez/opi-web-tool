<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="mt-8 mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Data Verification</h1>
      <p class="text-neutral-600">Review and verify imported data for accuracy before assessments begin.</p>
    </div>

    <BaseCard>
      <EmptyState
        title="Coming Soon"
        message="Data verification tools will be available in a future update."
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
