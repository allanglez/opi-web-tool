<template>
  <AppShell :user="currentUser">
    <div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">Evaluator Assignments</h1>
        <p class="text-neutral-600">Assign evaluators to included classes for the active cycle.</p>
      </div>
      <div class="flex gap-2">
        <RouterLink
          to="/coordinator/dashboard"
          class="px-4 py-2 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          to="/coordinator/scheduling"
          class="px-4 py-2 rounded-md bg-yukon-navy text-white hover:bg-yukon-teal"
        >
          Scheduling
        </RouterLink>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchData">Retry</button>
    </div>

    <template v-else>
      <section class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard :value="assignableClasses.length" label="Included Classes" variant="default" />
          <StatCard :value="assignedCount" label="Assigned" variant="green" />
          <StatCard :value="unassignedCount" label="Unassigned" variant="yellow" />
          <StatCard :value="evaluators.length" label="Evaluators" variant="default" />
        </div>
      </section>

      <section class="mb-8">
        <BaseCard>
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Create Assignment</h3>
          <form class="grid grid-cols-1 md:grid-cols-3 gap-4" @submit.prevent="createAssignment">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Class</label>
              <select
                v-model="newAssignment.classId"
                class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select a class...</option>
                <option
                  v-for="cls in unassignedClasses"
                  :key="cls.id"
                  :value="cls.id"
                >
                  {{ cls.classCode }} - {{ cls.school?.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Evaluator</label>
              <select
                v-model="newAssignment.evaluatorId"
                class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Select an evaluator...</option>
                <option
                  v-for="evaluator in evaluators"
                  :key="evaluator.id"
                  :value="evaluator.id"
                >
                  {{ evaluator.firstName }} {{ evaluator.lastName }}
                  <template v-if="getWorkloadCount(evaluator.id)">
                    ({{ getWorkloadCount(evaluator.id) }} classes)
                  </template>
                </option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                type="submit"
                :disabled="isCreating"
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isCreating ? 'Assigning...' : 'Assign' }}
              </button>
            </div>
          </form>
        </BaseCard>
      </section>

      <section class="mb-8">
        <BaseCard>
          <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
            <div>
              <h3 class="text-lg font-semibold text-neutral-900">Bulk Assignment</h3>
              <p class="text-sm text-neutral-600">Select unassigned classes and assign them to one evaluator.</p>
            </div>
            <button
              type="button"
              class="text-sm text-blue-600 hover:underline"
              @click="toggleSelectAll"
            >
              {{ allUnassignedSelected ? 'Unselect All' : 'Select All Unassigned' }}
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-neutral-700 mb-1">Evaluator</label>
              <select
                v-model="bulkAssignment.evaluatorId"
                class="w-full rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select an evaluator...</option>
                <option v-for="evaluator in evaluators" :key="evaluator.id" :value="evaluator.id">
                  {{ evaluator.firstName }} {{ evaluator.lastName }}
                </option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                type="button"
                :disabled="isBulkCreating || !bulkAssignment.evaluatorId || selectedClassIds.length === 0"
                class="w-full px-4 py-2 bg-yukon-teal text-white rounded-md hover:opacity-90 disabled:opacity-50"
                @click="createBulkAssignments"
              >
                {{ isBulkCreating ? 'Assigning...' : `Assign ${selectedClassIds.length} Class(es)` }}
              </button>
            </div>
          </div>

          <div class="max-h-64 overflow-auto border border-neutral-200 rounded-md">
            <div
              v-for="cls in unassignedClasses"
              :key="cls.id"
              class="flex items-center gap-3 px-4 py-2 border-b border-neutral-100 last:border-b-0"
            >
              <input
                :id="`class-${cls.id}`"
                v-model="selectedClassIds"
                type="checkbox"
                :value="cls.id"
                class="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <label :for="`class-${cls.id}`" class="text-sm text-neutral-800 cursor-pointer">
                {{ cls.classCode }} - {{ cls.school?.name }}
              </label>
            </div>
            <div v-if="unassignedClasses.length === 0" class="px-4 py-6 text-sm text-neutral-500">
              All included classes are currently assigned.
            </div>
          </div>
        </BaseCard>
      </section>

      <section>
        <BaseCard>
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Current Assignments</h3>

          <div v-if="assignments.length === 0" class="text-center py-8 text-neutral-500">
            No assignments yet.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Class</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">School</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Evaluator</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assigned By</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr v-for="assignment in assignments" :key="assignment.id">
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                    {{ assignment.class?.classCode }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                    {{ assignment.class?.school?.name }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-900">
                    {{ assignment.evaluator?.firstName }} {{ assignment.evaluator?.lastName }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                    {{ assignment.assigner?.firstName }} {{ assignment.assigner?.lastName }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <button
                      class="text-red-600 hover:text-red-800"
                      :disabled="deleting === assignment.id"
                      @click="deleteAssignment(assignment.id)"
                    >
                      {{ deleting === assignment.id ? 'Removing...' : 'Remove' }}
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
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';

const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface AssignableClass {
  id: number;
  classCode: string;
  school?: { name: string };
}

interface Assignment {
  id: number;
  classId: number;
  evaluatorId: number;
  class?: { classCode: string; school?: { name: string } };
  evaluator?: { firstName: string; lastName: string };
  assigner?: { firstName: string; lastName: string };
}

interface Evaluator {
  id: number;
  firstName: string;
  lastName: string;
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

const isLoading = ref(true);
const error = ref<string | null>(null);
const isCreating = ref(false);
const isBulkCreating = ref(false);
const deleting = ref<number | null>(null);

const activeCycle = ref<{ id: number; name: string } | null>(null);
const assignableClasses = ref<AssignableClass[]>([]);
const assignments = ref<Assignment[]>([]);
const evaluators = ref<Evaluator[]>([]);
const workloadCounts = ref<Array<{ evaluatorId: number; classCount: number }>>([]);

const newAssignment = ref({
  classId: '',
  evaluatorId: '',
});

const bulkAssignment = ref({
  evaluatorId: '',
});
const selectedClassIds = ref<number[]>([]);

const assignedClassIds = computed(() => new Set(assignments.value.map((assignment) => assignment.classId)));
const unassignedClasses = computed(() =>
  assignableClasses.value.filter((classItem) => !assignedClassIds.value.has(classItem.id)),
);

const assignedCount = computed(() => assignments.value.length);
const unassignedCount = computed(() => unassignedClasses.value.length);
const allUnassignedSelected = computed(
  () =>
    unassignedClasses.value.length > 0 &&
    unassignedClasses.value.every((classItem) => selectedClassIds.value.includes(classItem.id)),
);

function getAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }

  return headers;
}

function getWorkloadCount(evaluatorId: number) {
  return workloadCounts.value.find((item) => item.evaluatorId === evaluatorId)?.classCount ?? 0;
}

function toggleSelectAll() {
  if (allUnassignedSelected.value) {
    selectedClassIds.value = [];
    return;
  }

  selectedClassIds.value = unassignedClasses.value.map((classItem) => classItem.id);
}

async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    const cycleResponse = await fetch(`${API_BASE}/cycles/active`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!cycleResponse.ok) {
      throw new Error('Failed to fetch active cycle');
    }

    activeCycle.value = await cycleResponse.json();

    if (!activeCycle.value) {
      throw new Error('No active cycle found');
    }

    const [classesResponse, assignmentsResponse, evaluatorsResponse, workloadResponse] = await Promise.all([
      fetch(`${API_BASE}/coordinator/assignments/classes?cycleId=${activeCycle.value.id}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      }),
      fetch(`${API_BASE}/coordinator/assignments?cycleId=${activeCycle.value.id}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      }),
      fetch(`${API_BASE}/coordinator/assignments/evaluators`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      }),
      fetch(`${API_BASE}/coordinator/assignments/workload?cycleId=${activeCycle.value.id}`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      }),
    ]);

    if (!classesResponse.ok || !assignmentsResponse.ok || !evaluatorsResponse.ok || !workloadResponse.ok) {
      throw new Error('Failed to fetch assignment data');
    }

    assignableClasses.value = await classesResponse.json();
    assignments.value = await assignmentsResponse.json();
    evaluators.value = await evaluatorsResponse.json();
    workloadCounts.value = await workloadResponse.json();

    selectedClassIds.value = selectedClassIds.value.filter((id) =>
      unassignedClasses.value.some((classItem) => classItem.id === id),
    );
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

