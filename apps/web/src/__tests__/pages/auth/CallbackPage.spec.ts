import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

interface SetupOptions {
  isAuth0Mode: boolean;
  fetchMeRejects?: boolean;
}

async function setup(options: SetupOptions) {
  const replace = vi.fn();
  const fetchMe = options.fetchMeRejects
    ? vi.fn().mockRejectedValue(new Error('fetch failed'))
    : vi.fn().mockResolvedValue(undefined);
  const getDefaultRoute = vi.fn(() => '/admin/dashboard');

  vi.resetModules();

  vi.doMock('vue-router', () => ({
    useRouter: () => ({ replace }),
  }));

  vi.doMock('../../../stores/auth', () => ({
    useAuthStore: () => ({
      fetchMe,
      getDefaultRoute,
    }),
  }));

  vi.doMock('../../../auth/mode', () => ({
    isAuth0Mode: options.isAuth0Mode,
  }));

  const { default: CallbackPage } = await import('../../../pages/auth/CallbackPage.vue');

  mount(CallbackPage, {
    global: {
      stubs: {
        LoadingState: {
          template: '<div>Loading...</div>',
        },
      },
    },
  });

  await flushPromises();

  return {
    replace,
    fetchMe,
    getDefaultRoute,
  };
}

describe('CallbackPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('redirects to login when auth mode is not Auth0', async () => {
    const { replace, fetchMe } = await setup({ isAuth0Mode: false });

    expect(fetchMe).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('uses stored redirect after successful Auth0 callback', async () => {
    sessionStorage.setItem('auth_redirect', '/evaluator/assignments');

    const { replace, fetchMe, getDefaultRoute } = await setup({ isAuth0Mode: true });

    expect(fetchMe).toHaveBeenCalledTimes(1);
    expect(getDefaultRoute).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/evaluator/assignments');
    expect(sessionStorage.getItem('auth_redirect')).toBeNull();
  });

  it('falls back to role-based default route when no stored redirect exists', async () => {
    const { replace, getDefaultRoute } = await setup({ isAuth0Mode: true });

    expect(getDefaultRoute).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('redirects to login when profile fetch fails', async () => {
    sessionStorage.setItem('auth_redirect', '/stale/redirect');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const { replace } = await setup({
      isAuth0Mode: true,
      fetchMeRejects: true,
    });

    expect(errorSpy).toHaveBeenCalledWith('Auth callback error:', expect.any(Error));
    expect(replace).toHaveBeenCalledWith('/login');
    expect(sessionStorage.getItem('auth_redirect')).toBeNull();

    errorSpy.mockRestore();
  });
});
