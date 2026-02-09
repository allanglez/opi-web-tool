<template>
  <AppShell :user="currentUser">
    <!-- Page Title -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Evaluator Assignments</h1>
      <p class="text-neutral-600">Assign evaluators to classes for the current assessment cycle.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button @click="fetchData" class="mt-2 text-sm text-red-600 hover:underline">Retry</button>
    </div>

    <template v-else>
      <!-- Stats Overview -->
      <section class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard :value="includedClasses.length" label="Included Classes" variant="default" />
          <StatCard :value="assignedCount" label="Assigned" variant="green" />
          <StatCard :value="unassignedCount" label="Unassigned" variant="yellow" />
        </div>
      </section>

      <!-- Assignment Form -->
      <section class="mb-8">
        <BaseCard>
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Create New Assignment</h3>
          <form @submit.prevent="createAssignment" class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <template v-if="getWorkloadCount(evaluator.id)">({{ getWorkloadCount(evaluator.id) }} classes)</template>
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

      <!-- Current Assignments -->
      <section>
        <BaseCard>
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Current Assignments</h3>
          
          <div v-if="assignments.length === 0" class="text-center py-8 text-neutral-500">
            No assignments yet. Create one above.
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
                      @click="deleteAssignment(assignment.id)"
                      class="text-red-600 hover:text-red-800"
                      :disabled="deleting === assignment.id"
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
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';

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
const isCreating = ref(false);
const deleting = ref<number | null>(null);

const activeCycle = ref<{ id: number; name: string } | null>(null);
const includedClasses = ref<Array<{ id: number; classCode: string; school?: { name: string } }>>([]);
const assignments = ref<Array<{
  id: number;
  classId: number;
  evaluatorId: number;
  class?: { classCode: string; school?: { name: string } };
  evaluator?: { firstName: string; lastName: string };
  assigner?: { firstName: string; lastName: string };
}>>([]);
const evaluators = ref<Array<{ id: number; firstName: string; lastName: string }>>([]);
const workloadCounts = ref<Array<{ evaluatorId: number; classCount: number }>>([]);

const newAssignment = ref({
  classId: '',
  evaluatorId: '',
});

// Computed
const assignedClassIds = computed(() => new Set(assignments.value.map(a => a.classId)));
const unassignedClasses = computed(() => 
  includedClasses.value.filter(c => !assignedClassIds.value.has(c.id))
);
const assignedCount = computed(() => assignments.value.length);
const unassignedCount = computed(() => unassignedClasses.value.length);

const getWorkloadCount = (evaluatorId: number) => {
  const found = workloadCounts.value.find(w => w.evaluatorId === evaluatorId);
  return found?.classCount ?? 0;
};

// API calls
async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    const token = authStore.token;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch active cycle
    const cycleRes = await fetch(`${API_BASE}/cycles/active`, { headers });
    if (!cycleRes.ok) throw new Error('Failed to fetch active cycle');
    activeCycle.value = await cycleRes.json();

    if (!activeCycle.value) {
      error.value = 'No active cycle found';
      return;
    }

    // Fetch included classes
    const classesRes = await fetch(`${API_BASE}/classes?included=true`, { headers });
    if (!classesRes.ok) throw new Error('Failed to fetch classes');
    includedClasses.value = await classesRes.json();

    // Fetch existing assignments
    const assignmentsRes = await fetch(`${API_BASE}/assignments?cycleId=${activeCycle.value.id}`, { headers });
    if (!assignmentsRes.ok) throw new Error('Failed to fetch assignments');
    assignments.value = await assignmentsRes.json();

    // Fetch evaluators
    const evaluatorsRes = await fetch(`${API_BASE}/assignments/evaluators`, { headers });
    if (!evaluatorsRes.ok) throw new Error('Failed to fetch evaluators');
    evaluators.value = await evaluatorsRes.json();

    // Fetch workload counts
    const workloadRes = await fetch(`${API_BASE}/assignments/workload?cycleId=${activeCycle.value.id}`, { headers });
    if (workloadRes.ok) {
      workloadCounts.value = await workloadRes.json();
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

async function createAssignment() {
  if (!newAssignment.value.classId || !newAssignment.value.evaluatorId || !activeCycle.value) return;

  isCreating.value = true;
  try {
    const token = authStore.token;
    const res = await fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cycleId: activeCycle.value.id,
        classId: parseInt(newAssignment.value.classId),
        evaluatorId: parseInt(newAssignment.value.evaluatorId),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create assignment');
    }

    const created = await res.json();
    assignments.value.push(created);
    newAssignment.value = { classId: '', evaluatorId: '' };

    // Refresh workload counts
    const workloadRes = await fetch(`${API_BASE}/assignments/workload?cycleId=${activeCycle.value.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (workloadRes.ok) {
      workloadCounts.value = await workloadRes.json();
    }
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to create assignment');
  } finally {
    isCreating.value = false;
  }
}

async function deleteAssignment(id: number) {
  if (!confirm('Are you sure you want to remove this assignment?')) return;

  deleting.value = id;
  try {
    const token = authStore.token;
    const res = await fetch(`${API_BASE}/assignments/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Failed to delete assignment');

    assignments.value = assignments.value.filter(a => a.id !== id);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to delete assignment');
  } finally {
    deleting.value = null;
  }
}

onMounted(fetchData);
</script>
