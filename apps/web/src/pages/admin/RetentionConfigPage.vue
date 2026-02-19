<template>
  <AppShell :user="currentUser">
    <!-- Page Title -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Data Retention</h1>
      <p class="text-neutral-600">Configure how long assessment data is retained after a cycle ends. Expired data is automatically purged.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchConfig">Retry</button>
    </div>

    <template v-else>
      <!-- Info Banner -->
      <BaseCard class="mb-6">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Info class="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 class="text-sm font-semibold text-neutral-900">How Retention Works</h3>
            <p class="text-sm text-neutral-600 mt-1">
              When a retention period is set, data will be automatically purged after the specified number of days
              following the cycle end date. Only inactive (completed) cycles are eligible for automatic purging.
              Set to "No limit" to retain data indefinitely.
            </p>
          </div>
        </div>
      </BaseCard>

      <!-- No Cycles -->
      <div v-if="configs.length === 0" class="text-center py-12 text-neutral-500">
        <Clock3 class="w-12 h-12 mx-auto mb-4 text-neutral-300" />
        <p>No cycles found. Create a cycle first to configure retention.</p>
      </div>

      <!-- Retention Config Table -->
      <BaseCard v-else>
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Cycle Retention Settings</h3>
        <AppDataTable
          :data="configs"
          :columns="retentionColumns"
          search-placeholder="Search cycle, status, retention..."
          empty-text="No cycles found."
          :initial-page-size="10"
        >
          <template #cell-cycleName="{ row }">
            <span class="font-medium text-neutral-900">{{ asConfig(row).cycleName }}</span>
          </template>

          <template #cell-status="{ row }">
            <span
              :class="asConfig(row).isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-600'"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            >
              {{ asConfig(row).isActive ? 'Active' : 'Inactive' }}
            </span>
          </template>

          <template #cell-endsOn="{ row }">
            <span class="text-neutral-600">{{ formatDate(asConfig(row).endsOn) }}</span>
          </template>

          <template #cell-retentionDays="{ row }">
            <template v-if="editingCycleId === asConfig(row).cycleId">
              <div class="flex items-center gap-2">
                <input
                  v-model.number="editRetentionDays"
                  type="number"
                  min="1"
                  max="3650"
                  placeholder="Days"
                  class="w-24 rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <button class="text-xs text-neutral-500 hover:text-neutral-700" @click="setNoLimit">
                  No limit
                </button>
              </div>
            </template>
            <template v-else>
              <span :class="asConfig(row).retentionDays ? 'text-neutral-900' : 'text-neutral-400 italic'">
                {{ asConfig(row).retentionDays ? `${asConfig(row).retentionDays} days` : 'No limit' }}
              </span>
            </template>
          </template>

          <template #cell-dataExpiry="{ row }">
            <template v-if="asConfig(row).dataExpiry">
              <span :class="isExpired(asConfig(row).dataExpiry as string) ? 'text-red-600 font-medium' : 'text-neutral-600'">
                {{ formatDate(asConfig(row).dataExpiry as string) }}
                <span v-if="isExpired(asConfig(row).dataExpiry as string)" class="text-xs">(expired)</span>
              </span>
            </template>
            <span v-else class="text-neutral-400 italic">Never</span>
          </template>

          <template #cell-actions="{ row }">
            <template v-if="editingCycleId === asConfig(row).cycleId">
              <button
                :disabled="isSaving"
                class="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 mr-2"
                @click="saveRetention(asConfig(row).cycleId)"
              >
                {{ isSaving ? 'Saving...' : 'Save' }}
              </button>
              <button
                class="px-3 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md hover:bg-neutral-200"
                @click="cancelEdit"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <button
                class="px-3 py-1 bg-neutral-100 text-neutral-700 text-xs rounded-md hover:bg-neutral-200"
                @click="startEdit(asConfig(row))"
              >
                Edit
              </button>
            </template>
          </template>
        </AppDataTable>
      </BaseCard>

      <!-- Success Message -->
      <div v-if="successMessage" class="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
        <p class="text-green-800">{{ successMessage }}</p>
      </div>

      <!-- Save Error -->
      <div v-if="saveError" class="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
        <p class="text-red-800">{{ saveError }}</p>
      </div>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Clock3, Info } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
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

interface RetentionConfig {
  cycleId: number;
  cycleName: string;
  retentionDays: number | null;
  isActive: boolean;
  endsOn: string;
  dataExpiry: string | null;
}

// State
const isLoading = ref(true);
const error = ref<string | null>(null);
const configs = ref<RetentionConfig[]>([]);
const editingCycleId = ref<number | null>(null);
const editRetentionDays = ref<number | null>(null);
const isSaving = ref(false);
const successMessage = ref<string | null>(null);
const saveError = ref<string | null>(null);

const retentionColumns: DataTableColumn<RetentionConfig>[] = [
  {
    key: 'cycleName',
    header: 'Cycle',
    sortable: true,
    searchable: true,
    value: (row) => row.cycleName,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => (row.isActive ? 'Active' : 'Inactive'),
  },
  {
    key: 'endsOn',
    header: 'Ends On',
    sortable: true,
    searchable: false,
    value: (row) => row.endsOn,
  },
  {
    key: 'retentionDays',
    header: 'Retention (Days)',
    sortable: true,
    searchable: true,
    value: (row) => (row.retentionDays ? `${row.retentionDays} days` : 'No limit'),
    sortValue: (row) => row.retentionDays ?? 9999,
  },
  {
    key: 'dataExpiry',
    header: 'Data Expiry',
    sortable: true,
    searchable: false,
    value: (row) => row.dataExpiry ?? 'Never',
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    searchable: false,
    value: () => '',
    align: 'right',
  },
];

function asConfig(row: unknown): RetentionConfig {
  return row as RetentionConfig;
}

async function fetchConfig() {
  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch(`${API_BASE}/admin/retention/config`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch retention configuration');
    }

    configs.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

function startEdit(config: RetentionConfig) {
  editingCycleId.value = config.cycleId;
  editRetentionDays.value = config.retentionDays;
  successMessage.value = null;
  saveError.value = null;
}

function cancelEdit() {
  editingCycleId.value = null;
  editRetentionDays.value = null;
}

function setNoLimit() {
  editRetentionDays.value = null;
}

async function saveRetention(cycleId: number) {
  isSaving.value = true;
  saveError.value = null;
  successMessage.value = null;

  try {
    const res = await fetch(`${API_BASE}/admin/retention/config`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${authStore.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cycleId,
        retentionDays: editRetentionDays.value,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to update retention settings');
    }

    successMessage.value = 'Retention settings updated successfully.';
    editingCycleId.value = null;
    editRetentionDays.value = null;

    // Refresh data
    await fetchConfig();
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Failed to save';
  } finally {
    isSaving.value = false;
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

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

onMounted(() => {
  fetchConfig();
});
</script>
