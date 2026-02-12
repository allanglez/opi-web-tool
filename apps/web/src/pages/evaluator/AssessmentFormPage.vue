<template>
  <AppShell :user="currentUser">
    <!-- Back Navigation -->
    <div class="mb-4">
      <router-link 
        :to="backUrl" 
        class="text-blue-600 hover:text-blue-800 text-sm flex items-center"
      >
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Class
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchAssessment">Retry</button>
    </div>

    <!-- Lock Conflict Warning -->
    <div v-else-if="assessment?.isLocked" class="bg-orange-50 border border-orange-200 rounded-lg p-6 text-center">
      <p class="text-orange-800 text-lg mb-2">🔒 Assessment Locked</p>
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
      <!-- Student Header -->
      <div class="mb-8">
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold text-neutral-900 mb-2">
              {{ assessment.student.lastName }}, {{ assessment.student.firstName }}
            </h1>
            <p class="text-neutral-600">Student #{{ assessment.student.studentNumber }}</p>
          </div>
          <span 
            class="px-3 py-1 text-sm font-medium rounded-full"
            :class="statusClass"
          >
            {{ assessment.status.replace('_', ' ') }}
          </span>
        </div>
      </div>

      <!-- Main Form -->
      <BaseCard class="mb-6">
        <h3 class="text-lg font-semibold text-neutral-900 mb-6">Assessment Scoring</h3>

        <form @submit.prevent="handleSubmit">
          <!-- OPI Level Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              OPI Level <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              <button
                v-for="level in opiLevels"
                :key="level.id"
                type="button"
                :disabled="assessment.status === 'COMPLETED'"
                class="px-4 py-3 text-sm font-medium rounded-lg border-2 transition-colors"
                :class="form.opiLevelId === level.id 
                  ? 'border-blue-600 bg-blue-50 text-blue-800' 
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'"
                @click="form.opiLevelId = level.id"
              >
                {{ level.description }}
              </button>
            </div>
          </div>

          <!-- Notes -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-neutral-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              v-model="form.notes"
              :disabled="assessment.status === 'COMPLETED'"
              rows="4"
              class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-neutral-50"
              placeholder="Add assessment notes..."
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div v-if="assessment.status !== 'COMPLETED'" class="flex gap-4">
            <button
              type="button"
              :disabled="isSaving"
              class="px-6 py-2 text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 disabled:opacity-50"
              @click="saveDraft"
            >
              {{ isSaving ? 'Saving...' : 'Save Draft' }}
            </button>
            <button
              type="submit"
              :disabled="!form.opiLevelId || isCompleting"
              class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isCompleting ? 'Completing...' : 'Complete Assessment' }}
            </button>
          </div>

          <!-- Completed View -->
          <div v-else class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-green-800">
              ✓ Assessment completed on {{ formatDate(assessment.completedAt) }}
            </p>
          </div>
        </form>
      </BaseCard>

      <!-- Assessment Info -->
      <BaseCard>
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Assessment Details</h3>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-neutral-500">Started</dt>
            <dd class="text-neutral-900">{{ formatDate(assessment.startedAt) }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">Last Modified</dt>
            <dd class="text-neutral-900">{{ formatDate(assessment.lastModifiedAt) }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">Evaluator</dt>
            <dd class="text-neutral-900">
              {{ assessment.evaluator?.firstName }} {{ assessment.evaluator?.lastName }}
            </dd>
          </div>
          <div v-if="assessment.completedAt">
            <dt class="text-neutral-500">Completed</dt>
            <dd class="text-neutral-900">{{ formatDate(assessment.completedAt) }}</dd>
          </div>
        </dl>
      </BaseCard>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';

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
}

interface OpiLevel {
  id: number;
  code: string;
  description: string;
}

const assessment = ref<Assessment | null>(null);
const opiLevels = ref<OpiLevel[]>([]);

const form = ref({
  opiLevelId: null as number | null,
  notes: '',
});

// Computed
const backUrl = computed(() => {
  // We'd ideally get the class ID from the assessment or route state
  return '/evaluator/dashboard';
});

const statusClass = computed(() => {
  switch (assessment.value?.status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
});

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString();
}

// API calls
async function fetchAssessment() {
  const assessmentId = route.params.assessmentId;
  if (!assessmentId) return;

  try {
    const token = authStore.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    // Fetch assessment
    const res = await fetch(`${API_BASE}/assessments/${assessmentId}`, { headers });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch assessment');
    }

    assessment.value = await res.json();

    // Pre-fill form with existing data
    if (assessment.value?.score) {
      form.value.opiLevelId = assessment.value.score.opiLevelId;
      form.value.notes = assessment.value.score.notes || '';
    }

    // Fetch OPI levels
    const levelsRes = await fetch(`${API_BASE}/assessments/opi-levels`, { headers });
    if (levelsRes.ok) {
      opiLevels.value = await levelsRes.json();
    }

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
    const token = authStore.token;
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        opiLevelId: form.value.opiLevelId,
        notes: form.value.notes,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save draft');
    }

    assessment.value = await res.json();
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to save draft');
  } finally {
    isSaving.value = false;
  }
}

async function handleSubmit() {
  if (!assessment.value || !form.value.opiLevelId) return;

  isCompleting.value = true;
  try {
    const token = authStore.token;
    const res = await fetch(`${API_BASE}/assessments/${assessment.value.id}/complete`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        opiLevelId: form.value.opiLevelId,
        notes: form.value.notes,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to complete assessment');
    }

    assessment.value = await res.json();
    
    // Show success and redirect after brief delay
    setTimeout(() => {
      router.push('/evaluator/dashboard');
    }, 1500);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to complete assessment');
  } finally {
    isCompleting.value = false;
  }
}

onMounted(fetchAssessment);
</script>
