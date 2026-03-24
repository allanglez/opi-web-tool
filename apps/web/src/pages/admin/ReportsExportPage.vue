<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <!-- Page Title -->
    <div class="mt-8 mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Reports &amp; Export</h1>
      <p class="text-neutral-600">Export assessment data for reporting and integration with external systems.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- No Cycle Notice -->
    <NoCycleNotice v-else-if="noCycle" />

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchSummary">Retry</button>
    </div>

    <template v-else-if="summary">
      <!-- Cycle Info -->
      <BaseCard class="mb-6">
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Current Cycle</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt class="text-neutral-500">Cycle</dt>
            <dd class="text-neutral-900 font-medium">{{ summary.cycle.name }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">Year</dt>
            <dd class="text-neutral-900 font-medium">{{ summary.cycle.year }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">Start Date</dt>
            <dd class="text-neutral-900 font-medium">{{ formatDate(summary.cycle.startsOn) }}</dd>
          </div>
          <div>
            <dt class="text-neutral-500">End Date</dt>
            <dd class="text-neutral-900 font-medium">{{ formatDate(summary.cycle.endsOn) }}</dd>
          </div>
        </div>
      </BaseCard>

      <!-- Stats Overview -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard :value="summary.stats.total" label="Total Assessments" variant="default" />
        <StatCard :value="summary.stats.completed" label="Completed" variant="green" />
        <StatCard :value="summary.stats.inProgress" label="In Progress" variant="yellow" />
        <StatCard :value="summary.stats.notStarted" label="Not Started" variant="red" />
        <StatCard :value="summary.stats.absent" label="Absent" variant="default" />
      </div>

      <!-- Completion Rate -->
      <BaseCard class="mb-6">
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Completion Rate</h3>
        <ProgressBar :percentage="summary.stats.completionRate" label="Overall Progress" variant="green" />
      </BaseCard>

      <!-- Export Options -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- M2M / PnA Export — admin only -->
        <BaseCard v-if="authStore.isAdmin">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download class="w-5 h-5 text-blue-600" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-neutral-900 mb-1">PnA Export (Minimal)</h3>
              <p class="text-sm text-neutral-600 mb-4">
                Export minimal fields for PnA integration: student number, OPI level, and status.
                Excludes names, schools, notes, and audio data.
              </p>

              <!-- Round Filter -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-1">Round (Optional)</label>
                <select
                  v-model="selectedRoundExport"
                  class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">All Rounds</option>
                  <option v-for="round in summary.rounds" :key="round.id" :value="round.id">
                    {{ round.name }}
                  </option>
                </select>
              </div>

              <div class="flex gap-3">
                <button
                  :disabled="isExporting"
                  class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  @click="downloadExport('json')"
                >
                  {{ isExporting ? 'Exporting...' : 'Export JSON' }}
                </button>
                <button
                  :disabled="isExporting"
                  class="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 disabled:opacity-50"
                  @click="downloadExport('csv')"
                >
                  {{ isExporting ? 'Exporting...' : 'Export CSV' }}
                </button>
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Coordinator Progress Report -->
        <BaseCard>
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <ChartColumn class="w-5 h-5 text-green-600" />
            </div>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-neutral-900 mb-1">Progress Report (Full)</h3>
              <p class="text-sm text-neutral-600 mb-4">
                Detailed progress report with student names, schools, classes, evaluators,
                scores, and completion status. Suitable for coordinator review.
              </p>

              <!-- Round Filter -->
              <div class="mb-4">
                <label class="block text-sm font-medium text-neutral-700 mb-1">Round (Optional)</label>
                <select
                  v-model="selectedRoundProgress"
                  class="w-full rounded-md border-neutral-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                >
                  <option value="">All Rounds</option>
                  <option v-for="round in summary.rounds" :key="round.id" :value="round.id">
                    {{ round.name }}
                  </option>
                </select>
              </div>

              <div class="flex gap-3">
                <button
                  :disabled="isExportingProgress"
                  class="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
                  @click="downloadProgress('json')"
                >
                  {{ isExportingProgress ? 'Exporting...' : 'Export JSON' }}
                </button>
                <button
                  :disabled="isExportingProgress"
                  class="px-4 py-2 bg-green-100 text-green-700 text-sm rounded-md hover:bg-green-200 disabled:opacity-50"
                  @click="downloadProgress('csv')"
                >
                  {{ isExportingProgress ? 'Exporting...' : 'Export CSV' }}
                </button>
              </div>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Export Success Message -->
      <div v-if="exportSuccess" class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p class="text-green-800">{{ exportSuccess }}</p>
      </div>

      <!-- Export Error Message -->
      <div v-if="exportError" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ exportError }}</p>
      </div>
    </template>

    <!-- No Active Cycle -->
    <div v-else class="text-center py-12 text-neutral-500">
      <FileText class="w-12 h-12 mx-auto mb-4 text-neutral-300" />
      <p>No active cycle found. Set up a cycle first to export reports.</p>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ChartColumn, Download, FileText } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import { ApiError } from '../../utils/api';
