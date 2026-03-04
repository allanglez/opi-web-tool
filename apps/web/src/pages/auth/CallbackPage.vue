<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-100">
    <LoadingState message="Processing authentication..." />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import LoadingState from '../../components/ui/LoadingState.vue';
import { isAuth0Mode } from '../../auth/mode';
import { useAuth0 } from '@auth0/auth0-vue';

const router = useRouter();
const authStore = useAuthStore();
const { isAuthenticated: auth0IsAuthenticated, error: auth0Error, isLoading: auth0IsLoading } = useAuth0();

onMounted(() => {
  if (!isAuth0Mode) {
    router.replace('/login');
  }
});

// Watch for Auth0 to finish its automatic callback processing, then fetch profile
watchEffect(async () => {
  if (isAuth0Mode && !auth0IsLoading.value) {
    if (auth0IsAuthenticated.value) {
      const redirect = sessionStorage.getItem('auth_redirect');
      sessionStorage.removeItem('auth_redirect');
      
      try {
        await authStore.fetchMe();
        router.replace(redirect || authStore.getDefaultRoute());
      } catch (error) {
        console.error('Fetch profile error:', error);
        router.replace('/login');
      }
    } else if (auth0Error.value) {
      console.error('Auth0 error state:', auth0Error.value);
      router.replace('/login');
    }
  }
});
</script>
