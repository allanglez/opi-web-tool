<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <!-- Page Title -->
    <div class="mt-8 mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Audit Log</h1>
      <p class="text-neutral-600">View all assessment-related actions and changes across the system.</p>
    </div>

    <!-- Filters -->
    <BaseCard class="mb-6">
      <h3 class="text-lg font-semibold text-neutral-900 mb-4">Filters</h3>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Action Type Filter -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Action Type</label>
          <select
            v-model="filters.action"
            class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value="">All Actions</option>
            <option v-for="action in availableActions" :key="action" :value="action">
              {{ formatActionLabel(action) }}
            </option>
          </select>
        </div>

        <!-- Date From -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Date From</label>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <!-- Date To -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Date To</label>
          <input
            v-model="filters.dateTo"
            type="date"
            class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>

        <!-- Assessment ID -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Assessment ID</label>
          <input
            v-model="filters.assessmentId"
            type="number"
            placeholder="Filter by ID..."
            class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div class="mt-4 flex gap-3">
        <button
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          @click="fetchAuditLogs(1)"
        >
          Apply Filters
        </button>
        <button
          class="px-4 py-2 bg-neutral-100 text-neutral-700 text-sm rounded-md hover:bg-neutral-200"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>
    </BaseCard>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchAuditLogs()">Retry</button>
    </div>

    <!-- Audit Log Table -->
    <BaseCard v-else>
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-neutral-900">
          Audit Entries
          <span class="text-sm font-normal text-neutral-500">({{ meta.total }} total)</span>
        </h3>
      </div>

      <!-- Empty State -->
      <div v-if="auditLogs.length === 0" class="text-center py-12 text-neutral-500">
        <FileText class="w-12 h-12 mx-auto mb-4 text-neutral-300" />
        <p>No audit log entries found matching your filters.</p>
      </div>

      <!-- Table -->
      <AppDataTable
        v-else
        :data="auditLogs"
        :columns="auditColumns"
        search-placeholder="Search action, student, field, changed by..."
        empty-text="No audit log entries found matching your filters."
        :initial-page-size="25"
      >
        <template #cell-changedAt="{ row }">
          <span class="text-sm text-neutral-600 whitespace-nowrap">
            {{ formatDateTime(asAuditLog(row).changedAt) }}
          </span>
        </template>

        <template #cell-action="{ row }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold whitespace-nowrap"
            :class="getActionBadgeClass(asAuditLog(row).action)"
          >
            {{ formatActionLabel(asAuditLog(row).action) }}
          </span>
        </template>

        <template #cell-student="{ row }">
          <div class="text-sm text-neutral-900 whitespace-nowrap">
            <template v-if="asAuditLog(row).assessment?.student">
              {{ asAuditLog(row).assessment?.student?.lastName }}, {{ asAuditLog(row).assessment?.student?.firstName }}
              <span class="text-neutral-500 text-xs block">#{{ asAuditLog(row).assessment?.student?.studentNumber }}</span>
            </template>
            <span v-else class="text-neutral-400">—</span>
          </div>
        </template>

        <template #cell-fieldName="{ row }">
          <span class="text-sm text-neutral-600 whitespace-nowrap">{{ asAuditLog(row).fieldName || '—' }}</span>
        </template>

        <template #cell-oldValue="{ row }">
          <span v-if="asAuditLog(row).oldValue" class="text-red-600 bg-red-50 px-2 py-0.5 rounded text-sm whitespace-nowrap">
            {{ truncateValue(asAuditLog(row).oldValue as string) }}
          </span>
          <span v-else class="text-neutral-400 text-sm">—</span>
        </template>

        <template #cell-newValue="{ row }">
          <span v-if="asAuditLog(row).newValue" class="text-green-600 bg-green-50 px-2 py-0.5 rounded text-sm whitespace-nowrap">
            {{ truncateValue(asAuditLog(row).newValue as string) }}
          </span>
          <span v-else class="text-neutral-400 text-sm">—</span>
        </template>

        <template #cell-changedBy="{ row }">
          <span class="text-sm text-neutral-900 whitespace-nowrap">
            {{ asAuditLog(row).changer?.firstName }} {{ asAuditLog(row).changer?.lastName }}
          </span>
        </template>
      </AppDataTable>
    </BaseCard>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { FileText } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

// State
const isLoading = ref(true);
const error = ref<string | null>(null);
interface AuditLogItem {
  id: number;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  assessment?: {
    student?: {
      firstName: string;
      lastName: string;
      studentNumber: string;
    } | null;
  } | null;
  changer?: {
    firstName: string;
    lastName: string;
  } | null;
}

