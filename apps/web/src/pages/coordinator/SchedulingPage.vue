<template>
  <AppShell :user="currentUser">
    <div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">School Scheduling</h1>
        <p class="text-neutral-600">Set school-level assessment dates for the active cycle.</p>
      </div>
      <div class="flex gap-2">
        <RouterLink
          to="/coordinator/dashboard"
          class="px-4 py-2 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          to="/coordinator/assignments"
          class="px-4 py-2 rounded-md bg-yukon-navy text-white hover:bg-yukon-teal"
        >
          Assignments
        </RouterLink>
      </div>
    </div>

    <div v-if="isLoadingSchools" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchSchools">Retry</button>
    </div>

    <template v-else>
      <section class="mb-6">
        <BaseCard>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">School</label>
              <select
                v-model="selectedSchoolId"
                class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                @change="onSchoolChange"
              >
                <option value="">Select a school...</option>
                <option v-for="school in schools" :key="school.id" :value="school.id">
                  {{ school.name }} ({{ school.schoolCode }})
                </option>
              </select>
            </div>
            <div v-if="selectedSchoolMeta" class="text-sm text-neutral-600">
              Included classes: {{ selectedSchoolMeta.includedClassCount }} | Assigned:
              {{ selectedSchoolMeta.assignedClassCount }} | Scheduled dates:
              {{ selectedSchoolMeta.scheduledDateCount }}
            </div>
          </div>
        </BaseCard>
      </section>

      <div v-if="selectedSchoolId" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section>
          <BaseCard>
            <h3 class="text-lg font-semibold text-neutral-900 mb-4">Add Single Date</h3>
            <form class="space-y-3" @submit.prevent="addSingleDate">
              <input
                v-model="singleDate"
                type="date"
                class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                :disabled="isSavingSingle"
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {{ isSavingSingle ? 'Saving...' : 'Add Date' }}
              </button>
            </form>
          </BaseCard>
        </section>

        <section>
          <BaseCard>
            <h3 class="text-lg font-semibold text-neutral-900 mb-4">Bulk Add Dates</h3>
            <form class="space-y-3" @submit.prevent="addBulkDates">
              <textarea
                v-model="bulkDateInput"
                rows="6"
                placeholder="2026-03-01, 2026-03-02 or one date per line"
                class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                :disabled="isSavingBulk"
                class="w-full px-4 py-2 bg-yukon-teal text-white rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {{ isSavingBulk ? 'Scheduling...' : 'Bulk Add Dates' }}
              </button>
            </form>
            <p v-if="bulkResult" class="mt-3 text-sm text-neutral-700">
              Inserted: {{ bulkResult.recordsInserted }}, Skipped duplicates:
              {{ bulkResult.recordsSkipped }}
            </p>
          </BaseCard>
        </section>
      </div>

      <section v-if="selectedSchoolId" class="mt-6">
        <BaseCard>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-neutral-900">Scheduled Dates</h3>
            <button
              class="text-sm text-blue-600 hover:underline"
              :disabled="isLoadingDates"
              @click="fetchDates"
            >
              Refresh
            </button>
          </div>

          <div v-if="isLoadingDates" class="text-neutral-500 py-4">Loading dates...</div>
          <div v-else-if="dates.length === 0" class="text-neutral-500 py-4">No dates scheduled yet.</div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Date</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Created</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr v-for="item in dates" :key="item.id">
                  <td class="px-4 py-3 text-sm text-neutral-900">{{ formatDate(item.assessmentDate) }}</td>
                  <td class="px-4 py-3 text-sm text-neutral-600">{{ formatDateTime(item.createdAt) }}</td>
                  <td class="px-4 py-3 text-sm">
                    <button
                      class="text-red-600 hover:text-red-800"
                      :disabled="deletingDateId === item.id"
                      @click="removeDate(item.id)"
                    >
                      {{ deletingDateId === item.id ? 'Removing...' : 'Remove' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </BaseCard>
      </section>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';

const authStore = useAuthStore();

interface CoordinatorSchool {
  id: number;
  schoolCode: string;
  name: string;
  includedClassCount: number;
  assignedClassCount: number;
  scheduledDateCount: number;
}

interface ScheduledDate {
  id: number;
  assessmentDate: string;
  roundId: number | null;
  createdAt: string;
}

interface BulkScheduleResponse {
  recordsInserted: number;
  recordsSkipped: number;
}

interface ScheduledDate {
  id: number;
  assessmentDate: string;
  createdAt: string;
}

const currentUser = computed(() =>
  authStore.user
    ? {
        firstName: authStore.user.firstName,
        lastName: authStore.user.lastName,
        email: authStore.user.email,
      }
    : null,
);

const isLoadingSchools = ref(true);
const isLoadingDates = ref(false);
const isSavingSingle = ref(false);
const isSavingBulk = ref(false);
const deletingDateId = ref<number | null>(null);
const error = ref<string | null>(null);

const schools = ref<CoordinatorSchool[]>([]);
const selectedSchoolId = ref<number | ''>('');
const dates = ref<ScheduledDate[]>([]);
const singleDate = ref('');
const bulkDateInput = ref('');
const bulkResult = ref<BulkScheduleResponse | null>(null);

const selectedSchoolMeta = computed(() =>
  schools.value.find((school) => school.id === selectedSchoolId.value),
);

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

async function fetchSchools() {
  isLoadingSchools.value = true;
  error.value = null;

  try {
    const response = await api.get<{ schools: CoordinatorSchool[] }>('/coordinator/schools');
    schools.value = response.schools ?? [];

    if (!selectedSchoolId.value && schools.value.length > 0) {
      selectedSchoolId.value = schools.value[0].id;
      await fetchDates();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoadingSchools.value = false;
  }
}

async function fetchDates() {
  if (!selectedSchoolId.value) {
    dates.value = [];
    return;
  }

  isLoadingDates.value = true;

  try {
    const response = await api.get<{ dates: ScheduledDate[] }>(`/coordinator/schools/${selectedSchoolId.value}/dates`);
    dates.value = response.dates ?? [];

    const target = schools.value.find((school) => school.id === selectedSchoolId.value);
    if (target) {
      target.scheduledDateCount = dates.value.length;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dates';
  } finally {
    isLoadingDates.value = false;
  }
}

async function addSingleDate() {
  if (!selectedSchoolId.value || !singleDate.value) {
    return;
  }

  isSavingSingle.value = true;

  try {
    await api.post(`/coordinator/schools/${selectedSchoolId.value}/dates`, {
      assessmentDate: singleDate.value,
    });

    singleDate.value = '';
    bulkResult.value = null;
    await fetchDates();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to add date');
  } finally {
    isSavingSingle.value = false;
  }
}

async function addBulkDates() {
  if (!selectedSchoolId.value || !bulkDateInput.value.trim()) {
    return;
  }

  const assessmentDates = bulkDateInput.value
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (assessmentDates.length === 0) {
    return;
  }

  isSavingBulk.value = true;

  try {
    const response = await api.post<BulkScheduleResponse>(`/coordinator/schools/${selectedSchoolId.value}/dates/bulk`, {
      assessmentDates,
    });

    bulkResult.value = {
      recordsInserted: response.recordsInserted ?? 0,
      recordsSkipped: response.recordsSkipped ?? 0,
    };

    bulkDateInput.value = '';
    await fetchDates();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to bulk schedule dates');
  } finally {
    isSavingBulk.value = false;
  }
}

async function removeDate(dateId: number) {
  if (!selectedSchoolId.value) {
    return;
  }

  deletingDateId.value = dateId;

  try {
    await api.delete(`/coordinator/schools/${selectedSchoolId.value}/dates/${dateId}`);
    await fetchDates();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete date');
  } finally {
    deletingDateId.value = null;
  }
}

function onSchoolChange() {
  bulkResult.value = null;
  fetchDates();
}

onMounted(fetchSchools);
</script>
