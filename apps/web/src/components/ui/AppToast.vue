<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-lg shadow-lg border px-4 py-3 flex items-start gap-3"
        :class="variantClasses(toast.variant)"
      >
        <component :is="variantIcon(toast.variant)" class="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p class="text-sm font-medium flex-1">{{ toast.message }}</p>
        <button
          class="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          @click="removeToast(toast.id)"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-vue-next';
import { useToast } from '../../composables/useToast';

const { toasts, removeToast } = useToast();

function variantClasses(variant: string) {
  switch (variant) {
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-neutral-50 border-neutral-200 text-neutral-800';
  }
}

function variantIcon(variant: string) {
  switch (variant) {
    case 'error': return AlertCircle;
    case 'success': return CheckCircle;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
    default: return Info;
  }
}
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
