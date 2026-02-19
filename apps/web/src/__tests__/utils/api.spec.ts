import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

interface ApiSetupOptions {
  isAuth0Mode: boolean;
  isMockAuthMode: boolean;
  token?: string | null;
  userId?: number;
  fetchedToken?: string | null;
}

function jsonResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: () => 'application/json',
    },
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function textResponse(data: string) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: () => 'text/plain',
    },
    json: async () => ({}),
    text: async () => data,
  };
}

async function setupApi(options: ApiSetupOptions) {
  const authStore = {
    token: options.token ?? null,
    user: options.userId ? { id: options.userId } : null,
  };
  const getAuth0AccessToken = vi.fn().mockResolvedValue(options.fetchedToken ?? null);

  vi.resetModules();

  vi.doMock('../../auth/mode', () => ({
    isAuth0Mode: options.isAuth0Mode,
    isMockAuthMode: options.isMockAuthMode,
  }));

  vi.doMock('../../stores/auth', () => ({
    useAuthStore: () => authStore,
  }));

  vi.doMock('../../auth/auth0', () => ({
    getAuth0AccessToken,
  }));

  const { ApiClient } = await import('../../utils/api');

  return {
    ApiClient,
    authStore,
    getAuth0AccessToken,
  };
}

describe('ApiClient auth headers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
  });

  it('uses cached Auth0 token from auth store when available', async () => {
    const { ApiClient, getAuth0AccessToken } = await setupApi({
      isAuth0Mode: true,
      isMockAuthMode: false,
      token: 'cached-token',
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const client = new ApiClient();
    await client.get('/admin/users');

    expect(getAuth0AccessToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/users',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer cached-token',
        }),
      })
    );
  });

  it('fetches Auth0 token when missing and persists it in store', async () => {
    const { ApiClient, authStore, getAuth0AccessToken } = await setupApi({
      isAuth0Mode: true,
      isMockAuthMode: false,
      token: null,
      fetchedToken: 'fresh-token',
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const client = new ApiClient();
    await client.get('/admin/cycle');

    expect(getAuth0AccessToken).toHaveBeenCalledTimes(1);
    expect(authStore.token).toBe('fresh-token');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/cycle',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fresh-token',
        }),
      })
    );
  });

  it('sends X-Mock-User-Id in mock auth mode', async () => {
    const { ApiClient } = await setupApi({
      isAuth0Mode: false,
      isMockAuthMode: true,
      userId: 42,
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ created: true }));

    const client = new ApiClient();
    await client.post('/admin/users', { name: 'Demo' });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/users',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Mock-User-Id': '42',
        }),
      })
    );
  });

  it('appends query params to endpoints that already include query string', async () => {
    const { ApiClient } = await setupApi({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

    const client = new ApiClient();
    await client.get('/admin/classes?cycleId=1', { page: 2, includeArchived: false });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/classes?cycleId=1&page=2&includeArchived=false',
      expect.any(Object)
    );
  });

  it('throws detailed error on non-OK responses', async () => {
    const { ApiClient } = await setupApi({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'boom',
      headers: {
        get: () => 'text/plain',
      },
    });

    const client = new ApiClient();

    await expect(client.get('/broken')).rejects.toThrow('API Error: 500 - boom');
  });

  it('returns text payloads for non-JSON responses', async () => {
    const { ApiClient } = await setupApi({
      isAuth0Mode: false,
      isMockAuthMode: true,
    });

    fetchMock.mockResolvedValueOnce(textResponse('OK'));

    const client = new ApiClient();
    const response = await client.get<string>('/health');

    expect(response).toBe('OK');
  });
});
