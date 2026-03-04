import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AudioRecorder from '../../../components/audio/AudioRecorder.vue';

// Mock the useAudioRecorder composable
vi.mock('../../../composables/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    state: {
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      error: null,
    },
    isSupported: true,
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    pauseRecording: vi.fn(),
    resumeRecording: vi.fn(),
    resetRecording: vi.fn(),
    formatDuration: vi.fn((seconds: number) => `${seconds.toString().padStart(2, '0')}:00`),
  }),
}));

describe('AudioRecorder', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('should render recording controls when MediaRecorder is supported', () => {
    const wrapper = mount(AudioRecorder, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    expect(wrapper.find('.recorder-controls').exists()).toBe(true);
    expect(wrapper.text()).toContain('Status:');
    expect(wrapper.text()).toContain('Ready');
    expect(wrapper.text()).toContain('00:00');
  });

  it('should show file upload fallback when MediaRecorder is not supported', async () => {
    // Mock unsupported browser
    vi.mock('../../../composables/useAudioRecorder', () => ({
      useAudioRecorder: () => ({
        state: {
          isRecording: false,
          isPaused: false,
          duration: 0,
          audioBlob: null,
          error: null,
        },
        isSupported: false,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        pauseRecording: vi.fn(),
        resumeRecording: vi.fn(),
        resetRecording: vi.fn(),
        formatDuration: vi.fn((seconds: number) => `${seconds.toString().padStart(2, '0')}:00`),
      }),
    }));

    const wrapper = mount(AudioRecorder, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.not-supported').exists()).toBe(true);
    expect(wrapper.text()).toContain('Audio Recording Not Supported');
    expect(wrapper.text()).toContain('Your browser doesn\'t support audio recording');
  });

  it('should enable upload button when recording is ready', async () => {
    // Mock composable with ready recording
    vi.mock('../../../composables/useAudioRecorder', () => ({
      useAudioRecorder: () => ({
        state: {
          isRecording: false,
          isPaused: false,
          duration: 120,
          audioBlob: new Blob(['audio data'], { type: 'audio/webm' }),
          error: null,
        },
        isSupported: true,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        pauseRecording: vi.fn(),
        resumeRecording: vi.fn(),
        resetRecording: vi.fn(),
        formatDuration: vi.fn((seconds: number) => `${seconds.toString().padStart(2, '0')}:00`),
      }),
    }));

    const wrapper = mount(AudioRecorder, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.audio-preview').exists()).toBe(true);
    expect(wrapper.text()).toContain('Recording Preview');
    expect(wrapper.text()).toContain('02:00');
  });

  it('should emit audioRecorded event when recording stops', async () => {
    const mockAudioBlob = new Blob(['audio data'], { type: 'audio/webm' });
    
    // Mock composable to return audio blob on stop
    const mockStopRecording = vi.fn();
    vi.mock('../../../composables/useAudioRecorder', () => ({
      useAudioRecorder: () => ({
        state: {
          isRecording: true,
          isPaused: false,
          duration: 60,
          audioBlob: mockAudioBlob,
          error: null,
        },
        isSupported: true,
        startRecording: vi.fn(),
        stopRecording: mockStopRecording,
        pauseRecording: vi.fn(),
        resumeRecording: vi.fn(),
        resetRecording: vi.fn(),
        formatDuration: vi.fn((seconds: number) => `${seconds.toString().padStart(2, '0')}:00`),
      }),
    }));

    const wrapper = mount(AudioRecorder, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    // Find and click the stop button
    const stopButton = wrapper.findAll('button').find((button) => button.text().includes('Stop'));
    expect(stopButton).toBeDefined();
    if (!stopButton) throw new Error('Stop button not found');

    await stopButton.trigger('click');

    expect(mockStopRecording).toHaveBeenCalled();
    const audioRecordedEvents = wrapper.emitted('audioRecorded');
    expect(audioRecordedEvents).toBeTruthy();
    expect(audioRecordedEvents?.[0]).toEqual([mockAudioBlob]);
  });

  it('should display error message when recording fails', async () => {
    // Mock composable with error
    vi.mock('../../../composables/useAudioRecorder', () => ({
      useAudioRecorder: () => ({
        state: {
          isRecording: false,
          isPaused: false,
          duration: 0,
          audioBlob: null,
          error: 'Microphone access denied',
        },
        isSupported: true,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        pauseRecording: vi.fn(),
        resumeRecording: vi.fn(),
        resetRecording: vi.fn(),
        formatDuration: vi.fn((seconds: number) => `${seconds.toString().padStart(2, '0')}:00`),
      }),
    }));

    const wrapper = mount(AudioRecorder, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.bg-red-50').exists()).toBe(true);
    expect(wrapper.text()).toContain('Recording Error');
    expect(wrapper.text()).toContain('Microphone access denied');
  });

  it('should format file size correctly', async () => {
    // Mock composable with audio blob
    vi.mock('../../../composables/useAudioRecorder', () => ({
      useAudioRecorder: () => ({
        state: {
          isRecording: false,
          isPaused: false,
          duration: 60,
          audioBlob: new Blob(['audio data'], { type: 'audio/webm' }),
          error: null,
        },
        isSupported: true,
        startRecording: vi.fn(),
        stopRecording: vi.fn(),
        pauseRecording: vi.fn(),
        resumeRecording: vi.fn(),
        resetRecording: vi.fn(),
        formatDuration: vi.fn((seconds: number) => `${seconds.toString().padStart(2, '0')}:00`),
      }),
    }));

    const wrapper = mount(AudioRecorder, {
      global: {
        stubs: {
          AppShell: true,
          BaseCard: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Size:');
    // The component should format the blob size
    expect(wrapper.text()).toMatch(/\d+(\.\d+)?\s+(Bytes|KB|MB|GB)/);
  });
});
