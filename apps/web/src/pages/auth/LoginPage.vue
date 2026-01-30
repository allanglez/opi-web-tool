<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-100">
    <BaseCard class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">OPI Tool</h1>
        <p class="text-neutral-600">Oral Proficiency Interview Assessment System</p>
      </div>

      <div class="space-y-4">
        <!-- Mock Auth Login (Development Only) -->
        <div v-if="isDevelopment" class="border-2 border-dashed border-yellow-300 bg-yellow-50 p-4 rounded">
          <p class="text-sm font-semibold text-yellow-800 mb-3">Development Mode - Mock Auth</p>
          <div class="space-y-2">
            <button
              @click="mockLogin(1)"
              class="w-full px-4 py-2 bg-yukon-navy text-white rounded hover:bg-yukon-teal transition-colors"
            >
              Login as Admin
            </button>
            <button
              @click="mockLogin(2)"
              class="w-full px-4 py-2 bg-yukon-navy text-white rounded hover:bg-yukon-teal transition-colors"
            >
              Login as Coordinator
            </button>
            <button
              @click="mockLogin(3)"
              class="w-full px-4 py-2 bg-yukon-navy text-white rounded hover:bg-yukon-teal transition-colors"
            >
              Login as Evaluator
            </button>
          </div>
        </div>

        <!-- Auth0 Login (Production) -->
        <button
          v-if="!isDevelopment"
          @click="loginWithAuth0"
          class="w-full px-6 py-3 bg-yukon-navy text-white rounded hover:bg-yukon-teal transition-colors font-medium"
        >
          Sign in with MyYukon
        </button>

        <p class="text-xs text-center text-neutral-500 mt-4">
          By signing in, you agree to the terms of use and privacy policy.
        </p>
      </div>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import BaseCard from '../../components/ui/BaseCard.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const isDevelopment = ref(import.meta.env.DEV);

const mockLogin = async (userId: number) => {
  try {
    // In development, we'll set a mock header and fetch /me
    const response = await fetch('/api/v1/me', {
      headers: {
        'X-Mock-User-Id': userId.toString(),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Mock login failed');
    }

    const user = await response.json();
    authStore.user = user;
    authStore.isAuthenticated = true;

    // Redirect to original destination or dashboard
    const redirect = route.query.redirect as string || '/admin/dashboard';
    router.push(redirect);
  } catch (error) {
    console.error('Mock login error:', error);
    alert('Login failed. Please try again.');
  }
};

const loginWithAuth0 = () => {
  // TODO: Implement Auth0 login in production
  // This will be implemented when Auth0 is configured
  console.log('Auth0 login not yet implemented');
  alert('Auth0 login will be configured in production');
};
</script>
