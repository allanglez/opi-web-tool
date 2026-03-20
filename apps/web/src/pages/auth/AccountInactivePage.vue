<template>
  <div class="min-h-screen flex flex-col bg-white">
    <AppHeader />

    <main class="flex-1 flex items-center justify-center px-4 py-12">
      <BaseCard class="w-full max-w-md text-center">
        <div class="flex flex-col items-center py-8">
          <ShieldAlert class="w-16 h-16 text-amber-500 mb-4" />
          <h2 class="text-2xl font-bold text-[#141d33] mb-2">Account Not Active</h2>
          <p class="text-neutral-600 max-w-sm">
            <template v-if="isPending">
              Your account is currently <span class="font-semibold text-amber-600">pending approval</span>.
              Please contact your administrator to activate your account.
            </template>
            <template v-else>
              Your account has been <span class="font-semibold text-red-600">deactivated</span>.
              Please contact your administrator if you believe this is an error.
            </template>
          </p>
          <button
            class="mt-6 inline-flex items-center justify-center rounded-lg bg-[#0f3f52] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0c3444]"
            @click="backToLogin"
          >
            Back to Login
          </button>
        </div>
      </BaseCard>
    </main>

    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppHeader from '../../components/layout/AppHeader.vue';
import AppFooter from '../../components/layout/AppFooter.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import { ShieldAlert } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const isPending = computed(() => authStore.isPending);

const backToLogin = async () => {
  await authStore.logout();
  router.replace({ name: 'login' });
};
</script>
