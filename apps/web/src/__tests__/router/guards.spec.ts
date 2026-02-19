import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';

interface GuardSetupOptions {
  isAuthenticated: boolean;
  fetchMeRejects?: boolean;
  hasAnyRoleResult?: boolean;
}

async function setupGuard(options: GuardSetupOptions) {
  const fetchMe = options.fetchMeRejects
    ? vi.fn().mockRejectedValue(new Error('fetch failed'))
    : vi.fn().mockResolvedValue(undefined);
  const hasAnyRole = vi.fn().mockReturnValue(options.hasAnyRoleResult ?? true);

  vi.resetModules();

  vi.doMock('../../stores/auth', () => ({
    useAuthStore: () => ({
      isAuthenticated: options.isAuthenticated,
      fetchMe,
      hasAnyRole,
    }),
  }));

  const { authGuard } = await import('../../router/guards');

  return {
    authGuard,
    fetchMe,
    hasAnyRole,
  };
}

function buildRoute(meta: Record<string, unknown>, fullPath = '/admin/dashboard') {
  return {
    meta,
    fullPath,
  } as unknown as RouteLocationNormalized;
}

const fromRoute = {} as RouteLocationNormalized;

describe('authGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows navigation for public routes without fetching profile', async () => {
    const { authGuard, fetchMe } = await setupGuard({ isAuthenticated: false });
    const next = vi.fn() as unknown as NavigationGuardNext;

    await authGuard(buildRoute({ public: true }, '/login'), fromRoute, next);

    expect(fetchMe).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it('fetches profile for unauthenticated user and continues when authorized', async () => {
    const { authGuard, fetchMe, hasAnyRole } = await setupGuard({
      isAuthenticated: false,
      hasAnyRoleResult: true,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    await authGuard(buildRoute({ roles: ['ADMIN'] }, '/admin/dashboard'), fromRoute, next);

    expect(fetchMe).toHaveBeenCalledTimes(1);
    expect(hasAnyRole).toHaveBeenCalledWith(['ADMIN']);
    expect(next).toHaveBeenCalledWith();
  });

  it('redirects to login when profile fetch fails', async () => {
    const { authGuard, fetchMe, hasAnyRole } = await setupGuard({
      isAuthenticated: false,
      fetchMeRejects: true,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    await authGuard(
      buildRoute({ roles: ['COORDINATOR'] }, '/coordinator/reports'),
      fromRoute,
      next
    );

    expect(fetchMe).toHaveBeenCalledTimes(1);
    expect(hasAnyRole).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/coordinator/reports' },
    });
  });

  it('redirects to forbidden when role requirements are not met', async () => {
    const { authGuard, fetchMe, hasAnyRole } = await setupGuard({
      isAuthenticated: true,
      hasAnyRoleResult: false,
    });
    const next = vi.fn() as unknown as NavigationGuardNext;

    await authGuard(buildRoute({ roles: ['ADMIN'] }), fromRoute, next);

    expect(fetchMe).not.toHaveBeenCalled();
    expect(hasAnyRole).toHaveBeenCalledWith(['ADMIN']);
    expect(next).toHaveBeenCalledWith({ name: 'forbidden' });
  });
});
