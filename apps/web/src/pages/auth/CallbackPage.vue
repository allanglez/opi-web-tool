<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-100">
    <LoadingState message="Processing authentication..." />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import LoadingState from '../../components/ui/LoadingState.vue';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  try {
    // TODO: Handle Auth0 callback when Auth0 is configured
    // For now, just fetch the user profile
    await authStore.fetchMe();
    router.push('/admin/dashboard');
  } catch (error) {
    console.error('Auth callback error:', error);
    router.push('/login');
  }
});
</script>
