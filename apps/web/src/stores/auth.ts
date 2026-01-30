import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface User {
  id: number;
  externalAuthId: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const hasRole = (role: string) => {
    return user.value?.roles.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]) => {
    return roles.some((role) => hasRole(role));
  };

  const isAdmin = computed(() => hasRole('ADMIN'));
  const isCoordinator = computed(() => hasRole('COORDINATOR'));
  const isEvaluator = computed(() => hasRole('EVALUATOR'));

  const fetchMe = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch('/api/v1/me', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const data = await response.json();
      user.value = data;
      isAuthenticated.value = true;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      user.value = null;
      isAuthenticated.value = false;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    user.value = null;
    isAuthenticated.value = false;
    error.value = null;
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    isAdmin,
    isCoordinator,
    isEvaluator,
    hasRole,
    hasAnyRole,
    fetchMe,
    logout,
  };
});
