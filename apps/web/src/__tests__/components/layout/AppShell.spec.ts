import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

interface SetupOptions {
  isMockMode: boolean;
}

async function setup(options: SetupOptions) {
  const push = vi.fn();
  const logout = vi.fn();

  vi.resetModules();

  vi.doMock('vue-router', () => ({
    useRouter: () => ({ push }),
  }));

  vi.doMock('../../../stores/auth', () => ({
    useAuthStore: () => ({ logout }),
  }));

  vi.doMock('../../../auth/mode', () => ({
    isMockAuthMode: options.isMockMode,
  }));

  const { default: AppShell } = await import('../../../components/layout/AppShell.vue');

  const wrapper = mount(AppShell, {
    props: {
      user: {
        firstName: 'Test',
        lastName: 'User',
      },
    },
    slots: {
      default: '<div>Page content</div>',
    },
    global: {
      stubs: {
        AppHeader: {
          template:
            '<div><button class="logout" @click="$emit(\'logout\')">logout</button></div>',
        },
        AppFooter: {
          template: '<footer>Footer</footer>',
        },
      },
    },
  });

  return {
    wrapper,
    push,
    logout,
  };
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs out and redirects to login in mock auth mode', async () => {
    const { wrapper, logout, push } = await setup({ isMockMode: true });

    await wrapper.find('button.logout').trigger('click');

    expect(logout).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/login');
  });

  it('logs out without local redirect in Auth0 mode', async () => {
    const { wrapper, logout, push } = await setup({ isMockMode: false });

    await wrapper.find('button.logout').trigger('click');

    expect(logout).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