async function createAssignment() {
  if (!newAssignment.value.classId || !newAssignment.value.evaluatorId || !activeCycle.value) {
    return;
  }

  isCreating.value = true;

  try {
    const response = await fetch(`${API_BASE}/coordinator/assignments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        cycleId: activeCycle.value.id,
        classId: Number(newAssignment.value.classId),
        evaluatorId: Number(newAssignment.value.evaluatorId),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Failed to create assignment');
    }

    newAssignment.value = { classId: '', evaluatorId: '' };
    await fetchData();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to create assignment');
  } finally {
    isCreating.value = false;
  }
}

async function createBulkAssignments() {
  if (!activeCycle.value || !bulkAssignment.value.evaluatorId || selectedClassIds.value.length === 0) {
    return;
  }

  isBulkCreating.value = true;

  try {
    const response = await fetch(`${API_BASE}/coordinator/assignments/bulk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        cycleId: activeCycle.value.id,
        assignments: selectedClassIds.value.map((classId) => ({
          classId,
          evaluatorId: Number(bulkAssignment.value.evaluatorId),
        })),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || 'Failed to create bulk assignments');
    }

    const result = await response.json();
    selectedClassIds.value = [];
    alert(`Created ${result.recordsCreated} assignments (${result.recordsSkipped} skipped duplicates).`);
    await fetchData();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to create bulk assignments');
  } finally {
    isBulkCreating.value = false;
  }
}

async function deleteAssignment(id: number) {
  if (!confirm('Are you sure you want to remove this assignment?')) {
    return;
  }

  deleting.value = id;

  try {
    const response = await fetch(`${API_BASE}/coordinator/assignments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to delete assignment');
    }

    await fetchData();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete assignment');
  } finally {
    deleting.value = null;
  }
}

onMounted(fetchData);
</script>
