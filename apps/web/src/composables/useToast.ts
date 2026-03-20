import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  variant: 'error' | 'success' | 'warning' | 'info';
  duration: number;
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

function addToast(message: string, variant: Toast['variant'] = 'error', duration = 5000) {
  const id = nextId++;
  toasts.value.push({ id, message, variant, duration });

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

export function useToast() {
  return {
    toasts,
    removeToast,
    error: (message: string, duration?: number) => addToast(message, 'error', duration),
    success: (message: string, duration?: number) => addToast(message, 'success', duration),
    warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
    info: (message: string, duration?: number) => addToast(message, 'info', duration),
  };
}
