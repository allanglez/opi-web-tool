<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader :user="user" @toggle-menu="handleToggleMenu" @logout="handleLogout" />
    
    <main class="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-6 py-6 md:py-8">
      <slot />
    </main>
    
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { isMockAuthMode } from '../../auth/mode';
import AppHeader from './AppHeader.vue';
import AppFooter from './AppFooter.vue';

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface Props {
  user?: User | null;
}

withDefaults(defineProps<Props>(), {
  user: null,
});

const router = useRouter();
const authStore = useAuthStore();

const handleToggleMenu = () => {
  // TODO: Implement menu toggle logic in future milestone
  console.log('Menu toggle clicked');
};

const handleLogout = () => {
  authStore.logout();

  if (isMockAuthMode) {
    router.push('/login');
  }
};
</script>