import NoCycleNotice from '../../components/ui/NoCycleNotice.vue';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';
import { getEnv } from '../../utils/env';

const authStore = useAuthStore();
const API_BASE = getEnv('VITE_API_URL') || 'http://localhost:3000/api/v1';

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

// State
const isLoading = ref(true);
const error = ref<string | null>(null);
const noCycle = ref(false);
const isExporting = ref(false);
const isExportingProgress = ref(false);
const exportSuccess = ref<string | null>(null);
const exportError = ref<string | null>(null);
const selectedRoundExport = ref('');
const selectedRoundProgress = ref('');

interface ExportSummary {
  cycle: {
    id: number;
    name: string;
    year: number;
    startsOn: string;
    endsOn: string;
  };
  rounds: Array<{
    id: number;
    name: string;
    roundNumber: number;
  }>;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    absent: number;
    completionRate: number;
  };
}

const summary = ref<ExportSummary | null>(null);

async function fetchSummary() {
  isLoading.value = true;
  error.value = null;

  try {
    // First get active cycle
    const cyclesRes = await fetch(`${API_BASE}/cycles/active`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!cyclesRes.ok) {
      if (cyclesRes.status === 404) {
        summary.value = null;
        return;
      }
      throw new Error('Failed to fetch active cycle');
    }

    const cycle = await cyclesRes.json();

    // Then get summary for that cycle
    const summaryRes = await fetch(`${API_BASE}/reports/summary?cycleId=${cycle.id}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!summaryRes.ok) {
      throw new Error('Failed to fetch export summary');
    }

    summary.value = await summaryRes.json();
  } catch (e) {
    if (e instanceof ApiError && e.code === 'CYCLE_NOT_APPROVED') {
      noCycle.value = true;
    } else {
      error.value = e instanceof Error ? e.message : 'An error occurred';
    }
  } finally {
    isLoading.value = false;
  }
}

async function downloadExport(format: 'json' | 'csv') {
  if (!summary.value) return;

  isExporting.value = true;
  exportSuccess.value = null;
  exportError.value = null;

  try {
    const params = new URLSearchParams({
      cycleId: summary.value.cycle.id.toString(),
    });
    if (selectedRoundExport.value) {
      params.set('roundId', selectedRoundExport.value);
    }

    const endpoint = format === 'csv' ? 'export/csv' : 'export';
    const res = await fetch(`${API_BASE}/reports/${endpoint}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Export failed');
    }

    if (format === 'csv') {
      const blob = await res.blob();
      triggerDownload(blob, `opi-export-cycle-${summary.value.cycle.id}.csv`, 'text/csv');
      exportSuccess.value = 'PnA export CSV downloaded successfully.';
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `opi-export-cycle-${summary.value.cycle.id}.json`, 'application/json');
      exportSuccess.value = `PnA export JSON downloaded (${data.length} records).`;
    }
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Export failed';
  } finally {
    isExporting.value = false;
  }
}

async function downloadProgress(format: 'json' | 'csv') {
  if (!summary.value) return;

  isExportingProgress.value = true;
  exportSuccess.value = null;
  exportError.value = null;

  try {
    const params = new URLSearchParams({
      cycleId: summary.value.cycle.id.toString(),
    });
    if (selectedRoundProgress.value) {
      params.set('roundId', selectedRoundProgress.value);
    }

    const endpoint = format === 'csv' ? 'progress/csv' : 'progress';
    const res = await fetch(`${API_BASE}/reports/${endpoint}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Export failed');
    }

    if (format === 'csv') {
      const blob = await res.blob();
      triggerDownload(blob, `opi-progress-cycle-${summary.value.cycle.id}.csv`, 'text/csv');
      exportSuccess.value = 'Progress report CSV downloaded successfully.';
    } else {
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      triggerDownload(blob, `opi-progress-cycle-${summary.value.cycle.id}.json`, 'application/json');
      exportSuccess.value = `Progress report JSON downloaded (${data.length} records).`;
    }
  } catch (e) {
    exportError.value = e instanceof Error ? e.message : 'Export failed';
  } finally {
    isExportingProgress.value = false;
  }
}

function triggerDownload(blob: Blob, filename: string, _mimeType: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMounted(() => {
  fetchSummary();
});
</script>
