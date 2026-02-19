import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { App } from 'vue';

interface SetupOptions {
  isAuth0Mode: boolean;
  tokenValue?: string;
}

function setAuthEnv() {
  import.meta.env.VITE_AUTH0_DOMAIN = 'tenant.auth0.com';
  import.meta.env.VITE_AUTH0_CLIENT_ID = 'client-id';
  import.meta.env.VITE_AUTH0_AUDIENCE = 'https://opi-api';
  import.meta.env.VITE_AUTH0_REDIRECT_URI = 'http://localhost:5173/auth/callback';
}

async function setup(options: SetupOptions) {
  const loginWithRedirect = vi.fn().mockResolvedValue(undefined);
  const getAccessTokenSilently = vi
    .fn()
    .mockResolvedValue(options.tokenValue ?? 'access-token');
  const logout = vi.fn();

  const auth0Client = {
    loginWithRedirect,
    getAccessTokenSilently,
    logout,
  };

  const createAuth0 = vi.fn(() => auth0Client);

  vi.resetModules();

  vi.doMock('@auth0/auth0-vue', () => ({
    createAuth0,
  }));

  vi.doMock('../../auth/mode', () => ({
    isAuth0Mode: options.isAuth0Mode,
  }));

  setAuthEnv();

  const auth0Module = await import('../../auth/auth0');

  return {
    auth0Module,
    createAuth0,
    auth0Client,
    loginWithRedirect,
    getAccessTokenSilently,
    logout,
  };
}

describe('auth0 helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null and skips plugin setup when not in Auth0 mode', async () => {
    const { auth0Module, createAuth0 } = await setup({ isAuth0Mode: false });

    const app = { use: vi.fn() } as unknown as App;

    const plugin = auth0Module.installAuth0(app);

    expect(plugin).toBeNull();
    expect(createAuth0).not.toHaveBeenCalled();
    expect(app.use).not.toHaveBeenCalled();
  });

  it('installs Auth0 plugin once and reuses singleton client', async () => {
    const { auth0Module, createAuth0 } = await setup({ isAuth0Mode: true });

    const app = { use: vi.fn() } as unknown as App;

    const first = auth0Module.installAuth0(app);
    const second = auth0Module.installAuth0(app);

    expect(first).toBe(second);
    expect(createAuth0).toHaveBeenCalledTimes(1);
    expect(createAuth0).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'tenant.auth0.com',
        clientId: 'client-id',
        authorizationParams: expect.objectContaining({
          audience: 'https://opi-api',
          redirect_uri: 'http://localhost:5173/auth/callback',
          scope: 'openid profile email',
        }),
      })
    );
    expect(app.use).toHaveBeenCalledTimes(1);
  });

  it('throws when required Auth0 env var is missing', async () => {
    const { auth0Module } = await setup({ isAuth0Mode: true });

    import.meta.env.VITE_AUTH0_DOMAIN = '';

    const app = { use: vi.fn() } as unknown as App;

    expect(() => auth0Module.installAuth0(app)).toThrow(
      'Missing required auth env var: VITE_AUTH0_DOMAIN'
    );
  });

  it('delegates redirect login to Auth0 client', async () => {
    const { auth0Module, loginWithRedirect } = await setup({ isAuth0Mode: true });

    const app = { use: vi.fn() } as unknown as App;
    auth0Module.installAuth0(app);

    await auth0Module.loginWithAuth0Redirect({
      authorizationParams: {
        screen_hint: 'login',
      },
    });

    expect(loginWithRedirect).toHaveBeenCalledWith({
      authorizationParams: {
        screen_hint: 'login',
      },
    });
  });

  it('returns access token from Auth0 client in Auth0 mode', async () => {
    const { auth0Module, getAccessTokenSilently } = await setup({
      isAuth0Mode: true,
      tokenValue: 'token-abc',
    });

    const app = { use: vi.fn() } as unknown as App;
    auth0Module.installAuth0(app);

    const token = await auth0Module.getAuth0AccessToken();

    expect(token).toBe('token-abc');
    expect(getAccessTokenSilently).toHaveBeenCalledTimes(1);
  });

  it('returns null token and no-ops logout in mock mode', async () => {
    const { auth0Module, logout } = await setup({ isAuth0Mode: false });

    const token = await auth0Module.getAuth0AccessToken();
    auth0Module.logoutWithAuth0();

    expect(token).toBeNull();
    expect(logout).not.toHaveBeenCalled();
  });
});
