import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { isAuth0Mode, isMockAuthMode } from '../auth/mode';
import { getAuth0AccessToken, logoutWithAuth0 } from '../auth/auth0';
import { getEnv } from '../utils/env';

const API_BASE =
  getEnv('VITE_API_URL') ||
  getEnv('VITE_API_BASE_URL') ||
  'http://localhost:3000/api/v1';

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
  const lastFetchedAt = ref<number | null>(null);

  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const token = ref<string | null>(null);

  const hasRole = (role: string) => {
    return user.value?.roles.includes(role) || false;
  };

  const hasAnyRole = (roles: string[]) => {
    return roles.some((role) => hasRole(role));
  };

  const isAdmin = computed(() => hasRole('ADMIN'));
  const isCoordinator = computed(() => hasRole('COORDINATOR'));
  const isEvaluator = computed(() => hasRole('EVALUATOR'));
  const isPending = computed(() => hasRole('PENDING'));
  const isInactive = computed(() => user.value?.isActive === false);

  const clearSession = () => {
    user.value = null;
    isAuthenticated.value = false;
    lastFetchedAt.value = null;
    error.value = null;
    token.value = null;
  };

  const getDefaultRoute = () => {
    if (hasRole('ADMIN')) {
      return '/admin/dashboard';
    }
    if (hasRole('COORDINATOR')) {
      return '/coordinator/dashboard';
    }
    if (hasRole('EVALUATOR')) {
      return '/evaluator/dashboard';
    }

    return '/forbidden';
  };

  const fetchMe = async (mockUserId?: number, mockRole?: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      const headers: Record<string, string> = {};

      if (isAuth0Mode) {
        token.value = await getAuth0AccessToken();
        console.log('Auth0 Access Token format:', token.value ? token.value.substring(0, 15) + '...' : 'null');
        if (token.value) {
          headers.Authorization = `Bearer ${token.value}`;
        }
      } else {
        token.value = null;
      }

      const resolvedMockUserId = mockUserId ?? user.value?.id;
      if (isMockAuthMode && resolvedMockUserId) {
        headers['X-Mock-User-Id'] = String(resolvedMockUserId);
      }
      if (isMockAuthMode && mockRole) {
        headers['X-Mock-Role'] = mockRole;
      }

      const response = await fetch(`${API_BASE}/me`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend /me failed:', response.status, errorText);
        throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      user.value = data;
      isAuthenticated.value = true;
      lastFetchedAt.value = Date.now();
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error';
      user.value = null;
      isAuthenticated.value = false;
      token.value = null;
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const getToken = async () => {
    if (!isAuth0Mode) return token.value;
    try {
      const freshToken = await getAuth0AccessToken();
      token.value = freshToken;
      return freshToken;
    } catch (err) {
      console.error('Auth0 getAccessTokenSilently failed:', err);
      return null;
    }
  };

  const logout = async () => {
    if (isAuth0Mode) {
      try {
        logoutWithAuth0({
          logoutParams: {
            returnTo: window.location.origin,
          },
        });
        return;
      } catch (err) {
        console.error('Auth0 logout failed:', err);
        clearSession();
        window.location.assign('/login');
        return;
      }
    }

    clearSession();
  };

  return {
    user,
    isAuthenticated,
    lastFetchedAt,
    isLoading,
    error,
    isAdmin,
    isCoordinator,
    isEvaluator,
    isPending,
    isInactive,
    hasRole,
    hasAnyRole,
    getDefaultRoute,
    fetchMe,
    getToken,
    logout,
    token,
  };
});
