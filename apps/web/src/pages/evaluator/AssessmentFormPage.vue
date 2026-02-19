<template>
  <AppShell :user="currentUser">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mt-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchAssessment">Retry</button>
    </div>

    <!-- Lock Conflict Warning -->
    <div v-else-if="assessment?.isLocked" class="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center mt-6">
      <p class="text-orange-800 text-lg mb-2">Assessment Locked</p>
      <p class="text-orange-700">
        This assessment is currently being worked on by
        <strong>{{ assessment.evaluator?.firstName }} {{ assessment.evaluator?.lastName }}</strong>.
      </p>
      <router-link
        :to="backUrl"
        class="mt-4 inline-block px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
      >
        Go Back
      </router-link>
    </div>

    <template v-else-if="assessment">
      <section v-if="assessment.status === 'COMPLETED' && canReEvaluate" class="mt-6 mb-4">
        <BaseCard>
          <div class="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3">
            <p class="text-sm font-semibold text-yellow-900">Re-evaluation Mode</p>
            <p class="text-xs text-yellow-800 mt-1">
              This assessment has been completed. Any changes will be recorded in the history log.
            </p>
          </div>
        </BaseCard>
      </section>

      <!-- STUDENT CONTEXT HEADER -->
      <section class="mt-6 mb-6">
        <BaseCard>
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-xl font-bold text-neutral-900 uppercase tracking-wider mb-3">
                Oral Proficiency Interview Assessment
              </h1>
              <dl class="text-sm space-y-1">
                <div class="flex gap-2">
                  <dt class="font-semibold text-neutral-700">Student:</dt>
                  <dd class="text-neutral-900">{{ assessment.student.firstName }} {{ assessment.student.lastName }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-semibold text-neutral-700">Grade:</dt>
                  <dd class="text-neutral-600">{{ assessment.classContext?.grade || assessment.student.grade || 'N/A' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-semibold text-neutral-700">School:</dt>
                  <dd class="text-neutral-600">{{ assessment.classContext?.schoolName || 'N/A' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-semibold text-neutral-700">Program:</dt>
                  <dd class="text-neutral-600">{{ assessment.classContext?.programName || 'N/A' }}</dd>
                </div>
                <div class="flex gap-2">
                  <dt class="font-semibold text-neutral-700">Teacher:</dt>
                  <dd class="text-neutral-600">{{ assessment.classContext?.teacherName || 'N/A' }}</dd>
                </div>
              </dl>
            </div>
            <span
              class="px-3 py-1 text-xs font-medium rounded-full"
              :class="statusClass"
            >
              {{ assessment.status.replace('_', ' ') }}
            </span>
          </div>
        </BaseCard>
      </section>

      <!-- OPI SCORE SELECTION -->
      <section class="mb-6">
        <BaseCard>
          <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider mb-4">OPI Score Selection</h2>
          <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
            <button
              v-for="level in opiLevels"
              :key="level.id"
              type="button"
              :disabled="assessment.status === 'COMPLETED'"
              class="px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors text-center"
              :class="form.opiLevelId === level.id
                ? 'border-neutral-900 bg-neutral-100 text-neutral-900 font-bold'
                : 'border-neutral-200 hover:border-neutral-400 text-neutral-700'"
              @click="form.opiLevelId = level.id"
            >
              {{ level.id }}
            </button>
          </div>

          <div class="mt-6 border-t border-neutral-200 pt-4">
            <h3 class="text-base font-semibold text-neutral-800 mb-3">
              Assessment Criteria for Level {{ form.opiLevelId ?? '-' }}:
            </h3>

            <p v-if="!form.opiLevelId" class="text-sm text-neutral-500">
              Select an OPI level to view and choose criteria.
            </p>

            <p v-else-if="selectedLevelCriteria.length === 0" class="text-sm text-neutral-500">
              No active criteria configured for this level.
            </p>

            <div v-else class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="criteria in selectedLevelCriteria"
                :key="criteria.id"
                class="flex items-start gap-2 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                  :checked="form.criteriaIds.includes(criteria.id)"
                  :disabled="assessment.status === 'COMPLETED'"
                  @change="toggleCriteria('form', criteria.id)"
                />
                <span>{{ criteria.description }}</span>
              </label>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- RECORD ASSESSMENT -->
      <section class="mb-6">
        <BaseCard>
          <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider mb-4">Record Assessment</h2>

          <!-- In-App Recording -->
          <div class="mb-6">
            <h3 class="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-3">In-App Recording</h3>
            <div class="border border-neutral-200 rounded-lg p-6 text-center bg-neutral-50">
              <div class="mb-3">
                <Mic class="w-12 h-12 mx-auto text-neutral-400" />
              </div>
              <p class="font-bold text-neutral-900 uppercase tracking-wider text-sm mb-1">Start Recording Assessment</p>
              <p class="text-xs text-neutral-500 mb-4">Click the record button to begin the OPI assessment recording</p>
              <AudioRecorder
                :is-loading="isSaving"
                @audio-recorded="handleAudioRecorded"
              />
            </div>
          </div>

          <!-- Upload External File -->
          <div class="mb-4">
            <h3 class="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-3">Or Upload External File</h3>
            <div class="border border-neutral-200 rounded-lg p-6 text-center bg-neutral-50">
              <div class="mb-3">
                <Upload class="w-12 h-12 mx-auto text-neutral-400" />
              </div>
              <p class="font-bold text-neutral-900 uppercase tracking-wider text-sm mb-1">Upload External Audio File</p>
              <p class="text-xs text-neutral-500 mb-4">Recommended format: MP3, Maximum size: 50MB</p>
              <label class="inline-block text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-100 cursor-pointer">
                Select File
                <input
                  type="file"
                  accept="audio/*"
                  class="hidden"
                  @change="handleFileUpload"
                />
              </label>
            </div>
          </div>

          <!-- Audio Upload Error -->
          <div v-if="audioUploadError" class="mt-3 bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm text-red-700">{{ audioUploadError }}</p>
          </div>

          <!-- Uploaded Recordings -->
          <div v-if="audioRecordings.length > 0" class="mt-4">
            <h4 class="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-3">Uploaded Recordings</h4>
            <div class="space-y-2">
              <div v-for="recording in audioRecordings" :key="recording.id" class="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <div>
                  <p class="text-sm font-medium text-neutral-900">{{ recording.fileName }}</p>
                  <p class="text-xs text-neutral-500">
                    Uploaded by {{ recording.uploader.firstName }} {{ recording.uploader.lastName }} &middot; {{ formatFileSize(recording.fileSizeBytes) }}
                  </p>
                </div>
                <a
                  :href="recording.downloadUrl"
                  download
                  class="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded px-3 py-1"
                >
                  Download
                </a>
              </div>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- ADDITIONAL NOTES -->
      <section class="mb-6">
        <BaseCard>
          <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider mb-4">Additional Notes</h2>
          <textarea
            v-model="form.notes"
            :disabled="assessment.status === 'COMPLETED'"
            rows="5"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:bg-neutral-50 resize-y"
            placeholder="Enter any additional observations, comments, or notes about the student's performance..."
          ></textarea>
        </BaseCard>
      </section>

      <!-- Completed View -->
      <div v-if="assessment.status === 'COMPLETED'" class="mb-6">
        <BaseCard>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-green-800">
              Assessment completed on {{ formatDate(assessment.completedAt) }}
            </p>
          </div>
        </BaseCard>
      </div>

      <!-- Re-evaluation Section (Coordinator/Admin only) -->
      <BaseCard v-if="assessment.status === 'COMPLETED' && canReEvaluate" class="mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-neutral-900">Re-evaluate Assessment</h3>
          <button
            class="text-sm text-orange-600 hover:text-orange-800 font-medium"
            @click="toggleReEvaluateForm"
          >
            {{ showReEvaluateForm ? 'Cancel' : 'Change Score' }}
          </button>
        </div>

        <div v-if="showReEvaluateForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">New OPI Level <span class="text-red-500">*</span></label>
            <div class="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2">
              <button
                v-for="level in opiLevels"
                :key="level.id"
                type="button"
                class="px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors"
                :class="reEvalForm.opiLevelId === level.id
                  ? 'border-orange-600 bg-orange-50 text-orange-800'
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'"
                @click="reEvalForm.opiLevelId = level.id"
              >
                {{ level.id }}
              </button>
            </div>
          </div>

          <div v-if="reEvalForm.opiLevelId" class="border-t border-neutral-200 pt-4">
            <h4 class="text-sm font-semibold text-neutral-800 mb-2">
              Assessment Criteria for Level {{ reEvalForm.opiLevelId }}
            </h4>

            <p v-if="selectedReEvalLevelCriteria.length === 0" class="text-sm text-neutral-500">
              No active criteria configured for this level.
            </p>

            <div v-else class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="criteria in selectedReEvalLevelCriteria"
                :key="criteria.id"
                class="flex items-start gap-2 text-sm text-neutral-700"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-orange-700 focus:ring-orange-500"
                  :checked="reEvalForm.criteriaIds.includes(criteria.id)"
                  @change="toggleCriteria('reeval', criteria.id)"
                />
                <span>{{ criteria.description }}</span>
              </label>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">Reason for Change <span class="text-red-500">*</span></label>
            <textarea
              v-model="reEvalForm.reason"
              rows="2"
              class="w-full rounded-md border-neutral-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="Explain why the score is being changed..."
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-2">Updated Notes (Optional)</label>
            <textarea
              v-model="reEvalForm.notes"
              rows="2"
              class="w-full rounded-md border-neutral-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="Additional notes..."
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button
              :disabled="!canSubmitReEval || isReEvaluating"
              class="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="submitReEvaluation"
            >
              {{ isReEvaluating ? 'Saving...' : 'Submit Re-evaluation' }}
            </button>
            <button
              class="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-md hover:bg-neutral-200"
              @click="showReEvaluateForm = false"
            >
              Cancel
            </button>
          </div>

          <div v-if="reEvalError" class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
            {{ reEvalError }}
          </div>
        </div>
      </BaseCard>

      <!-- Assessment History Timeline -->
      <BaseCard class="mb-6">
        <AssessmentHistoryTimeline :assessment-id="assessment.id" />
      </BaseCard>

      <!-- BOTTOM ACTION BAR -->
      <div v-if="assessment.status !== 'COMPLETED'" class="sticky bottom-0 bg-white border-t border-neutral-200 py-4 -mx-6 px-6 mt-6">
        <div class="flex flex-wrap gap-3 justify-between">
          <router-link
            :to="backUrl"
            class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50"
          >
            &larr; Back to Assignments
          </router-link>
          <div class="flex gap-3">
            <button
              type="button"
              :disabled="isMarkingAbsent"
              class="text-xs font-semibold uppercase tracking-wider border border-red-300 text-red-700 bg-red-50 rounded px-4 py-2 hover:bg-red-100 disabled:opacity-50"
              @click="markAbsent"
            >
              {{ isMarkingAbsent ? 'Marking...' : 'Absent from Assessment' }}
            </button>
            <button
              type="button"
              :disabled="isSaving"
              class="text-xs font-semibold uppercase tracking-wider border border-yellow-300 text-yellow-800 bg-yellow-50 rounded px-4 py-2 hover:bg-yellow-100 disabled:opacity-50"
              @click="saveDraft"
            >
              {{ isSaving ? 'Saving...' : 'Save Progress' }}
            </button>
            <button
              type="button"
              :disabled="!canComplete"
              class="text-xs font-semibold uppercase tracking-wider border border-green-300 text-green-800 bg-green-50 rounded px-4 py-2 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleSubmit"
            >
              {{ isCompleting ? 'Completing...' : 'Complete Assessment' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Mic, Upload } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import AssessmentHistoryTimeline from '../../components/assessment/AssessmentHistoryTimeline.vue';
import AudioRecorder from '../../components/audio/AudioRecorder.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// User info
const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

// State
const isLoading = ref(true);
const error = ref<string | null>(null);
const isSaving = ref(false);
const isCompleting = ref(false);
const isMarkingAbsent = ref(false);
const audioUploadError = ref<string | null>(null);

interface AudioRecording {
  id: number;
  fileName: string;
  fileSizeBytes: number;
  downloadUrl: string;
  uploader: {
    firstName: string;
    lastName: string;
  };
}

const audioRecordings = ref<AudioRecording[]>([]);

interface AssessmentCriteria {
  id: number;
  opiLevelId: number;
  description: string;
}

interface AssessmentCriteriaResult {
  criteriaId: number;
  met: boolean;
  criteria: AssessmentCriteria;
}

interface Assessment {
  id: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  lastModifiedAt?: string;
  isLocked: boolean;
  student: {
    id: number;
    studentNumber: string;
    firstName: string;
    lastName: string;
    grade?: number | null;
  };
  evaluator?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  score?: {
    opiLevelId: number;
    notes?: string;
    opiLevel?: { description: string };
  };
  criteriaResults?: AssessmentCriteriaResult[];
  classContext?: {
    classId: number;
    classCode: string;
    grade: number | null;
    schoolName: string | null;
    programName: string | null;
    teacherName: string | null;
  };
}

interface OpiLevel {
  id: number;
  code?: string;
  description: string;
  criteria?: AssessmentCriteria[];
}

const assessment = ref<Assessment | null>(null);
const opiLevels = ref<OpiLevel[]>([]);

const form = ref({
  opiLevelId: null as number | null,
  notes: '',
  criteriaIds: [] as number[],
});

// Computed
const backUrl = computed(() => {
  if (assessment.value?.classContext?.classId) {
    return `/evaluator/classes/${assessment.value.classContext.classId}`;
  }
  return '/evaluator/assignments';
});

const statusClass = computed(() => {
  switch (assessment.value?.status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800';
    case 'ABSENT':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
});

const canComplete = computed(() => {
  return form.value.opiLevelId !== null && 
         !isCompleting.value && 
         !isSaving.value && 
         !isMarkingAbsent.value && 
         audioRecordings.value.length > 0;
});

// Re-evaluation state (Coordinator/Admin only)
const showReEvaluateForm = ref(false);
const isReEvaluating = ref(false);
const reEvalError = ref<string | null>(null);
const reEvalForm = ref({
  opiLevelId: null as number | null,
  reason: '',
  notes: '',
  criteriaIds: [] as number[],
});

const selectedLevelCriteria = computed(() => {
  if (!form.value.opiLevelId) {
    return [];
  }

  const selectedLevel = opiLevels.value.find((level) => level.id === form.value.opiLevelId);
  return selectedLevel?.criteria ?? [];
});

const selectedReEvalLevelCriteria = computed(() => {
  if (!reEvalForm.value.opiLevelId) {
    return [];
  }

  const selectedLevel = opiLevels.value.find((level) => level.id === reEvalForm.value.opiLevelId);
  return selectedLevel?.criteria ?? [];
});

const canReEvaluate = computed(() => {
  return authStore.isAdmin || authStore.isCoordinator;
});

const canSubmitReEval = computed(() => {
  return reEvalForm.value.opiLevelId !== null && 
         reEvalForm.value.reason.trim().length > 0 &&
         !isReEvaluating.value;
});

async function submitReEvaluation() {
  if (!assessment.value || !reEvalForm.value.opiLevelId) return;

  isReEvaluating.value = true;
  reEvalError.value = null;

  try {
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}/re-evaluate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        opiLevelId: reEvalForm.value.opiLevelId,
        reason: reEvalForm.value.reason,
        notes: reEvalForm.value.notes || undefined,
        criteriaIds: reEvalForm.value.criteriaIds,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to re-evaluate assessment');
    }

    assessment.value = await res.json();
    syncFormWithAssessment();
    showReEvaluateForm.value = false;
    reEvalForm.value = { opiLevelId: null, reason: '', notes: '', criteriaIds: [] };
  } catch (e) {
    reEvalError.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isReEvaluating.value = false;
  }
}

function toggleCriteria(mode: 'form' | 'reeval', criteriaId: number) {
  const state = mode === 'form' ? form.value : reEvalForm.value;
  const selectedIds = new Set(state.criteriaIds);

  if (selectedIds.has(criteriaId)) {
    selectedIds.delete(criteriaId);
  } else {
    selectedIds.add(criteriaId);
  }

  state.criteriaIds = [...selectedIds];
}

function syncFormWithAssessment() {
  if (!assessment.value?.score) {
    form.value.opiLevelId = null;
    form.value.notes = '';
    form.value.criteriaIds = [];
    return;
  }

  const levelId = assessment.value.score.opiLevelId;
  form.value.opiLevelId = levelId;
  form.value.notes = assessment.value.score.notes || '';
  form.value.criteriaIds =
    assessment.value.criteriaResults
      ?.filter((result) => result.met && result.criteria.opiLevelId === levelId)
      .map((result) => result.criteriaId) ?? [];
}

function toggleReEvaluateForm() {
  showReEvaluateForm.value = !showReEvaluateForm.value;
  reEvalError.value = null;

  if (!showReEvaluateForm.value) {
    return;
  }

  reEvalForm.value = {
    opiLevelId: form.value.opiLevelId,
    reason: '',
    notes: form.value.notes,
    criteriaIds: [...form.value.criteriaIds],
  };
}

watch(
  () => form.value.opiLevelId,
  (levelId) => {
    if (!levelId) {
      form.value.criteriaIds = [];
      return;
    }

    const allowed = new Set(selectedLevelCriteria.value.map((criteria) => criteria.id));
    form.value.criteriaIds = form.value.criteriaIds.filter((criteriaId) => allowed.has(criteriaId));
  },
);

watch(
  () => reEvalForm.value.opiLevelId,
  (levelId) => {
    if (!levelId) {
      reEvalForm.value.criteriaIds = [];
      return;
    }

    const allowed = new Set(selectedReEvalLevelCriteria.value.map((criteria) => criteria.id));
    reEvalForm.value.criteriaIds = reEvalForm.value.criteriaIds.filter((criteriaId) => allowed.has(criteriaId));
  },
);

function getAuthHeaders(includeContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle file upload from file picker
async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0 || !assessment.value) return;

  const file = input.files[0];
  // Validate size (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    audioUploadError.value = 'File size exceeds 50MB limit';
    return;
  }

  try {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const response = await fetch(`${API_BASE}/assessments/${assessment.value.id}/audio`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      audioUploadError.value = errorData.message || 'Failed to upload audio';
      return;
    }

    audioUploadError.value = null;
    await fetchAudioRecordings();
  } catch (err) {
    audioUploadError.value = err instanceof Error ? err.message : 'Failed to upload audio';
  } finally {
    // Reset input so same file can be selected again
    input.value = '';
  }
}

// Handle audio recording
async function handleAudioRecorded(blob: Blob) {
  if (!assessment.value) return;
  
  try {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    
    const response = await fetch(`${API_BASE}/assessments/${assessment.value.id}/audio`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      audioUploadError.value = errorData.message || 'Failed to upload audio';
      return;
    }

    // Success - refresh recordings
    audioUploadError.value = null;
    await fetchAudioRecordings();
  } catch (error) {
    audioUploadError.value = error instanceof Error ? error.message : 'Failed to upload audio';
  }
}

// Fetch audio recordings for the assessment
async function fetchAudioRecordings() {
  if (!assessment.value) return;
  
  try {
    const response = await fetch(`${API_BASE}/assessments/${assessment.value.id}/audio`, {
      headers: getAuthHeaders(false),
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to fetch audio recordings');
      return;
    }

    const data = await response.json();
    audioRecordings.value = data;
  } catch (error) {
    console.error('Error fetching audio recordings:', error);
  }
}

// API calls
async function fetchAssessment() {
  const assessmentId = route.params.assessmentId;
  if (!assessmentId) return;

  try {
    // Fetch assessment
    const res = await fetch(`${API_BASE}/assessments/${assessmentId}`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch assessment');
    }

    assessment.value = await res.json();

    // Fetch OPI levels
    const levelsRes = await fetch(`${API_BASE}/assessments/opi-levels`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (levelsRes.ok) {
      opiLevels.value = await levelsRes.json();
    }

    syncFormWithAssessment();

    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

async function saveDraft() {
  if (!assessment.value) return;

  isSaving.value = true;
  try {
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        opiLevelId: form.value.opiLevelId,
        notes: form.value.notes,
        criteriaIds: form.value.criteriaIds,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      
      // Handle specific error cases
      if (err.error === 'ASSESSMENT_LOCKED') {
        error.value = `This assessment is currently locked by another evaluator: ${err.details?.evaluatorId || 'Unknown'}. Please try again later.`;
        // Refresh assessment data to get latest lock status
        await fetchAssessment();
        return;
      }
      
      if (err.error === 'NOT_ASSIGNED_TO_CLASS') {
        error.value = 'You are not assigned to this class. Please contact your coordinator.';
        return;
      }
      
      throw new Error(err.message || 'Failed to save draft');
    }

    assessment.value = await res.json();
    syncFormWithAssessment();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to save draft');
  } finally {
    isSaving.value = false;
  }
}

async function markAbsent() {
  if (!assessment.value) return;

  if (!confirm('Are you sure you want to mark this student as absent? This action cannot be undone.')) {
    return;
  }

  isMarkingAbsent.value = true;
  try {
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}/mark-absent`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      const err = await res.json();
      
      // Handle specific error cases
      if (err.error === 'ASSESSMENT_LOCKED') {
        error.value = `This assessment is currently locked by another evaluator. Please try again later.`;
        await fetchAssessment();
        return;
      }
      
      if (err.error === 'NOT_ASSIGNED') {
        error.value = 'You are not assigned to this assessment. Please contact your coordinator.';
        return;
      }
      
      throw new Error(err.message || 'Failed to mark absent');
    }

    assessment.value = await res.json();
    
    // Show success and redirect after brief delay
    setTimeout(() => {
      router.push(backUrl.value);
    }, 1500);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to mark absent');
  } finally {
    isMarkingAbsent.value = false;
  }
}

async function handleSubmit() {
  if (!assessment.value || !form.value.opiLevelId) return;

  isCompleting.value = true;
  try {
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}/complete`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        opiLevelId: form.value.opiLevelId,
        notes: form.value.notes,
        criteriaIds: form.value.criteriaIds,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      
      // Handle specific error cases
      if (err.error === 'ASSESSMENT_LOCKED') {
        error.value = `This assessment is currently locked by another evaluator. Please try again later.`;
        await fetchAssessment();
        return;
      }
      
      if (err.error === 'NOT_ASSIGNED') {
        error.value = 'You are not assigned to this assessment. Please contact your coordinator.';
        return;
      }
      
      if (err.error === 'VALIDATION_ERROR') {
        error.value = err.message || 'Validation error occurred.';
        return;
      }
      
      throw new Error(err.message || 'Failed to complete assessment');
    }

    assessment.value = await res.json();
    
    // Show success and redirect after brief delay
    setTimeout(() => {
      router.push(backUrl.value);
    }, 1500);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to complete assessment');
  } finally {
    isCompleting.value = false;
  }
}

onMounted(async () => {
  await fetchAssessment();
  await fetchAudioRecordings();
});
</script>
