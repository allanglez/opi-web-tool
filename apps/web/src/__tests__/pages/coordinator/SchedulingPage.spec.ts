import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SchedulingPage from '../../../../pages/coordinator/SchedulingPage.vue';
import AppShell from '../../../../components/layout/AppShell.vue';
import BaseCard from '../../../../components/ui/BaseCard.vue';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('SchedulingPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should render page title and navigation', () => {
    const wrapper = mount(SchedulingPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    expect(wrapper.text()).toContain('School Scheduling');
    expect(wrapper.text()).toContain('Set school-level assessment dates for the active cycle.');
    expect(wrapper.text()).toContain('Dashboard');
    expect(wrapper.text()).toContain('Assignments');
  });

  it('should display loading state for schools', () => {
    const wrapper = mount(SchedulingPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    // Set loading state
    wrapper.vm.isLoadingSchools = true;

    expect(wrapper.find('.animate-spin').exists()).toBe(true);
  });

  it('should display error state', async () => {
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const wrapper = mount(SchedulingPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('Retry');
  });

  it('should display school selection and dates', async () => {
    const mockSchools = [
      {
        id: 1,
        schoolCode: 'SCH001',
        name: 'Test School',
      },
      {
        id: 2,
        schoolCode: 'SCH002',
        name: 'Another School',
      },
    ];

    const mockDatesResponse = {
      ok: true,
      json: () => Promise.resolve({
        cycle: { id: 1, name: 'Test Cycle' },
        school: {
          id: 1,
          schoolCode: 'SCH001',
          name: 'Test School',
        },
        dates: [
          {
            id: 1,
            assessmentDate: '2026-05-15T00:00:00.000Z',
            roundId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            assessmentDate: '2026-05-16T00:00:00.000Z',
            roundId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schools: mockSchools }),
      })
      .mockResolvedValueOnce(mockDatesResponse);

    const wrapper = mount(SchedulingPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('School');
    expect(wrapper.text()).toContain('Select a school...');
    expect(wrapper.text()).toContain('Test School (SCH001)');
    expect(wrapper.text()).toContain('Another School (SCH002)');
    expect(wrapper.text()).toContain('Assessment Dates for Test School (SCH001)');
    expect(wrapper.text()).toContain('2026-05-15');
    expect(wrapper.text()).toContain('2026-05-16');
  });

  it('should handle bulk date addition', async () => {
    const mockSchools = [
      {
        id: 1,
        schoolCode: 'SCH001',
        name: 'Test School',
      },
    ];

    const mockBulkResponse = {
      ok: true,
      json: () => Promise.resolve({
        recordsTotal: 2,
        recordsProcessed: 2,
        recordsInserted: 2,
        recordsSkipped: 0,
      }),
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ schools: mockSchools }),
      })
      .mockResolvedValueOnce(mockBulkResponse);

    const wrapper = mount(SchedulingPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Select school
    await wrapper.vm.selectedSchoolId = 1;
    await wrapper.vm.$nextTick();

    // Add dates
    const newDates = ['2026-05-20', '2026-05-21'];
    await wrapper.vm.addDates(newDates);

    expect(wrapper.vm.successMessage).toContain('Successfully added 2 assessment dates');
  });
});
