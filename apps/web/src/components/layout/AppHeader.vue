<template>
  <header class="bg-white border-b border-neutral-200">
    <div class="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-3">
      <div class="flex items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center">
          <img 
            src="../../assets/branding/yukon-logo.png" 
            alt="Yukon" 
            class="h-7 w-auto"
            @error="handleLogoError"
          />
        </div>

        <!-- Utility actions -->
        <div class="flex items-center text-[11px] text-neutral-600">
          <button
            v-if="user"
            class="inline-flex items-center gap-1 hover:text-yukon-navy transition-colors"
            @click="requestLogout"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Log out</span>
          </button>

          <span v-if="user" class="mx-2 h-3.5 w-px bg-neutral-300"></span>

          <!-- User info -->
          <div v-if="user" class="inline-flex items-center gap-1.5">
            <User class="w-3.5 h-3.5 text-neutral-500" />
            <span class="max-w-[180px] truncate text-neutral-700">{{ userDisplayName }}</span>
          </div>

          <span class="mx-2 h-3.5 w-px bg-neutral-300"></span>

          <!-- Menu button -->
          <button 
            class="inline-flex items-center gap-1 hover:text-yukon-navy transition-colors"
            @click="toggleMenu"
          >
            <Menu class="w-3.5 h-3.5" />
            <span>Menu</span>
          </button>
        </div>
      </div>

      <!-- Wave graphic -->
      <div class="mt-2 flex justify-end">
        <img 
          src="../../assets/branding/yukon-waves.png" 
          alt="" 
          class="w-full max-w-[420px] h-9 object-contain object-right"
          @error="handleWaveError"
        />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LogOut, Menu, User } from 'lucide-vue-next';

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
  logout: [];
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

const requestLogout = () => {
  emit('logout');
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
