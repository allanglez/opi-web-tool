import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppHeader from '../../../components/layout/AppHeader.vue';

describe('AppHeader', () => {
  it('renders full user name when first and last name are provided', () => {
    const wrapper = mount(AppHeader, {
      props: {
        user: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
        },
      },
    });

    expect(wrapper.text()).toContain('Jane Doe');
    expect(wrapper.text()).toContain('Sign out');
  });

  it('falls back to email when name is not available', () => {
    const wrapper = mount(AppHeader, {
      props: {
        user: {
          email: 'user@example.com',
        },
      },
    });

    expect(wrapper.text()).toContain('user@example.com');
  });

  it('emits logout when sign out is clicked', async () => {
    const wrapper = mount(AppHeader, {
      props: {
        user: {
          firstName: 'Jane',
          lastName: 'Doe',
        },
      },
    });

    const logoutButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Sign out'));

    expect(logoutButton).toBeDefined();
    await logoutButton!.trigger('click');

    expect(wrapper.emitted('logout')).toHaveLength(1);
  });

  it('emits toggleMenu when menu button is clicked', async () => {
    const wrapper = mount(AppHeader, {
      props: {
        user: null,
      },
    });

    const menuButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Menu'));

    expect(menuButton).toBeDefined();
    await menuButton!.trigger('click');

    expect(wrapper.emitted('toggleMenu')).toHaveLength(1);
  });
});
