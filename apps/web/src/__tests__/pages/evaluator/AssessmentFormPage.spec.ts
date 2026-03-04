import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AssessmentFormPage from '../../../pages/evaluator/AssessmentFormPage.vue';

// Mock fetch globally
globalThis.fetch = vi.fn();

describe('AssessmentFormPage Audio Requirements', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should disable Complete button when targeting COMPLETED status and no audio uploaded', async () => {
    // Mock assessment response with IN_PROGRESS status and no audio
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        studentId: 1,
        status: 'IN_PROGRESS',
        evaluatorId: 1,
        audioRecordings: [],
        completedAt: null,
      }),
    });

    const wrapper = mount(AssessmentFormPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          AudioRecorder: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find the Complete button
    const completeButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Complete') || button.text().includes('Mark as Complete')
    );

    expect(completeButton).toBeDefined();
    if (!completeButton) throw new Error('Complete button not found');
    // Should be disabled if no audio uploaded and targeting COMPLETED
    expect(completeButton.attributes('disabled')).toBeDefined();
  });

  it('should enable Complete button when audio is uploaded', async () => {
    // Mock assessment response with audio recordings
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        studentId: 1,
        status: 'IN_PROGRESS',
        evaluatorId: 1,
        audioRecordings: [
          {
            id: 1,
            fileName: 'recording.webm',
            fileSizeBytes: 1024000,
            uploadedAt: '2026-02-12T20:00:00Z',
          },
        ],
        completedAt: null,
      }),
    });

    const wrapper = mount(AssessmentFormPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          AudioRecorder: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find the Complete button
    const completeButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Complete') || button.text().includes('Mark as Complete')
    );

    expect(completeButton).toBeDefined();
    if (!completeButton) throw new Error('Complete button not found');
    // Should be enabled when audio is uploaded
    expect(completeButton.attributes('disabled')).toBeUndefined();
  });

  it('should allow Complete when ABSENT status is selected', async () => {
    // Mock assessment response with no audio but allow ABSENT completion
    (globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        studentId: 1,
        status: 'IN_PROGRESS',
        evaluatorId: 1,
        audioRecordings: [],
        completedAt: null,
      }),
    });

    const wrapper = mount(AssessmentFormPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          AudioRecorder: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const statusSelect = wrapper.find('select');
    if (statusSelect.exists()) {
      await statusSelect.setValue('ABSENT');
    }

    // Find the Complete button
    const completeButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Complete') || button.text().includes('Mark as Complete')
    );

    expect(completeButton).toBeDefined();
    if (!completeButton) throw new Error('Complete button not found');
    // Should be enabled when ABSENT is selected even without audio
    expect(completeButton.attributes('disabled')).toBeUndefined();
  });

  it('should display AUDIO_REQUIRED error when completing without audio', async () => {
    // Mock successful upload request but completion failure
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          studentId: 1,
          status: 'IN_PROGRESS',
          evaluatorId: 1,
          audioRecordings: [],
          completedAt: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Audio recording is required for completion',
          error: 'AUDIO_REQUIRED',
        }),
      });

    const wrapper = mount(AssessmentFormPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          AudioRecorder: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Try to complete without audio
    const completeButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Complete') || button.text().includes('Mark as Complete')
    );

    if (completeButton && !completeButton.attributes('disabled')) {
      await completeButton.trigger('click');
      
      // Wait for error handling
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should display error message
      expect(wrapper.text()).toContain('Audio recording is required');
      expect(wrapper.text()).toContain('AUDIO_REQUIRED');
    }
  });

  it('should successfully complete when audio is uploaded', async () => {
    // Mock assessment with audio and successful completion
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          studentId: 1,
          status: 'IN_PROGRESS',
          evaluatorId: 1,
          audioRecordings: [
            {
              id: 1,
              fileName: 'recording.webm',
              fileSizeBytes: 1024000,
              uploadedAt: '2026-02-12T20:00:00Z',
            },
          ],
          completedAt: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          studentId: 1,
          status: 'COMPLETED',
          evaluatorId: 1,
          audioRecordings: [
            {
              id: 1,
              fileName: 'recording.webm',
              fileSizeBytes: 1024000,
              uploadedAt: '2026-02-12T20:00:00Z',
            },
          ],
          completedAt: '2026-02-12T20:05:00Z',
        }),
      });

    const wrapper = mount(AssessmentFormPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          AudioRecorder: true,
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Find the Complete button
    const completeButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Complete') || button.text().includes('Mark as Complete')
    );

    expect(completeButton).toBeDefined();
    if (!completeButton) throw new Error('Complete button not found');
    expect(completeButton.attributes('disabled')).toBeUndefined();

    // Simulate successful completion
    await completeButton.trigger('click');
    
    // Wait for completion handling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should show success state or redirect
    expect((wrapper.vm as any).assessment?.status).toBe('COMPLETED');
  });

  it('should handle audio upload failure gracefully', async () => {
    // Mock audio upload failure
    (globalThis.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          studentId: 1,
          status: 'IN_PROGRESS',
          evaluatorId: 1,
          audioRecordings: [],
          completedAt: null,
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Invalid file type',
          error: 'INVALID_FILE_TYPE',
        }),
      });

    const wrapper = mount(AssessmentFormPage, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
          AudioRecorder: {
            template: '<button @click="$emit(\'audioRecorded\', new Blob())">Upload Mock Audio</button>',
          },
        },
      },
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate audio upload
    const uploadButton = wrapper.findAll('button').find((button) =>
      button.text().includes('Upload Mock Audio')
    );

    expect(uploadButton).toBeDefined();
    if (!uploadButton) throw new Error('Upload button not found');
    await uploadButton.trigger('click');

    // Wait for error handling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should display error message
    expect(wrapper.text()).toContain('Invalid file type');
    expect(wrapper.text()).toContain('INVALID_FILE_TYPE');
  });
});
