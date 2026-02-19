<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>

    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider">Class Assessment Notes</h2>
        <button
          class="text-sm font-semibold text-red-600 border border-red-300 rounded px-3 py-1 hover:bg-red-50"
          @click="$emit('close')"
        >
          &times; Close
        </button>
      </div>

      <!-- Class Info -->
      <div class="px-6 py-4 bg-neutral-50 border-b border-neutral-200">
        <p class="text-lg font-bold text-neutral-900">{{ classInfo.classCode }}</p>
        <p class="text-sm text-neutral-600">
          {{ classInfo.school.name }} | {{ classInfo.teacher || 'N/A' }} | Grade {{ classInfo.grade || 'N/A' }} {{ classInfo.program?.name || '' }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900"></div>
      </div>

      <!-- Notes Form -->
      <div v-else class="px-6 py-6">
        <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2">Overall Class Strengths</h3>
        <p class="text-xs text-neutral-500 mb-3">
          What are this cohort's main linguistic strengths? (vocabulary, pronunciation, confidence, etc.)
        </p>
        <textarea
          v-model="noteText"
          rows="6"
          class="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
          placeholder="e.g., Strong pronunciation across the class, excellent use of past tense, confident speakers..."
        ></textarea>

        <!-- Save Status -->
        <div class="flex items-center justify-between mt-4">
          <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
          <p v-else-if="savedAt" class="text-xs text-neutral-500">Last saved: {{ formatDateTime(savedAt) }}</p>
          <div v-else></div>

          <button
            :disabled="isSaving"
            class="text-sm font-semibold border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
            @click="saveNotes"
          >
            {{ isSaving ? 'Saving...' : 'Save Notes' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';

interface ClassInfo {
  id: number;
  classCode: string;
  grade: number | null;
  school: { id: number; name: string };
  program: { id: number; name: string } | null;
  teacher: string | null;
}

const props = defineProps<{
  classInfo: ClassInfo;
}>();

defineEmits<{
  close: [];
}>();

const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const isLoading = ref(true);
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const noteText = ref('');
const savedAt = ref<string | null>(null);

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  const h = hours % 12 || 12;
  return `${month}-${day}, ${h}:${minutes} ${ampm}`;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}

async function fetchNotes() {
  try {
    const res = await fetch(`${API_BASE}/evaluator/classes/${props.classInfo.id}/notes`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      noteText.value = data.note || '';
      savedAt.value = data.updatedAt || null;
    }
  } catch (e) {
    console.error('Failed to fetch notes:', e);
  } finally {
    isLoading.value = false;
  }
}

async function saveNotes() {
  isSaving.value = true;
  saveError.value = null;

  try {
    const res = await fetch(`${API_BASE}/evaluator/classes/${props.classInfo.id}/notes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ note: noteText.value }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save notes');
    }

    const data = await res.json();
    savedAt.value = data.updatedAt;
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Failed to save notes';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  fetchNotes();
});
</script>
