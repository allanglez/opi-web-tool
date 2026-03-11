<template>
  <header class="bg-white border-b border-neutral-200">
    <div class="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-3 md:py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <img 
            src="../../assets/branding/logo.svg" 
            alt="Yukon" 
            class="h-10 md:h-12 w-auto"
            @error="handleLogoError"
          />
        </div>

        <div class="flex items-center text-[11px] text-neutral-600">
          <button
            v-if="showGuestLogin"
            class="inline-flex items-center gap-2 text-[16px] font-bold text-[#0f3f52] transition-colors hover:text-[#0c3444]"
            @click="requestLogin"
          >
            <LogIn class="w-4 h-4" />
            <span>{{ guestLoginLabel }}</span>
          </button>

          <span v-if="showGuestLogin" class="mx-2 h-3.5 w-px bg-neutral-300"></span>

          <button
            v-if="user"
            class="inline-flex items-center gap-2 text-[16px] font-bold text-[#0f3f52] transition-colors hover:text-[#0c3444]"
            @click="requestLogout"
          >
            <LogOut class="w-4 h-4" />
            <span>Log out</span>
          </button>

          <span v-if="user" class="mx-2 h-3.5 w-px bg-neutral-300"></span>
          <div v-if="user" class="inline-flex items-center gap-2 text-[16px] font-bold text-[#0f3f52]">
            <User class="w-4 h-4 text-[#0f3f52]" />
            <span class="max-w-[180px] truncate">{{ userDisplayName }}</span>
          </div>
        </div>
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { LogIn, LogOut, User } from 'lucide-vue-next';

interface Props {
  showGuestLogin?: boolean;
  guestLoginLabel?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

const props = withDefaults(defineProps<Props>(), {
  showGuestLogin: false,
  guestLoginLabel: 'Log in',
  user: null,
});

const emit = defineEmits<{
  login: [];
  logout: [];
}>();

const userDisplayName = computed(() => {
  if (!props.user) return '';
  if (props.user.firstName && props.user.lastName) {
    return `${props.user.firstName} ${props.user.lastName}`;
  }
  return props.user.email || 'User';
});

const requestLogin = () => {
  emit('login');
};

const requestLogout = () => {
  emit('logout');
};

const handleLogoError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};
</script>
