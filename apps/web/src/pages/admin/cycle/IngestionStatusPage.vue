<template>
  <AppShell :user="currentUser">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Data Ingestion Status</h1>
      <p class="text-neutral-600">View the history of data imports and their status.</p>
    </div>

    <BaseCard>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">Ingestion Runs</h2>
        <button
          :disabled="isLoading"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-neutral-300 transition-colors"
          @click="fetchLogs"
        >
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="isLoading && logs.length === 0" class="text-center py-8 text-neutral-500">
        Loading ingestion logs...
      </div>

      <div v-else-if="logs.length === 0" class="text-center py-8 text-neutral-500">
        No ingestion runs found. Data has not been imported yet.
      </div>

      <div v-else>
        <AppDataTable
          :data="logs"
          :columns="ingestionColumns"
          search-placeholder="Search entity type or status..."
          empty-text="No ingestion runs found."
          :initial-page-size="10"
        >
          <template #cell-entityType="{ row }">
            <span class="text-sm font-medium text-neutral-900">
              {{ formatEntityType(asIngestionLog(row).entityType) }}
            </span>
          </template>

          <template #cell-recordsTotal="{ row }">
            <span class="text-sm text-neutral-600">{{ asIngestionLog(row).recordsTotal }}</span>
          </template>

          <template #cell-recordsUpserted="{ row }">
            <span class="text-sm text-neutral-600">{{ asIngestionLog(row).recordsUpserted }}</span>
          </template>

          <template #cell-recordsFailed="{ row }">
            <span :class="asIngestionLog(row).recordsFailed > 0 ? 'text-red-600 font-semibold text-sm' : 'text-neutral-600 text-sm'">
              {{ asIngestionLog(row).recordsFailed }}
            </span>
          </template>

          <template #cell-createdAt="{ row }">
            <span class="text-sm text-neutral-600">{{ formatTimestamp(asIngestionLog(row).createdAt) }}</span>
          </template>

          <template #cell-status="{ row }">
            <span
              v-if="asIngestionLog(row).recordsFailed === 0"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
            >
              Success
            </span>
            <span
              v-else
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
            >
              Partial
            </span>
          </template>
        </AppDataTable>
      </div>

      <div v-if="selectedLog" class="mt-6 pt-6 border-t border-neutral-200">
        <h3 class="text-lg font-semibold text-neutral-900 mb-3">Error Details</h3>
        <pre class="bg-neutral-50 p-4 rounded-md text-sm text-neutral-700 overflow-x-auto">{{ selectedLog.errors }}</pre>
      </div>
    </BaseCard>

    <div v-if="error" class="mt-6">
      <BaseCard variant="error">
        <div class="text-red-600">{{ error }}</div>
      </BaseCard>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../../stores/auth';
import AppShell from '../../../components/layout/AppShell.vue';
import BaseCard from '../../../components/ui/BaseCard.vue';
import AppDataTable from '../../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../../components/ui/data-table/types';

const authStore = useAuthStore();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

interface IngestionLog {
  id: number;
  entityType: string;
  recordsTotal: number;
  recordsUpserted: number;
  recordsFailed: number;
  errors?: string;
  createdAt: string;
}

const logs = ref<IngestionLog[]>([]);
const selectedLog = ref<IngestionLog | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);

const ingestionColumns: DataTableColumn<IngestionLog>[] = [
  {
    key: 'entityType',
    header: 'Entity Type',
    sortable: true,
    searchable: true,
    value: (row) => formatEntityType(row.entityType),
  },
  {
    key: 'recordsTotal',
    header: 'Total',
    sortable: true,
    searchable: false,
    value: (row) => row.recordsTotal,
  },
  {
    key: 'recordsUpserted',
    header: 'Upserted',
    sortable: true,
    searchable: false,
    value: (row) => row.recordsUpserted,
  },
  {
    key: 'recordsFailed',
    header: 'Failed',
    sortable: true,
    searchable: false,
    value: (row) => row.recordsFailed,
  },
  {
    key: 'createdAt',
    header: 'Timestamp',
    sortable: true,
    searchable: false,
    value: (row) => row.createdAt,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => (row.recordsFailed === 0 ? 'Success' : 'Partial'),
  },
];

function asIngestionLog(row: unknown): IngestionLog {
  return row as IngestionLog;
}

const formatEntityType = (entityType: string): string => {
  const typeMap: Record<string, string> = {
    school: 'Schools',
    program: 'Programs',
    class: 'Classes',
    student: 'Students',
    enrollment: 'Enrollments',
  };
  return typeMap[entityType] || entityType;
};

const formatTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fetchLogs = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/v1/ingest/logs', {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch ingestion logs');
    }

    logs.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  fetchLogs();
});
</script>
