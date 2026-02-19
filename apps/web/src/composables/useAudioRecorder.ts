import { ref, reactive, computed } from 'vue';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  error: string | null;
}

export function useAudioRecorder() {
  const mediaRecorder = ref<MediaRecorder | null>(null);
  const audioChunks = ref<Blob[]>([]);
  const stream = ref<MediaStream | null>(null);

  const state = reactive<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    error: null,
  });

  let startTime: number | null = null;
  let durationInterval: number | null = null;

  const isSupported = computed(() => {
    return 'MediaRecorder' in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  });

  const startRecording = async () => {
    try {
      state.error = null;
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: false,
      });

      stream.value = mediaStream;
      audioChunks.value = [];

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });
        state.audioBlob = audioBlob;
        state.isRecording = false;
        state.isPaused = false;
        
        if (durationInterval) {
          clearInterval(durationInterval);
          durationInterval = null;
        }
      };

      mediaRecorder.value = recorder;
      recorder.start();
      
      state.isRecording = true;
      startTime = Date.now();
      
      // Start duration tracking
      durationInterval = setInterval(() => {
        if (startTime) {
          state.duration = Math.floor((Date.now() - startTime) / 1000);
        }
      }, 100);

    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to start recording';
      console.error('Audio recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.value && state.isRecording) {
      mediaRecorder.value.stop();
      
      if (stream.value) {
        stream.value.getTracks().forEach(track => track.stop());
        stream.value = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder.value && state.isRecording && !state.isPaused) {
      mediaRecorder.value.pause();
      state.isPaused = true;
      
      if (durationInterval) {
        clearInterval(durationInterval);
        durationInterval = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder.value && state.isRecording && state.isPaused) {
      mediaRecorder.value.resume();
      state.isPaused = false;
      
      startTime = Date.now() - (state.duration * 1000);
      durationInterval = setInterval(() => {
        if (startTime) {
          state.duration = Math.floor((Date.now() - startTime) / 1000);
        }
      }, 100);
    }
  };

  const resetRecording = () => {
    state.audioBlob = null;
    state.duration = 0;
    state.error = null;
    audioChunks.value = [];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    state,
    isSupported,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    formatDuration,
  };
}
