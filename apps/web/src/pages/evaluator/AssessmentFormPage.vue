<template>
  <AppShell :user="currentUser">
    <!-- Admin nav when coming from data verification -->
    <AdminSubNav v-if="isAdminView" />

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
      <button
        type="button"
        class="mt-4 inline-block px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        @click="navigateBack"
      >
        Go Back
      </button>
    </div>

    <template v-else-if="assessment">
      <!-- Re-evaluation Mode Banner (only for completed assessments) -->
      <div v-if="assessment.status === 'COMPLETED'" class="mt-6 mb-4 border border-yellow-300 bg-yellow-50 rounded-lg px-5 py-4 flex items-start gap-3">
        <AlertTriangle class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-bold text-yellow-900">Re-evaluation Mode</p>
          <p class="text-xs text-yellow-800 mt-0.5">
            This assessment has been completed. Any changes will be recorded as a re-evaluation in the history log.
          </p>
        </div>
      </div>

      <!-- TOP BACK LINK -->
      <div class="mt-4 mb-2">
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-800 transition-colors"
          @click="navigateBack"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          {{ backLabel }}
        </button>
      </div>

      <!-- STUDENT CONTEXT HEADER -->
      <section class="mt-2 mb-6">
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
              class="px-3 py-1 text-xs font-bold rounded"
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
              :disabled="isFormReadOnly"
              class="px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors text-center"
              :class="activeOpiLevelId === level.id
                ? 'border-[#0f3f52] bg-[#0f3f52] text-white font-bold'
                : 'border-neutral-200 hover:border-neutral-400 text-neutral-700 disabled:opacity-60 disabled:cursor-default'"
              @click="setActiveOpiLevel(level.id)"
            >
              {{ level.id }}
            </button>
          </div>

          <div class="mt-6 border-t border-neutral-200 pt-4">
            <h3 class="text-base font-semibold text-neutral-800 mb-3">
              Assessment Criteria for Level {{ activeOpiLevelId ?? '-' }}:
            </h3>

            <p v-if="!activeOpiLevelId" class="text-sm text-neutral-500">
              Select an OPI level to view and choose criteria.
            </p>

            <p v-else-if="activeLevelCriteria.length === 0" class="text-sm text-neutral-500">
              No active criteria configured for this level.
            </p>

            <div v-else class="grid gap-2 sm:grid-cols-2">
              <label
                v-for="criteria in activeLevelCriteria"
                :key="criteria.id"
                class="flex items-start gap-2 text-sm text-neutral-700 cursor-pointer"
              >
                <input
                  type="checkbox"
                  class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
                  :checked="activeCriteriaIds.includes(criteria.id)"
                  :disabled="isFormReadOnly"
                  @change="toggleActiveCriteria(criteria.id)"
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
                :disabled="isFormReadOnly"
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
                  accept="audio/mpeg,.mp3"
                  class="hidden"
                  :disabled="isFormReadOnly"
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
            <div class="space-y-3">
              <div v-for="recording in audioRecordings" :key="recording.id" class="p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div class="flex items-center justify-between mb-3">
                  <div>
                    <p class="text-sm font-medium text-neutral-900">{{ recording.fileName }}</p>
                    <p class="text-xs text-neutral-500">
                      Uploaded by {{ recording.uploader.firstName }} {{ recording.uploader.lastName }} &middot; {{ formatFileSize(recording.fileSizeBytes) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded px-3 py-1"
                      :disabled="recordingLoading[recording.id]"
                      @click="playRecording(recording)"
                    >
                      {{ recordingLoading[recording.id] ? 'Loading...' : 'Play' }}
                    </button>
                    <button
                      type="button"
                      class="text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded px-3 py-1"
                      :disabled="recordingLoading[recording.id]"
                      @click="downloadRecording(recording)"
                    >
                      Download
                    </button>
                  </div>
                </div>
                <audio
                  :id="`audio-player-${recording.id}`"
                  :src="getPlaybackUrl(recording)"
                  controls
                  class="w-full h-10"
                  preload="metadata"
                >
                  Your browser does not support the audio element.
                </audio>
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
            v-model="activeNotes"
            :disabled="isFormReadOnly"
            rows="5"
            class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:bg-neutral-50 resize-y"
            placeholder="Enter any additional observations, comments, or notes about the student's performance..."
          ></textarea>

          <!-- Re-evaluation Required checkbox (admin view only) -->
          <div v-if="assessment.status === 'COMPLETED'" class="mt-4 pt-4 border-t border-neutral-200">
            <label class="flex items-start gap-2 cursor-pointer">
              <input
                v-model="reEvalForm.flagForReview"
                type="checkbox"
                class="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
              />
              <div>
                <span class="text-sm font-semibold text-neutral-800">Re-evaluation Required?</span>
                <p class="text-xs text-neutral-500 mt-0.5">Check this box if this assessment requires a future re-evaluation</p>
              </div>
            </label>
          </div>

          <!-- Reason for re-evaluation (admin view, required) -->
          <div v-if="assessment.status === 'COMPLETED'" class="mt-4">
            <label class="block text-sm font-semibold text-neutral-700 mb-1">
              Reason for Change <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="reEvalForm.reason"
              rows="2"
              class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 resize-y"
              placeholder="Explain why the score is being changed..."
            ></textarea>
          </div>
        </BaseCard>
      </section>

      <!-- Completion Details + Last Re-evaluation Details (all users on completed assessments) -->
      <div v-if="assessment.status === 'COMPLETED'" class="mb-4">
        <div class="rounded-lg border border-green-200 bg-green-50 p-5">
          <h3 class="text-sm font-bold text-green-900 uppercase tracking-wider mb-3">Completion Details</h3>
          <div class="space-y-1.5 text-sm">
            <div class="flex gap-2">
              <span class="text-green-700 font-medium">Completed by:</span>
              <span class="font-bold text-green-900">
                {{ assessment.evaluator ? `${assessment.evaluator.firstName} ${assessment.evaluator.lastName}` : 'Unknown' }}
              </span>
            </div>
            <div class="flex gap-2">
              <span class="text-green-700 font-medium">Completed on:</span>
              <span class="font-bold text-green-900">{{ formatDateShort(assessment.completedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Last Re-evaluation Details (only if re-evaluated after completion) -->
        <div v-if="hasBeenReEvaluated && assessment.score?.updater" class="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-5">
          <h3 class="text-sm font-bold text-blue-900 uppercase tracking-wider mb-3">Last Re-evaluation Details</h3>
          <div class="space-y-1.5 text-sm">
            <div class="flex gap-2">
              <span class="text-blue-700 font-medium">Updated by:</span>
              <span class="font-bold text-blue-900">
                {{ `${assessment.score.updater.firstName} ${assessment.score.updater.lastName}` }}
              </span>
            </div>
            <div class="flex gap-2">
              <span class="text-blue-700 font-medium">Last update:</span>
              <span class="font-bold text-blue-900">{{ formatDateTime(assessment.lastModifiedAt) }}</span>
            </div>
            <div v-if="assessment.score.opiLevel" class="flex gap-2">
              <span class="text-blue-700 font-medium">Current OPI Level:</span>
              <span class="font-bold text-blue-900">{{ assessment.score.opiLevel.description }}</span>
            </div>
          </div>
        </div>

        <!-- Re-evaluation save feedback (only shown during active re-eval session) -->
        <div v-if="canReEvaluate && reEvalError" class="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {{ reEvalError }}
        </div>
        <div v-if="canReEvaluate && reEvalSuccess" class="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          {{ reEvalSuccess }}
        </div>
      </div>

      <!-- Assessment History Timeline -->
      <BaseCard class="mb-6">
        <AssessmentHistoryTimeline :assessment-id="assessment.id" :refresh-key="historyRefreshKey" />
      </BaseCard>

      <!-- BOTTOM ACTION BAR -->
      <div class="sticky bottom-0 bg-white border-t border-neutral-200 py-4 -mx-6 px-6 mt-6">
        <div class="flex flex-wrap gap-3 justify-between">
          <button
            type="button"
            class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50 inline-flex items-center gap-1"
            @click="navigateBack"
          >
            <ArrowLeft class="w-3.5 h-3.5" />
            {{ backLabel }}
          </button>

          <!-- Admin action buttons -->
          <div v-if="assessment.status === 'COMPLETED'" class="flex gap-3">
            <button
              type="button"
              :disabled="isMarkingAbsent || isFormReadOnly || assessment.status === 'COMPLETED'"
              class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 text-neutral-600 rounded px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
              @click="markAbsent"
            >
              {{ isMarkingAbsent ? 'Marking...' : 'Absent from Assessment' }}
            </button>
            <button
              type="button"
              :disabled="isSaving || isFormReadOnly || assessment.status === 'COMPLETED'"
              class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 text-neutral-700 rounded px-4 py-2 hover:bg-neutral-50 disabled:opacity-50"
              @click="saveDraft"
            >
              {{ isSaving ? 'Saving...' : 'Save Progress' }}
            </button>
            <button
              type="button"
              :disabled="!canSubmitReEval || isReEvaluating"
              class="text-xs font-semibold uppercase tracking-wider bg-neutral-900 text-white rounded px-5 py-2 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="submitReEvaluation"
            >
              {{ isReEvaluating ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>

          <!-- Evaluator action buttons -->
          <div v-else class="flex gap-3">
            <button
              type="button"
              :disabled="isMarkingAbsent || isFormReadOnly"
              class="text-xs font-semibold uppercase tracking-wider border border-red-300 text-red-700 bg-red-50 rounded px-4 py-2 hover:bg-red-100 disabled:opacity-50"
              @click="markAbsent"
            >
              {{ isMarkingAbsent ? 'Marking...' : 'Absent from Assessment' }}
            </button>
            <button
              type="button"
              :disabled="isSaving || isFormReadOnly"
              class="text-xs font-semibold uppercase tracking-wider border border-yellow-300 text-yellow-800 bg-yellow-50 rounded px-4 py-2 hover:bg-yellow-100 disabled:opacity-50"
              @click="saveDraft"
            >
              {{ isSaving ? 'Saving...' : 'Save Progress' }}
            </button>
            <button
              type="button"
              :disabled="!canComplete"
              :title="canCompleteReason"
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { Mic, Upload, ArrowLeft, AlertTriangle } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../composables/useToast';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import AssessmentHistoryTimeline from '../../components/assessment/AssessmentHistoryTimeline.vue';
import AudioRecorder from '../../components/audio/AudioRecorder.vue';
import { getEnv } from '../../utils/env';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const API_BASE = getEnv('VITE_API_URL') || 'http://localhost:3000/api/v1';

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
const historyRefreshKey = ref(0);

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
const recordingBlobUrls = ref<Record<number, string>>({});
const recordingLoading = ref<Record<number, boolean>>({});

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
    updatedAt?: string;
    opiLevel?: { description: string };
    updater?: {
      id: number;
      firstName: string;
      lastName: string;
    };
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

// Detect admin context from query param
const sourceView = computed(() => String(route.query.from || ''));
const returnTo = computed(() => {
  const value = route.query.returnTo;
  return typeof value === 'string' && value.length > 0 ? value : null;
});
const isAdminView = computed(() => sourceView.value === 'admin-verification' && authStore.isAdmin);
const isCoordinatorVerificationView = computed(() => sourceView.value === 'coordinator-verification' && authStore.isCoordinator);

// Computed
const backUrl = computed(() => {
  if (returnTo.value) {
    return returnTo.value;
  }
  if (isAdminView.value) {
    return '/admin/data-verification';
  }
  if (isCoordinatorVerificationView.value) {
    return '/coordinator/data-verification';
  }
  return '/evaluator/assignments';
});

const backLabel = computed(() => {
  if (isAdminView.value) return 'Back to Data Verification';
  if (isCoordinatorVerificationView.value) return 'Back to Data Verification';
  if (sourceView.value === 'evaluator-class-view') return 'Back to Class View';
  if (sourceView.value === 'evaluator-class-students') return 'Back to Class Students';
  if (sourceView.value === 'evaluator-dashboard') return 'Back to Dashboard';
  return 'Back to Assignments';
});

const canUseBrowserBack = computed(() => window.history.length > 1);
const isFinalizedAssessment = computed(() => {
  return assessment.value?.status === 'COMPLETED' || assessment.value?.status === 'ABSENT';
});
const isFormReadOnly = computed(() => {
  if (!assessment.value) {
    return true;
  }
  if (assessment.value.status === 'ABSENT') {
    return true;
  }
  return assessment.value.status === 'COMPLETED' && !canReEvaluate.value;
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
         !isFinalizedAssessment.value &&
         audioRecordings.value.length > 0;
});

const canCompleteReason = computed(() => {
  const missing: string[] = [];
  if (form.value.opiLevelId === null) missing.push('select an OPI score');
  if (audioRecordings.value.length === 0) missing.push('upload an audio recording');
  if (missing.length === 0) return '';
  return `To complete: ${missing.join(' and ')}`;
});

// Re-evaluation state (Coordinator/Admin only)
// Auto-expand re-eval form when admin opens a completed assessment
const showReEvaluateForm = ref(false);
const isReEvaluating = ref(false);
const reEvalError = ref<string | null>(null);
const reEvalSuccess = ref<string | null>(null);
const reEvalForm = ref({
  opiLevelId: null as number | null,
  reason: '',
  notes: '',
  criteriaIds: [] as number[],
  flagForReview: false,
});

// Unified active-form computed properties — in admin view these point to reEvalForm, otherwise form
const isReEvalMode = computed(() => assessment.value?.status === 'COMPLETED');

const activeOpiLevelId = computed(() =>
  isReEvalMode.value ? reEvalForm.value.opiLevelId : form.value.opiLevelId,
);

const activeLevelCriteria = computed(() => {
  const levelId = activeOpiLevelId.value;
  if (!levelId) return [];
  return opiLevels.value.find((l) => l.id === levelId)?.criteria ?? [];
});

const activeCriteriaIds = computed(() =>
  isReEvalMode.value ? reEvalForm.value.criteriaIds : form.value.criteriaIds,
);

const activeNotes = computed({
  get: () => (isReEvalMode.value ? reEvalForm.value.notes : form.value.notes),
  set: (v: string) => {
    if (isReEvalMode.value) {
      reEvalForm.value.notes = v;
    } else {
      form.value.notes = v;
    }
  },
});

function setActiveOpiLevel(levelId: number) {
  if (isFormReadOnly.value) return;
  if (isReEvalMode.value) {
    reEvalForm.value.opiLevelId = levelId;
  } else {
    form.value.opiLevelId = levelId;
  }
}

function toggleActiveCriteria(criteriaId: number) {
  if (isFormReadOnly.value) return;
  if (isReEvalMode.value) {
    toggleCriteria('reeval', criteriaId);
  } else {
    toggleCriteria('form', criteriaId);
  }
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toISOString().split('T')[0];
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

const hasBeenReEvaluated = computed(() => {
  if (!assessment.value?.completedAt || !assessment.value?.lastModifiedAt) return false;
  return new Date(assessment.value.lastModifiedAt) > new Date(assessment.value.completedAt);
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

const canReEvaluate = computed(() => true);

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
      headers: await getAuthHeaders(),
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
    historyRefreshKey.value += 1;
    // Re-initialize form with the freshly saved data so the UI reflects the update
    reEvalForm.value = {
      opiLevelId: form.value.opiLevelId,
      reason: '',
      notes: form.value.notes,
      criteriaIds: [...form.value.criteriaIds],
      flagForReview: false,
    };
    reEvalSuccess.value = 'Re-evaluation saved successfully.';
    setTimeout(() => {
      reEvalSuccess.value = null;
    }, 4000);
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

function navigateBack() {
  if (canUseBrowserBack.value) {
    router.back();
    return;
  }

  router.push(backUrl.value);
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
  reEvalSuccess.value = null;

  if (!showReEvaluateForm.value) {
    return;
  }

  reEvalForm.value = {
    opiLevelId: form.value.opiLevelId,
    reason: '',
    notes: form.value.notes,
    criteriaIds: [...form.value.criteriaIds],
    flagForReview: false,
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

async function getAuthHeaders(includeContentType = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeContentType) headers['Content-Type'] = 'application/json';
  const token = await authStore.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}


function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getPlaybackUrl(recording: AudioRecording): string {
  if (recordingBlobUrls.value[recording.id]) {
    return recordingBlobUrls.value[recording.id];
  }
  return '';
}

async function ensureRecordingBlobUrl(recording: AudioRecording): Promise<string> {
  const cached = recordingBlobUrls.value[recording.id];
  if (cached) {
    return cached;
  }

  recordingLoading.value = { ...recordingLoading.value, [recording.id]: true };
  try {
    const downloadUrl = recording.downloadUrl.startsWith('http')
      ? recording.downloadUrl
      : `${API_BASE}${recording.downloadUrl.replace(/^\/api\/v1/, '')}`;
    const response = await fetch(downloadUrl, {
      headers: await getAuthHeaders(false),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Unable to download audio file');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    recordingBlobUrls.value = {
      ...recordingBlobUrls.value,
      [recording.id]: blobUrl,
    };
    return blobUrl;
  } finally {
    recordingLoading.value = { ...recordingLoading.value, [recording.id]: false };
  }
}

async function playRecording(recording: AudioRecording) {
  try {
    const url = await ensureRecordingBlobUrl(recording);
    const element = document.getElementById(`audio-player-${recording.id}`) as HTMLAudioElement | null;
    if (!element) return;
    if (element.src !== url) {
      element.src = url;
      element.load();
    }
    await element.play();
  } catch (err) {
    audioUploadError.value = err instanceof Error ? err.message : 'Failed to play recording';
  }
}

async function downloadRecording(recording: AudioRecording) {
  try {
    const url = await ensureRecordingBlobUrl(recording);
    const link = document.createElement('a');
    link.href = url;
    link.download = recording.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    audioUploadError.value = err instanceof Error ? err.message : 'Failed to download recording';
  }
}

function clearRecordingBlobUrls() {
  Object.values(recordingBlobUrls.value).forEach((url) => URL.revokeObjectURL(url));
  recordingBlobUrls.value = {};
  recordingLoading.value = {};
}

// Handle file upload from file picker
async function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0 || !assessment.value || isFormReadOnly.value) return;

  const file = input.files[0];
  if (!['audio/mpeg', 'audio/mp3'].includes(file.type)) {
    audioUploadError.value = 'Only MP3 files are allowed';
    input.value = '';
    return;
  }

  // Validate size (50MB max)
  if (file.size > 50 * 1024 * 1024) {
    audioUploadError.value = 'File size exceeds 50MB limit';
    return;
  }

  try {
    const formData = new FormData();
    
    // Create friendly timestamp: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const dateStr = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + 
      String(now.getMinutes()).padStart(2, '0') + 
      String(now.getSeconds()).padStart(2, '0');
      
    // Use original extension or fallback to mp3
    const extension = file.name.split('.').pop() || 'mp3';
    const friendlyName = `assessment-${assessment.value.id}-${dateStr}_${timeStr}.${extension}`;

    formData.append('file', file, friendlyName);

    const response = await fetch(`${API_BASE}/assessments/${assessment.value.id}/audio`, {
      method: 'POST',
      headers: await getAuthHeaders(false),
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
  if (!assessment.value || isFormReadOnly.value) return;
  
  try {
    const formData = new FormData();
    const extension = blob.type.includes('webm')
      ? 'webm'
      : blob.type.includes('ogg')
        ? 'ogg'
        : blob.type.includes('mp4')
          ? 'mp4'
          : 'mp3';
          
    // Create friendly timestamp: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const dateStr = now.getFullYear() + 
      String(now.getMonth() + 1).padStart(2, '0') + 
      String(now.getDate()).padStart(2, '0');
    const timeStr = String(now.getHours()).padStart(2, '0') + 
      String(now.getMinutes()).padStart(2, '0') + 
      String(now.getSeconds()).padStart(2, '0');
      
    const friendlyName = `assessment-${assessment.value.id}-${dateStr}_${timeStr}.${extension}`;
    
    formData.append('file', blob, friendlyName);
    
    const response = await fetch(`${API_BASE}/assessments/${assessment.value.id}/audio`, {
      method: 'POST',
      headers: await getAuthHeaders(false),
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
    const data = await api.get<AudioRecording[]>(`/assessments/${assessment.value.id}/audio`);
    clearRecordingBlobUrls();
    audioRecordings.value = data;
  } catch (error) {
    console.error('Error fetching audio recordings:', error);
  }
}

onBeforeUnmount(() => {
  clearRecordingBlobUrls();
});

// API calls
async function fetchAssessment() {
  const assessmentId = route.params.assessmentId;
  if (!assessmentId) return;

  try {
    // Fetch assessment
    const res = await fetch(`${API_BASE}/assessments/${assessmentId}`, {
      headers: await getAuthHeaders(),
      credentials: 'include',
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch assessment');
    }

    assessment.value = await res.json();

    // Fetch OPI levels
    const levelsRes = await fetch(`${API_BASE}/assessments/opi-levels`, {
      headers: await getAuthHeaders(),
      credentials: 'include',
    });
    if (levelsRes.ok) {
      opiLevels.value = await levelsRes.json();
    }

    syncFormWithAssessment();

    // Initialize reEvalForm for any completed assessment so re-evaluation fields are pre-populated
    if (assessment.value?.status === 'COMPLETED') {
      toggleReEvaluateForm();
    }

    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

async function saveDraft() {
  if (!assessment.value || isFormReadOnly.value) return;

  isSaving.value = true;
  try {
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
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
    historyRefreshKey.value += 1;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to save draft');
  } finally {
    isSaving.value = false;
  }
}

async function markAbsent() {
  if (!assessment.value || isFormReadOnly.value) return;

  if (!confirm('Are you sure you want to mark this student as absent? This action cannot be undone.')) {
    return;
  }

  isMarkingAbsent.value = true;
  try {
    try {
      assessment.value = await api.post<Assessment>(`/assessments/${assessment.value.id}/mark-absent`);
      historyRefreshKey.value += 1;
    } catch (apiError) {
      const message = apiError instanceof Error ? apiError.message : 'Failed to mark absent';
      const raw = message.replace(/^API Error: \d+ - /, '');
      let err: { error?: string; message?: string } = {};
      try {
        err = JSON.parse(raw);
      } catch {
        throw apiError;
      }

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
    
    // Show success and redirect after brief delay
    setTimeout(() => {
      navigateBack();
    }, 1500);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to mark absent');
  } finally {
    isMarkingAbsent.value = false;
  }
}

async function handleSubmit() {
  if (!assessment.value || !form.value.opiLevelId || isFormReadOnly.value) return;

  isCompleting.value = true;
  try {
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}/complete`, {
      method: 'POST',
      headers: await getAuthHeaders(),
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
    historyRefreshKey.value += 1;
    
    // Show success and redirect after brief delay
    setTimeout(() => {
      navigateBack();
    }, 1500);
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to complete assessment');
  } finally {
    isCompleting.value = false;
  }
}

onMounted(async () => {
  await fetchAssessment();
  await fetchAudioRecordings();
});
</script>
