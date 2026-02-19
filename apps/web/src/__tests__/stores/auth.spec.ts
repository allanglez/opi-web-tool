import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

interface SetupOptions {
  isAuth0Mode: boolean;
  isMockAuthMode: boolean;
  auth0Token?: string | null;
}

const buildUser = (roles: string[] = ['ADMIN']) => ({
  id: 1,
  externalAuthId: 'auth0|user-1',
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
  isActive: true,
  roles,
});

async function setupStore(options: SetupOptions) {
  const getAuth0AccessToken = vi.fn().mockResolvedValue(options.auth0Token ?? null);
  const logoutWithAuth0 = vi.fn();

  vi.resetModules();

  vi.doMock('../../auth/mode', () => ({
    isAuth0Mode: options.isAuth0Mode,
    isMockAuthMode: options.isMockAuthMode,
  }));

  vi.doMock('../../auth/auth0', () => ({
    getAuth0AccessToken,
    logoutWithAuth0,
  }));

  const { useAuthStore } = await import('../../stores/auth');

  setActivePinia(createPinia());
  const store = useAuthStore();

  return {
    store,
    getAuth0AccessToken,
    logoutWithAuth0,
  };
}

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it('fetches /me in mock mode with X-Mock-User-Id header', async () => {
    const { store } = await setupStore({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => buildUser(['ADMIN']),
    });

    await store.fetchMe(7);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/me', {
      headers: {
        'X-Mock-User-Id': '7',
      },
      credentials: 'include',
    });
    expect(store.isAuthenticated).toBe(true);
    expect(store.user?.id).toBe(1);
  });

  it('fetches /me in Auth0 mode with bearer token and stores token', async () => {
    const { store, getAuth0AccessToken } = await setupStore({
      isAuth0Mode: true,
      isMockAuthMode: false,
      auth0Token: 'auth0-token-123',
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => buildUser(['COORDINATOR']),
    });

    await store.fetchMe();

    expect(getAuth0AccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/me',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer auth0-token-123',
        },
      })
    );
    expect(store.token).toBe('auth0-token-123');
  });

  it('clears auth state when profile fetch fails', async () => {
    const { store } = await setupStore({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    store.user = buildUser(['ADMIN']);
    store.isAuthenticated = true;
    store.token = 'stale-token';

    fetchMock.mockResolvedValueOnce({
      ok: false,
    });

    await expect(store.fetchMe(1)).rejects.toThrow('Failed to fetch user profile');

    expect(store.error).toBe('Failed to fetch user profile');
    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.token).toBeNull();
  });

  it('returns role-specific default routes', async () => {
    const { store } = await setupStore({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    store.user = buildUser(['COORDINATOR']);
    expect(store.getDefaultRoute()).toBe('/coordinator/dashboard');

    store.user = buildUser(['EVALUATOR']);
    expect(store.getDefaultRoute()).toBe('/evaluator/dashboard');

    store.user = buildUser([]);
    expect(store.getDefaultRoute()).toBe('/forbidden');
  });

  it('clears local state and triggers Auth0 logout in Auth0 mode', async () => {
    const { store, logoutWithAuth0 } = await setupStore({
      isAuth0Mode: true,
      isMockAuthMode: false,
    });

    store.user = buildUser(['ADMIN']);
    store.isAuthenticated = true;
    store.error = 'error';
    store.token = 'cached-token';

    store.logout();

    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(store.error).toBeNull();
    expect(store.token).toBeNull();
    expect(logoutWithAuth0).toHaveBeenCalledWith({
      logoutParams: {
        returnTo: `${window.location.origin}/login`,
      },
    });
  });

  it('clears local state without calling Auth0 logout in mock mode', async () => {
    const { store, logoutWithAuth0 } = await setupStore({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    store.user = buildUser(['ADMIN']);
    store.isAuthenticated = true;

    store.logout();

    expect(store.user).toBeNull();
    expect(store.isAuthenticated).toBe(false);
    expect(logoutWithAuth0).not.toHaveBeenCalled();
  });
});
