<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black bg-opacity-50" @click="$emit('close')"></div>

    <!-- Modal -->
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
        <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider">Class Assessment Notes</h2>
        <button
          class="text-sm font-semibold text-red-600 border border-red-300 rounded px-3 py-1 hover:bg-red-50"
          @click="$emit('close')"
        >
          Close
        </button>
      </div>

      <!-- Class Info -->
      <div class="px-6 py-2 bg-neutral-50 border-b border-neutral-200">
        <p class="text-lg font-bold text-neutral-900">{{ classInfo.classCode }}</p>
        <p class="text-sm text-neutral-600">
          {{ classInfo.school.name }} | {{ classInfo.teacher || 'N/A' }} | Grade {{ classInfo.grade || 'N/A' }} {{ classInfo.program?.name || '' }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-neutral-900"></div>
      </div>

      <!-- Content -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <!-- Add New Note Form -->
        <div class="px-6 py-2 border-b border-neutral-200 bg-white flex-shrink-0">
          <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-2">Add New Note</h3>
          <p class="text-xs text-neutral-500 mb-3">
            Share observations about this class's strengths, challenges, or progress.
          </p>
          <textarea
            v-model="newNoteText"
            rows="1"
            class="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
            placeholder="e.g., Strong pronunciation across the class, excellent use of past tense..."
          ></textarea>

          <!-- Save Status -->
          <div class="flex items-center justify-between mt-3">
            <p v-if="saveError" class="text-sm text-red-600">{{ saveError }}</p>
            <div v-else></div>

            <button
              :disabled="isSaving || !newNoteText.trim()"
              class="text-sm font-semibold border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="addNote"
            >
              {{ isSaving ? 'Adding...' : 'Add Note' }}
            </button>
          </div>
        </div>

        <!-- Notes Timeline -->
        <div class="px-6 py-4 border-b border-neutral-200 bg-white flex-shrink-0">
          <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider">
            Notes History ({{ notes.length }})
          </h3>
        </div>

        <!-- Scrollable Notes List -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- Empty State -->
          <div v-if="notes.length === 0" class="text-center py-8">
            <p class="text-neutral-500 text-sm">No notes yet. Be the first to add one!</p>
          </div>

          <!-- Notes List -->
          <div v-else class="space-y-4">
            <div
              v-for="note in notes"
              :key="note.id"
              class="border border-neutral-200 rounded-lg p-4 bg-neutral-50 hover:bg-neutral-100 transition-colors"
            >
              <div class="flex items-start justify-between mb-2">
                <div>
                  <p class="text-sm font-bold text-neutral-900">
                    {{ note.createdBy.firstName }} {{ note.createdBy.lastName }}
                  </p>
                  <p class="text-xs text-neutral-500">
                    {{ formatDateTime(note.createdAt) }}
                  </p>
                </div>
              </div>
              <p class="text-sm text-neutral-700 whitespace-pre-wrap">{{ note.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '../../utils/api';

interface ClassInfo {
  id: number;
  classCode: string;
  grade: number | null;
  school: { id: number; name: string };
  program: { id: number; name: string } | null;
  teacher: string | null;
}

interface ClassNote {
  id: number;
  note: string;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

const props = defineProps<{
  classInfo: ClassInfo;
}>();

defineEmits<{
  close: [];
}>();

const isLoading = ref(true);
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const newNoteText = ref('');
const notes = ref<ClassNote[]>([]);

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

async function fetchNotes() {
  try {
    notes.value = await api.get<ClassNote[]>(`/evaluator/classes/${props.classInfo.id}/notes`);
  } catch (e) {
    console.error('Failed to fetch notes:', e);
  } finally {
    isLoading.value = false;
  }
}

async function addNote() {
  if (!newNoteText.value.trim()) return;

  isSaving.value = true;
  saveError.value = null;

  try {
    const newNote = await api.post<ClassNote>(`/evaluator/classes/${props.classInfo.id}/notes`, {
      note: newNoteText.value,
    });
    notes.value.unshift(newNote);
    newNoteText.value = '';
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Failed to add note';
  } finally {
    isSaving.value = false;
  }
}

onMounted(() => {
  fetchNotes();
});
</script>
