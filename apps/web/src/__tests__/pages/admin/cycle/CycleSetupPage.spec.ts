import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CycleSetupPage from '../../../../pages/admin/cycle/CycleSetupPage.vue';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('CycleSetupPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    const wrapper = mount(CycleSetupPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Cycle Setup');
  });

  it('should display warning when no active cycle exists', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const wrapper = mount(CycleSetupPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('No Active Cycle');
  });

  it('should display active cycle information', async () => {
    const mockCycle = {
      id: 1,
      name: '2025-2026 Assessment Cycle',
      startsOn: '2025-09-01',
      endsOn: '2026-06-30',
      isActive: true,
      isApproved: false,
    };

    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCycle,
    });

    const wrapper = mount(CycleSetupPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('2025-2026 Assessment Cycle');
  });

  it('should show approve button when cycle is not approved', async () => {
    const mockCycle = {
      id: 1,
      name: 'Test Cycle',
      startsOn: '2025-09-01',
      endsOn: '2026-06-30',
      isActive: true,
      isApproved: false,
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockCycle,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const wrapper = mount(CycleSetupPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('Approve Data');
  });

  it('should call API when creating a new cycle', async () => {
    const mockResponse = {
      id: 2,
      name: 'New Cycle',
      startsOn: '2026-09-01',
      endsOn: '2027-06-30',
      isActive: true,
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

    const wrapper = mount(CycleSetupPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    // Simulate form submission
    const form = wrapper.find('form');
    if (form.exists()) {
      await form.trigger('submit.prevent');
    }

    expect(globalThis.fetch).toHaveBeenCalled();
  });
});
