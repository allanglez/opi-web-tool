import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationGuardNext } from 'vue-router';

interface AuthStoreStub {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isEvaluator: boolean;
}

async function setupRouter(authStoreOverrides: Partial<AuthStoreStub>) {
  const beforeEach = vi.fn();
  const createRouter = vi.fn((config: unknown) => ({
    ...(config as Record<string, unknown>),
    beforeEach,
  }));
  const createWebHistory = vi.fn(() => ({}));
  const authGuard = vi.fn();

  const authStore: AuthStoreStub = {
    isAuthenticated: false,
    isAdmin: false,
    isCoordinator: false,
    isEvaluator: false,
    ...authStoreOverrides,
  };

  vi.resetModules();

  vi.doMock('vue-router', () => ({
    createRouter,
    createWebHistory,
  }));

  vi.doMock('../../router/guards', () => ({
    authGuard,
  }));

  vi.doMock('../../stores/auth', () => ({
    useAuthStore: () => authStore,
  }));

  await import('../../router/index');

  const routerConfig = createRouter.mock.calls[0][0] as {
    routes: Array<{
      name?: string;
      beforeEnter?: (
        to: unknown,
        from: unknown,
        next: NavigationGuardNext
      ) => void;
    }>;
  };

  const homeRoute = routerConfig.routes.find((route) => route.name === 'home');

  if (!homeRoute?.beforeEnter) {
    throw new Error('home route beforeEnter guard not found');
  }

  return {
    beforeEach,
    authGuard,
    homeBeforeEnter: homeRoute.beforeEnter,
  };
}

describe('router index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers global auth guard with beforeEach', async () => {
    const { beforeEach, authGuard } = await setupRouter({ isAuthenticated: true });

    expect(beforeEach).toHaveBeenCalledTimes(1);
    expect(beforeEach).toHaveBeenCalledWith(authGuard);
  });

  it('home route redirects unauthenticated users to login', async () => {
    const { homeBeforeEnter } = await setupRouter({ isAuthenticated: false });
    const next = vi.fn() as unknown as NavigationGuardNext;

    homeBeforeEnter({}, {}, next);

    expect(next).toHaveBeenCalledWith({ name: 'login' });
  });

  it('home route redirects admins to admin dashboard', async () => {
    const { homeBeforeEnter } = await setupRouter({
      isAuthenticated: true,
      isAdmin: true,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    homeBeforeEnter({}, {}, next);

    expect(next).toHaveBeenCalledWith({ name: 'admin-dashboard' });
  });

  it('home route redirects coordinators to coordinator dashboard', async () => {
    const { homeBeforeEnter } = await setupRouter({
      isAuthenticated: true,
      isCoordinator: true,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    homeBeforeEnter({}, {}, next);

    expect(next).toHaveBeenCalledWith({ name: 'coordinator-dashboard' });
  });

  it('home route redirects evaluators to evaluator dashboard', async () => {
    const { homeBeforeEnter } = await setupRouter({
      isAuthenticated: true,
      isEvaluator: true,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    homeBeforeEnter({}, {}, next);

    expect(next).toHaveBeenCalledWith({ name: 'evaluator-dashboard' });
  });

  it('home route redirects unknown-role users to forbidden', async () => {
    const { homeBeforeEnter } = await setupRouter({
      isAuthenticated: true,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    homeBeforeEnter({}, {}, next);

    expect(next).toHaveBeenCalledWith({ name: 'forbidden' });
  });
});
