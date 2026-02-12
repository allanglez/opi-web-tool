import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CoordinatorDashboardPage from '../../../../pages/coordinator/CoordinatorDashboardPage.vue';
import AppShell from '../../../../components/layout/AppShell.vue';
import BaseCard from '../../../../components/ui/BaseCard.vue';
import StatCard from '../../../../components/ui/StatCard.vue';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('CoordinatorDashboardPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should render page title and navigation', () => {
    const wrapper = mount(CoordinatorDashboardPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          StatCard: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Coordinator Dashboard');
    expect(wrapper.text()).toContain('Track assignment coverage and school scheduling readiness.');
    expect(wrapper.text()).toContain('Manage Assignments');
    expect(wrapper.text()).toContain('Manage Schedule');
  });

  it('should display loading state', () => {
    const wrapper = mount(CoordinatorDashboardPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          StatCard: true,
        },
      },
    });

    // Set loading state
    wrapper.vm.isLoading = true;

    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it('should display error state', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const wrapper = mount(CoordinatorDashboardPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          StatCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('Retry');
  });

  it('should display school coverage data', async () => {
    const mockSchools = [
      {
        id: 1,
        schoolCode: 'SCH001',
        name: 'Test School',
        includedClassCount: 5,
        assignedClassCount: 3,
        unassignedClassCount: 2,
        scheduledDateCount: 1,
        isFullyAssigned: false,
      },
      {
        id: 2,
        schoolCode: 'SCH002',
        name: 'Another School',
        includedClassCount: 3,
        assignedClassCount: 3,
        unassignedClassCount: 0,
        scheduledDateCount: 2,
        isFullyAssigned: true,
      },
    ];

    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        cycle: { id: 1, name: 'Test Cycle' },
        schools: mockSchools,
        summary: {
          totalSchools: 2,
          assignedSchools: 1,
          unassignedSchools: 1,
        },
      }),
    };

    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

    const wrapper = mount(CoordinatorDashboardPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          StatCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('School Coverage');
    expect(wrapper.text()).toContain('(Test Cycle)');
    expect(wrapper.text()).toContain('Schools');
    expect(wrapper.text()).toContain('Fully Assigned');
    expect(wrapper.text()).toContain('Need Assignment');
    expect(wrapper.text()).toContain('Scheduled');
    expect(wrapper.text()).toContain('Test School');
    expect(wrapper.text()).toContain('SCH001');
    expect(wrapper.text()).toContain('Another School');
    expect(wrapper.text()).toContain('Pending');
    expect(wrapper.text()).toContain('Ready');
  });

  it('should display no schools message', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({
        cycle: { id: 1, name: 'Test Cycle' },
        schools: [],
        summary: {
          totalSchools: 0,
          assignedSchools: 0,
          unassignedSchools: 0,
        },
      }),
    };

    (globalThis.fetch as any).mockResolvedValueOnce(mockResponse);

    const wrapper = mount(CoordinatorDashboardPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          StatCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('No included schools found for the active cycle.');
  });
});
