<template>
  <AppShell :user="currentUser">
    <!-- Page Title -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Annual Reset</h1>
      <p class="text-neutral-600">Export assessment data and purge cycle records. This action is irreversible.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchData">Retry</button>
    </div>

    <template v-else>
      <!-- Warning Banner -->
      <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div class="flex items-start gap-3">
          <TriangleAlert class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 class="text-sm font-semibold text-amber-800">Caution: Destructive Operation</h3>
            <p class="text-sm text-amber-700 mt-1">
              The annual reset will export all assessment data for the selected cycle, then permanently delete
              all assessments, scores, audio recordings, assignments, and student data associated with that cycle.
              The cycle will be deactivated after reset. This cannot be undone.
            </p>
          </div>
        </div>
      </div>

      <!-- No Active Cycle -->
      <div v-if="!activeCycle" class="text-center py-12 text-neutral-500">
        <RotateCcw class="w-12 h-12 mx-auto mb-4 text-neutral-300" />
        <p>No active cycle found. Nothing to reset.</p>
      </div>

      <template v-else>
        <!-- Cycle Info -->
        <BaseCard class="mb-6">
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Cycle to Reset</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt class="text-neutral-500">Cycle</dt>
              <dd class="text-neutral-900 font-medium">{{ activeCycle.name }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500">Start Date</dt>
              <dd class="text-neutral-900 font-medium">{{ formatDate(activeCycle.startsOn) }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500">End Date</dt>
              <dd class="text-neutral-900 font-medium">{{ formatDate(activeCycle.endsOn) }}</dd>
            </div>
            <div>
              <dt class="text-neutral-500">Retention</dt>
              <dd class="text-neutral-900 font-medium">
                {{ activeCycle.retentionDays ? `${activeCycle.retentionDays} days` : 'No limit' }}
              </dd>
            </div>
          </div>
        </BaseCard>

        <!-- Reset Status (when running) -->
        <BaseCard v-if="resetStatus && resetStatus.status !== 'idle'" class="mb-6">
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Reset Progress</h3>

          <!-- Status Badge -->
          <div class="flex items-center gap-3 mb-4">
            <span
              :class="statusBadgeClass"
              class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            >
              <span v-if="resetStatus.status === 'exporting' || resetStatus.status === 'purging'" class="animate-spin mr-2 h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
              {{ statusLabel }}
            </span>
          </div>

          <!-- Progress Details -->
          <div class="space-y-3 text-sm">
            <div v-if="resetStatus.startedAt" class="flex justify-between">
              <span class="text-neutral-500">Started</span>
              <span class="text-neutral-900">{{ formatDateTime(resetStatus.startedAt) }}</span>
            </div>
            <div v-if="resetStatus.exportedRecords !== undefined" class="flex justify-between">
              <span class="text-neutral-500">Records Exported</span>
              <span class="text-neutral-900">{{ resetStatus.exportedRecords }}</span>
            </div>
            <div v-if="resetStatus.purgedAssessments !== undefined" class="flex justify-between">
              <span class="text-neutral-500">Assessments Purged</span>
              <span class="text-neutral-900">{{ resetStatus.purgedAssessments }}</span>
            </div>
            <div v-if="resetStatus.purgedAudioFiles !== undefined" class="flex justify-between">
              <span class="text-neutral-500">Audio Files Deleted</span>
              <span class="text-neutral-900">{{ resetStatus.purgedAudioFiles }}</span>
            </div>
            <div v-if="resetStatus.completedAt" class="flex justify-between">
              <span class="text-neutral-500">Completed</span>
              <span class="text-green-700 font-medium">{{ formatDateTime(resetStatus.completedAt) }}</span>
            </div>
            <div v-if="resetStatus.error" class="bg-red-50 border border-red-200 rounded p-3 mt-2">
              <p class="text-red-800 text-sm">{{ resetStatus.error }}</p>
            </div>
          </div>
        </BaseCard>

        <!-- Reset Button -->
        <BaseCard v-if="!resetStatus || resetStatus.status === 'idle' || resetStatus.status === 'completed' || resetStatus.status === 'failed'">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-neutral-900">Start Annual Reset</h3>
              <p class="text-sm text-neutral-600 mt-1">
                This will export all data, then permanently purge the cycle.
              </p>
            </div>
            <button
              class="px-6 py-2.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              @click="showConfirmDialog = true"
            >
              Reset Cycle
            </button>
          </div>
        </BaseCard>
      </template>
    </template>

    <!-- Confirmation Dialog Overlay -->
    <div
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      @click.self="showConfirmDialog = false"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <TriangleAlert class="w-5 h-5 text-red-600" />
          </div>
          <h3 class="text-lg font-semibold text-neutral-900">Confirm Annual Reset</h3>
        </div>

        <p class="text-sm text-neutral-600 mb-4">
          You are about to reset cycle <strong>"{{ activeCycle?.name }}"</strong>. This will:
        </p>

        <ul class="text-sm text-neutral-600 space-y-1 mb-4 ml-4 list-disc">
          <li>Export all assessment data to a JSON file</li>
          <li>Delete all assessments, scores, and notes</li>
          <li>Delete all audio recordings from storage</li>
          <li>Remove all assignments and scheduling data</li>
          <li>Remove all student and class data for this cycle</li>
          <li>Deactivate the cycle</li>
        </ul>

        <p class="text-sm text-neutral-600 mb-4">
          To confirm, type <strong>{{ confirmationText }}</strong> below:
        </p>

        <input
          v-model="confirmInput"
          type="text"
          :placeholder="confirmationText"
          class="w-full rounded-md border-neutral-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-sm mb-4"
        />

        <div class="flex justify-end gap-3">
          <button
            class="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-md hover:bg-neutral-200"
            @click="showConfirmDialog = false; confirmInput = ''"
          >
            Cancel
          </button>
          <button
            :disabled="confirmInput !== confirmationText || isResetting"
            class="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            @click="executeReset"
          >
            {{ isResetting ? 'Starting...' : 'Confirm Reset' }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RotateCcw, TriangleAlert } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';

const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

interface Cycle {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
  retentionDays: number | null;
  isActive: boolean;
}

interface ResetStatusData {
  status: 'idle' | 'exporting' | 'purging' | 'completed' | 'failed';
  cycleId?: number;
  cycleName?: string;
  startedAt?: string;
  completedAt?: string;
  exportedRecords?: number;
  purgedAssessments?: number;
  purgedAudioFiles?: number;
  error?: string;
}

// State
const isLoading = ref(true);
const error = ref<string | null>(null);
const activeCycle = ref<Cycle | null>(null);
const resetStatus = ref<ResetStatusData | null>(null);
const showConfirmDialog = ref(false);
const confirmInput = ref('');
const isResetting = ref(false);
let pollInterval: ReturnType<typeof setInterval> | null = null;

const confirmationText = computed(() => {
  return activeCycle.value ? `RESET ${activeCycle.value.name}` : 'RESET';
});

const statusLabel = computed(() => {
  if (!resetStatus.value) return '';
  const labels: Record<string, string> = {
    idle: 'Idle',
    exporting: 'Exporting Data...',
    purging: 'Purging Records...',
    completed: 'Completed',
    failed: 'Failed',
  };
  return labels[resetStatus.value.status] || resetStatus.value.status;
});

const statusBadgeClass = computed(() => {
  if (!resetStatus.value) return '';
  const classes: Record<string, string> = {
    idle: 'bg-neutral-100 text-neutral-700',
    exporting: 'bg-blue-100 text-blue-700',
    purging: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };
  return classes[resetStatus.value.status] || '';
});

async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    // Fetch active cycle
    const cycleRes = await fetch(`${API_BASE}/cycles/active`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (cycleRes.ok) {
      activeCycle.value = await cycleRes.json();
    } else if (cycleRes.status === 404) {
      activeCycle.value = null;
    } else {
      throw new Error('Failed to fetch active cycle');
    }

    // Fetch reset status
    await fetchResetStatus();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

async function fetchResetStatus() {
  try {
    const res = await fetch(`${API_BASE}/admin/reset/status`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (res.ok) {
      resetStatus.value = await res.json();

      // Start polling if operation is in progress
      if (resetStatus.value && (resetStatus.value.status === 'exporting' || resetStatus.value.status === 'purging')) {
        startPolling();
      } else {
        stopPolling();
      }
    }
  } catch {
    // Silently fail for status polling
  }
}

async function executeReset() {
  if (!activeCycle.value) return;

  isResetting.value = true;

  try {
    const res = await fetch(`${API_BASE}/admin/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cycleId: activeCycle.value.id }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to start reset');
    }

    resetStatus.value = await res.json();
    showConfirmDialog.value = false;
    confirmInput.value = '';

    // Start polling for status updates
    startPolling();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to start reset';
  } finally {
    isResetting.value = false;
  }
}

function startPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(fetchResetStatus, 2000);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

onMounted(() => {
  fetchData();
});

onUnmounted(() => {
  stopPolling();
});
</script>
