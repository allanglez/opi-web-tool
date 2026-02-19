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
import { isAuth0Mode } from '../../auth/mode';

const router = useRouter();
const authStore = useAuthStore();

onMounted(async () => {
  if (!isAuth0Mode) {
    router.replace('/login');
    return;
  }

  const redirect = sessionStorage.getItem('auth_redirect');
  sessionStorage.removeItem('auth_redirect');

  try {
    await authStore.fetchMe();
    router.replace(redirect || authStore.getDefaultRoute());
  } catch (error) {
    console.error('Auth callback error:', error);
    router.replace('/login');
  }
});
</script>
