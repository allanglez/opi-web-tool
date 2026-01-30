<template>
  <header class="bg-white border-b border-neutral-200">
    <div class="container mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center space-x-3">
          <img 
            src="../../assets/branding/yukon-logo.svg" 
            alt="Yukon" 
            class="h-8"
            @error="handleLogoError"
          />
          <span class="text-2xl font-bold text-neutral-900">Yukon</span>
        </div>

        <!-- Right side: User menu and hamburger -->
        <div class="flex items-center space-x-4">
          <!-- User info -->
          <div v-if="user" class="flex items-center space-x-2 text-sm">
            <svg class="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="text-neutral-700">{{ userDisplayName }}</span>
          </div>

          <!-- Menu button -->
          <button 
            class="flex items-center space-x-1 text-sm text-neutral-700 hover:text-neutral-900"
            @click="toggleMenu"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>
      </div>

      <!-- Wave graphic -->
      <div class="mt-4">
        <img 
          src="../../assets/branding/yukon-waves-header.svg" 
          alt="" 
          class="w-full h-12 object-cover"
          @error="handleWaveError"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

const props = withDefaults(defineProps<Props>(), {
  user: null,
});

const emit = defineEmits<{
  toggleMenu: [];
}>();

const userDisplayName = computed(() => {
  if (!props.user) return '';
  if (props.user.firstName && props.user.lastName) {
    return `${props.user.firstName} ${props.user.lastName}`;
  }
  return props.user.email || 'User';
});

const toggleMenu = () => {
  emit('toggleMenu');
};

const handleLogoError = (e: Event) => {
  // Fallback to text-only if logo image fails
  (e.target as HTMLImageElement).style.display = 'none';
};

const handleWaveError = (e: Event) => {
  // Hide wave graphic if image fails
  (e.target as HTMLImageElement).style.display = 'none';
};
</script>