const auditLogs = ref<AuditLogItem[]>([]);
const availableActions = ref<string[]>([]);
const meta = ref({
  total: 0,
  page: 1,
  limit: 25,
  totalPages: 0,
});

const filters = ref({
  action: '',
  dateFrom: '',
  dateTo: '',
  assessmentId: '',
});

const auditColumns: DataTableColumn<AuditLogItem>[] = [
  {
    key: 'changedAt',
    header: 'Timestamp',
    sortable: true,
    searchable: false,
    value: (row) => row.changedAt,
  },
  {
    key: 'action',
    header: 'Action',
    sortable: true,
    searchable: true,
    value: (row) => row.action,
  },
  {
    key: 'student',
    header: 'Student',
    sortable: true,
    searchable: true,
    value: (row) => {
      const student = row.assessment?.student;
      if (!student) return '—';
      return `${student.lastName}, ${student.firstName} #${student.studentNumber}`;
    },
  },
  {
    key: 'fieldName',
    header: 'Field',
    sortable: true,
    searchable: true,
    value: (row) => row.fieldName || '—',
  },
  {
    key: 'oldValue',
    header: 'Old Value',
    sortable: false,
    searchable: true,
    value: (row) => row.oldValue || '—',
  },
  {
    key: 'newValue',
    header: 'New Value',
    sortable: false,
    searchable: true,
    value: (row) => row.newValue || '—',
  },
  {
    key: 'changedBy',
    header: 'Changed By',
    sortable: true,
    searchable: true,
    value: (row) => row.changer ? `${row.changer.firstName} ${row.changer.lastName}` : '—',
  },
];

function asAuditLog(row: unknown): AuditLogItem {
  return row as AuditLogItem;
}

// Fetch audit logs
async function fetchAuditLogs(page = 1) {
  isLoading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    if (filters.value.action) params.set('action', filters.value.action);
    if (filters.value.dateFrom) params.set('dateFrom', filters.value.dateFrom);
    if (filters.value.dateTo) params.set('dateTo', filters.value.dateTo);
    if (filters.value.assessmentId) params.set('assessmentId', filters.value.assessmentId);
    params.set('page', page.toString());
    params.set('limit', '250');

    const res = await fetch(`${API_BASE}/audit/logs?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch audit logs');
    }

    const result = await res.json();
    auditLogs.value = result.data;
    meta.value = result.meta;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

// Fetch available action types for filter dropdown
async function fetchActions() {
  try {
    const res = await fetch(`${API_BASE}/audit/actions`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });
    if (res.ok) {
      availableActions.value = await res.json();
    }
  } catch {
    // Non-critical, silently fail
  }
}

function clearFilters() {
  filters.value = { action: '', dateFrom: '', dateTo: '', assessmentId: '' };
  fetchAuditLogs(1);
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace('Assessment ', '')
    .replace('Opi ', 'OPI ');
}

function getActionBadgeClass(action: string): string {
  const map: Record<string, string> = {
    ASSESSMENT_START: 'bg-blue-100 text-blue-800',
    ASSESSMENT_COMPLETE: 'bg-green-100 text-green-800',
    ASSESSMENT_REOPEN: 'bg-yellow-100 text-yellow-800',
    ASSESSMENT_UPDATE: 'bg-neutral-100 text-neutral-800',
    ASSESSMENT_MARK_ABSENT: 'bg-gray-100 text-gray-800',
    ASSESSMENT_AUDIO_UPLOADED: 'bg-purple-100 text-purple-800',
    ASSESSMENT_RE_EVALUATE: 'bg-orange-100 text-orange-800',
    SCORE_CHANGE: 'bg-red-100 text-red-800',
    REVIEW_RESOLVED: 'bg-teal-100 text-teal-800',
    CLASS_SUBMITTED: 'bg-indigo-100 text-indigo-800',
    ASSESSMENT_LOCKED: 'bg-amber-100 text-amber-800',
    ASSESSMENT_FLAGGED_FOR_REVIEW: 'bg-pink-100 text-pink-800',
    ASSIGNMENT_CREATE: 'bg-cyan-100 text-cyan-800',
    ASSIGNMENT_DELETE: 'bg-rose-100 text-rose-800',
  };
  return map[action] || 'bg-neutral-100 text-neutral-800';
}

function truncateValue(value: string): string {
  return value.length > 50 ? value.substring(0, 50) + '...' : value;
}

onMounted(async () => {
  await Promise.all([fetchAuditLogs(1), fetchActions()]);
});
</script>
