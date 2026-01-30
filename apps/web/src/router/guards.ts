import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/auth';

export const authGuard = async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore();

  // Check if route is public
  if (to.meta.public) {
    return next();
  }

  // If not authenticated, try to fetch user profile
  if (!authStore.isAuthenticated) {
    try {
      await authStore.fetchMe();
    } catch (error) {
      // Redirect to login if fetch fails
      return next({ name: 'login', query: { redirect: to.fullPath } });
    }
  }

  // Check role requirements
  const requiredRoles = to.meta.roles as string[] | undefined;
  if (requiredRoles && requiredRoles.length > 0) {
    if (!authStore.hasAnyRole(requiredRoles)) {
      // User doesn't have required role
      return next({ name: 'forbidden' });
    }
  }

  return next();
};
