<template>
  <div class="audio-recorder">
    <div v-if="!isSupported" class="not-supported">
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div class="flex">
          <TriangleAlert class="w-6 h-6 text-yellow-600 mr-3" />
          <div>
            <h4 class="text-lg font-medium text-yellow-800">Audio Recording Not Supported</h4>
            <p class="text-yellow-700 mt-1">Your browser doesn't support audio recording. Please use the file upload option below.</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="props.disabled" class="recorder-controls opacity-50 pointer-events-none">
      <div class="flex space-x-3 mb-4">
        <button
          disabled
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic class="w-5 h-5 mr-2" />
          Start Recording
        </button>
      </div>
    </div>

    <div v-else class="recorder-controls">
      <!-- Recording Status -->
      <div class="mb-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="text-sm text-gray-500">Status:</div>
            <div class="flex items-center">
              <div v-if="state.isRecording" class="flex items-center">
                <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span class="text-red-600 font-medium">Recording</span>
              </div>
              <div v-else-if="state.isPaused" class="flex items-center">
                <div class="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <span class="text-yellow-600 font-medium">Paused</span>
              </div>
              <div v-else class="flex items-center">
                <div class="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                <span class="text-gray-600 font-medium">Ready</span>
              </div>
            </div>
          </div>
          <div class="text-lg font-mono text-gray-700">
            {{ formatDuration(state.duration) }}
          </div>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="state.error" class="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
        <div class="flex">
          <CircleX class="w-6 h-6 text-red-600 mr-3" />
          <div>
            <h4 class="text-lg font-medium text-red-800">Recording Error</h4>
            <p class="text-red-700 mt-1">{{ state.error }}</p>
          </div>
        </div>
      </div>

      <!-- Control Buttons -->
      <div class="flex space-x-3 mb-4">
        <button
          v-if="!state.isRecording"
          :disabled="props.isLoading"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          @click="startRecording"
        >
          <Mic class="w-5 h-5 mr-2" />
          Start Recording
        </button>

        <button
          v-if="state.isRecording && !state.isPaused"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          @click="pauseRecording"
        >
          <Pause class="w-5 h-5 mr-2" />
          Pause
        </button>

        <button
          v-if="state.isRecording && state.isPaused"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          @click="resumeRecording"
        >
          <Play class="w-5 h-5 mr-2" />
          Resume
        </button>

        <button
          v-if="state.isRecording"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          @click="stopRecordingWithEmit"
        >
          <Square class="w-5 h-5 mr-2" />
          Stop
        </button>

        <button
          v-if="state.audioBlob"
          class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          @click="resetRecording"
        >
          <Eraser class="w-5 h-5 mr-2" />
          Clear
        </button>
      </div>

      <!-- Audio Preview -->
      <div v-if="state.audioBlob" class="audio-preview">
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 class="text-lg font-medium text-gray-900 mb-3">Recording Preview</h4>
          <audio 
            controls 
            :src="audioUrl" 
            class="w-full mb-3"
          ></audio>
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">
              Duration: {{ formatDuration(state.duration) }}
            </div>
            <div class="text-sm text-gray-500">
              Size: {{ formatFileSize(state.audioBlob.size) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  CircleX,
  Eraser,
  Mic,
  Pause,
  Play,
  Square,
  TriangleAlert,
} from 'lucide-vue-next';
import { useAudioRecorder } from '../../composables/useAudioRecorder';

interface Props {
  isLoading?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  disabled: false,
});

const emit = defineEmits<{
  audioRecorded: [blob: Blob];
}>();

const {
  state,
  isSupported,
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  resetRecording,
  formatDuration,
} = useAudioRecorder();

const audioUrl = computed(() => {
  return state.audioBlob ? URL.createObjectURL(state.audioBlob) : '';
});

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Emit audio blob when recording is complete
const stopRecordingWithEmit = async () => {
  const blob = await stopRecording();
  if (blob) {
    emit('audioRecorded', blob);
  }
};

defineExpose({ resetRecording });
</script>
