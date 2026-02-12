<template>
  <AppShell :user="currentUser">
    <div class="flex items-center justify-center min-h-[60vh]">
      <div class="text-center max-w-md">
        <div class="mb-6">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 text-3xl mb-4">
            ⏳
          </div>
          <h1 class="text-2xl font-bold text-neutral-900 mb-2">Cycle Not Approved</h1>
          <p class="text-neutral-600">
            The current assessment cycle has not been approved by an administrator yet. 
            Please wait for approval before accessing operational data.
          </p>
        </div>
        <div class="bg-neutral-50 rounded-lg p-4 text-sm text-neutral-700">
          <p class="font-medium mb-2">What does this mean?</p>
          <p>
            An administrator needs to review and approve the imported data before 
            coordinators and evaluators can begin their work. This ensures data 
            quality and completeness.
          </p>
        </div>
        <button
          :disabled="isChecking"
          class="mt-6 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-neutral-300 transition-colors"
          @click="checkApprovalStatus"
        >
          {{ isChecking ? 'Checking...' : 'Check Status' }}
        </button>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import AppShell from '../components/layout/AppShell.vue';

const authStore = useAuthStore();
const router = useRouter();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

const isChecking = ref(false);

const checkApprovalStatus = async () => {
  isChecking.value = true;

  try {
    const response = await fetch('/api/v1/cycles/active', {
      credentials: 'include',
    });

    if (response.ok) {
      const cycle = await response.json();
      if (cycle.isApproved) {
        router.push('/admin/dashboard');
      } else {
        alert('Cycle is still not approved. Please check back later.');
      }
    } else {
      alert('No active cycle found. Please contact an administrator.');
    }
  } catch (err) {
    console.error('Failed to check approval status:', err);
    alert('Failed to check approval status. Please try again.');
  } finally {
    isChecking.value = false;
  }
};
</script>
