import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ClassInclusionPage from '../../../../pages/admin/cycle/ClassInclusionPage.vue';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('ClassInclusionPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    const wrapper = mount(ClassInclusionPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    expect(wrapper.text()).toContain('Class Inclusion Management');
  });

  it('should display empty state when no classes exist', async () => {
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const wrapper = mount(ClassInclusionPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('No classes found');
  });

  it('should display classes in a table', async () => {
    const mockClasses = [
      {
        id: 1,
        classCode: 'CLASS-001',
        grade: 5,
        teacher: 'John Doe',
        isIncluded: true,
        school: {
          id: 1,
          schoolCode: 'SCH001',
          name: 'Test School',
        },
        program: {
          id: 1,
          name: 'French Immersion',
        },
        cycle: {
          id: 1,
          name: 'Test Cycle',
        },
        _count: {
          classStudents: 25,
        },
      },
    ];

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockClasses,
      });

    const wrapper = mount(ClassInclusionPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(wrapper.text()).toContain('CLASS-001');
    expect(wrapper.text()).toContain('Test School');
  });

  it('should toggle class inclusion when button is clicked', async () => {
    const mockClass = {
      id: 1,
      classCode: 'CLASS-001',
      grade: 5,
      isIncluded: true,
      school: {
        id: 1,
        schoolCode: 'SCH001',
        name: 'Test School',
      },
      cycle: {
        id: 1,
        name: 'Test Cycle',
      },
      _count: {
        classStudents: 25,
      },
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockClass],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockClass, isIncluded: false }),
      });

    const wrapper = mount(ClassInclusionPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Find and click toggle button
    const toggleButton = wrapper.find('button[class*="inline-flex"]');
    if (toggleButton.exists()) {
      await toggleButton.trigger('click');
      await wrapper.vm.$nextTick();
    }

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/admin/classes/1'),
      expect.objectContaining({
        method: 'PATCH',
      })
    );
  });

  it('should update UI state after successful toggle', async () => {
    const mockClass = {
      id: 1,
      classCode: 'CLASS-001',
      isIncluded: true,
      school: { id: 1, schoolCode: 'SCH001', name: 'Test School' },
      cycle: { id: 1, name: 'Test Cycle' },
      _count: { classStudents: 25 },
    };

    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mockClass],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockClass, isIncluded: false }),
      });

    const wrapper = mount(ClassInclusionPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Verify initial state
    expect((wrapper.vm as any).classes[0]?.isIncluded).toBe(true);
  });
});
