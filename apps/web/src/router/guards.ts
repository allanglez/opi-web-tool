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

  // Fetch user profile if not authenticated or if roles may be stale (older than 5 minutes)
  const FIVE_MINUTES = 5 * 60 * 1000;
  const isStale = !authStore.lastFetchedAt || Date.now() - authStore.lastFetchedAt > FIVE_MINUTES;
  if (!authStore.isAuthenticated || isStale) {
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
      const homeRoute = authStore.getDefaultRoute();
      // Redirect to the user's home dashboard; only show forbidden if they have no recognized role
      if (homeRoute === '/forbidden') {
        return next({ name: 'forbidden' });
      }
      return next(homeRoute);
    }
  }

  return next();
};
