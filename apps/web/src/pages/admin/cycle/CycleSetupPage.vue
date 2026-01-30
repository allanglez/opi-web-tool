<template>
  <AppShell :user="currentUser">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Cycle Setup</h1>
      <p class="text-neutral-600">Manage assessment cycles and approve data for use.</p>
    </div>

    <div v-if="!activeCycle" class="mb-6">
      <BaseCard variant="warning">
        <div class="flex items-start gap-3">
          <div class="text-yellow-600 mt-0.5">⚠️</div>
          <div>
            <h3 class="font-semibold text-neutral-900 mb-1">No Active Cycle</h3>
            <p class="text-sm text-neutral-600">Create a new assessment cycle to begin.</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <BaseCard>
        <h2 class="text-xl font-semibold text-neutral-900 mb-4">Create New Cycle</h2>
        <form @submit.prevent="handleCreateCycle" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Cycle Name</label>
            <input
              v-model="newCycle.name"
              type="text"
              required
              maxlength="100"
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 2025-2026 Assessment Cycle"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Start Date</label>
            <input
              v-model="newCycle.startsOn"
              type="date"
              required
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">End Date</label>
            <input
              v-model="newCycle.endsOn"
              type="date"
              required
              class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            :disabled="isCreating || !!activeCycle"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          >
            {{ isCreating ? 'Creating...' : 'Create Cycle' }}
          </button>
          <p v-if="activeCycle" class="text-sm text-neutral-500">
            Deactivate the current cycle before creating a new one.
          </p>
        </form>
      </BaseCard>

      <BaseCard v-if="activeCycle">
        <h2 class="text-xl font-semibold text-neutral-900 mb-4">Active Cycle</h2>
        <div class="space-y-4">
          <div>
            <div class="text-sm text-neutral-500">Cycle Name</div>
            <div class="font-semibold text-neutral-900">{{ activeCycle.name }}</div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-sm text-neutral-500">Start Date</div>
              <div class="font-medium text-neutral-900">{{ formatDate(activeCycle.startsOn) }}</div>
            </div>
            <div>
              <div class="text-sm text-neutral-500">End Date</div>
              <div class="font-medium text-neutral-900">{{ formatDate(activeCycle.endsOn) }}</div>
            </div>
          </div>
          <div>
            <div class="text-sm text-neutral-500 mb-2">Approval Status</div>
            <div v-if="activeCycle.isApproved" class="flex items-center gap-2 text-green-600">
              <span class="text-lg">✓</span>
              <span class="font-semibold">Data Approved</span>
            </div>
            <div v-else class="flex items-center gap-2 text-yellow-600">
              <span class="text-lg">⏳</span>
              <span class="font-semibold">Pending Approval</span>
            </div>
          </div>
          <div v-if="activeCycle.dataApprovedAt && activeCycle.approver">
            <div class="text-sm text-neutral-500">Approved By</div>
            <div class="text-neutral-900">
              {{ activeCycle.approver.firstName }} {{ activeCycle.approver.lastName }}
              <span class="text-sm text-neutral-500">on {{ formatDate(activeCycle.dataApprovedAt) }}</span>
            </div>
          </div>
          <button
            v-if="!activeCycle.isApproved"
            @click="handleApproveCycle"
            :disabled="isApproving || !hasIngestionData"
            class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          >
            {{ isApproving ? 'Approving...' : 'Approve Data' }}
          </button>
          <p v-if="!hasIngestionData && !activeCycle.isApproved" class="text-sm text-neutral-500">
            At least one data ingestion is required before approval.
          </p>
        </div>
      </BaseCard>
    </div>

    <div v-if="error" class="mb-6">
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

const authStore = useAuthStore();

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
  isActive: boolean;
  isApproved: boolean;
  dataApprovedAt?: string;
  approver?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const activeCycle = ref<Cycle | null>(null);
const hasIngestionData = ref(false);
const isCreating = ref(false);
const isApproving = ref(false);
const error = ref<string | null>(null);

const newCycle = ref({
  name: '',
  startsOn: '',
  endsOn: '',
});

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const fetchActiveCycle = async () => {
  try {
    const response = await fetch('/api/v1/cycles/active', {
      credentials: 'include',
    });

    if (response.ok) {
      activeCycle.value = await response.json();
    } else if (response.status === 404) {
      activeCycle.value = null;
    } else {
      throw new Error('Failed to fetch active cycle');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  }
};

const checkIngestionData = async () => {
  try {
    const response = await fetch('/api/v1/ingest/logs', {
      credentials: 'include',
    });

    if (response.ok) {
      const logs = await response.json();
      hasIngestionData.value = logs.length > 0;
    }
  } catch (err) {
    console.error('Failed to check ingestion data:', err);
  }
};

const handleCreateCycle = async () => {
  isCreating.value = true;
  error.value = null;

  try {
    const response = await fetch('/api/v1/admin/cycles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(newCycle.value),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to create cycle');
    }

    newCycle.value = { name: '', startsOn: '', endsOn: '' };
    await fetchActiveCycle();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    isCreating.value = false;
  }
};

const handleApproveCycle = async () => {
  if (!activeCycle.value) return;

  isApproving.value = true;
  error.value = null;

  try {
    const response = await fetch(`/api/v1/admin/cycles/${activeCycle.value.id}/approve`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Failed to approve cycle');
    }

    await fetchActiveCycle();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    isApproving.value = false;
  }
};

onMounted(() => {
  fetchActiveCycle();
  checkIngestionData();
});
</script>
