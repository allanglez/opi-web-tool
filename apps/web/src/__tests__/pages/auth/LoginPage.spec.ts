import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

interface SetupOptions {
  isMockMode: boolean;
  isAuth0Mode: boolean;
  routeQuery?: Record<string, string>;
}

async function setup(options: SetupOptions) {
  const push = vi.fn();
  const fetchMe = vi.fn().mockResolvedValue(undefined);
  const getDefaultRoute = vi.fn(() => '/admin/dashboard');
  const loginWithAuth0Redirect = vi.fn().mockResolvedValue(undefined);

  vi.resetModules();

  vi.doMock('vue-router', () => ({
    useRouter: () => ({ push }),
    useRoute: () => ({ query: options.routeQuery ?? {} }),
  }));

  vi.doMock('../../../stores/auth', () => ({
    useAuthStore: () => ({
      fetchMe,
      getDefaultRoute,
    }),
  }));

  vi.doMock('../../../auth/mode', () => ({
    isMockAuthMode: options.isMockMode,
    isAuth0Mode: options.isAuth0Mode,
  }));

  vi.doMock('../../../auth/auth0', () => ({
    loginWithAuth0Redirect,
  }));

  const { default: LoginPage } = await import('../../../pages/auth/LoginPage.vue');

  const wrapper = mount(LoginPage);

  return {
    wrapper,
    push,
    fetchMe,
    getDefaultRoute,
    loginWithAuth0Redirect,
  };
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('logs in mock admin and redirects to the default route', async () => {
    const { wrapper, fetchMe, push, getDefaultRoute } = await setup({
      isMockMode: true,
      isAuth0Mode: false,
    });

    const adminButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Login as Admin'));

    expect(adminButton).toBeDefined();

    await adminButton!.trigger('click');
    await flushPromises();

    expect(fetchMe).toHaveBeenCalledWith(1);
    expect(getDefaultRoute).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('uses redirect query when present in mock mode', async () => {
    const { wrapper, push } = await setup({
      isMockMode: true,
      isAuth0Mode: false,
      routeQuery: { redirect: '/coordinator/assignments' },
    });

    const coordinatorButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Login as Coordinator'));

    expect(coordinatorButton).toBeDefined();

    await coordinatorButton!.trigger('click');
    await flushPromises();

    expect(push).toHaveBeenCalledWith('/coordinator/assignments');
  });

  it('starts Auth0 login and stores redirect in session storage', async () => {
    const { wrapper, loginWithAuth0Redirect } = await setup({
      isMockMode: false,
      isAuth0Mode: true,
      routeQuery: { redirect: '/evaluator/dashboard' },
    });

    await wrapper.get('#email-address').setValue('jane.doe@evaluator.com');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sessionStorage.getItem('auth_redirect')).toBe('/evaluator/dashboard');
    expect(loginWithAuth0Redirect).toHaveBeenCalledWith({
      authorizationParams: {
        login_hint: 'jane.doe@evaluator.com',
      },
    });
  });

  it('clears stale redirect when Auth0 login starts without redirect query', async () => {
    sessionStorage.setItem('auth_redirect', '/stale/route');

    const { wrapper, loginWithAuth0Redirect } = await setup({
      isMockMode: false,
      isAuth0Mode: true,
    });

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sessionStorage.getItem('auth_redirect')).toBeNull();
    expect(loginWithAuth0Redirect).toHaveBeenCalledWith(undefined);
  });

  it('shows an alert when Auth0 redirect login fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    const { wrapper, loginWithAuth0Redirect } = await setup({
      isMockMode: false,
      isAuth0Mode: true,
    });

    loginWithAuth0Redirect.mockRejectedValueOnce(new Error('redirect failed'));

    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(errorSpy).toHaveBeenCalledWith('Auth0 login error:', expect.any(Error));
    expect(alertSpy).toHaveBeenCalledWith('Unable to start login. Please try again.');

    errorSpy.mockRestore();
    alertSpy.mockRestore();
  });
});
