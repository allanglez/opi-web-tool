<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader :user="user" @toggle-menu="handleToggleMenu" />
    
    <main class="flex-1 container mx-auto px-6 py-8">
      <slot />
    </main>
    
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
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

const handleToggleMenu = () => {
  // TODO: Implement menu toggle logic in future milestone
  console.log('Menu toggle clicked');
};
</script>
