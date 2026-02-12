<template>
  <AppShell :user="currentUser">
    <div class="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">Coordinator Dashboard</h1>
        <p class="text-neutral-600">Track assignment coverage and school scheduling readiness.</p>
      </div>
      <div class="flex gap-2">
        <RouterLink
          to="/coordinator/assignments"
          class="px-4 py-2 rounded-md bg-yukon-navy text-white hover:bg-yukon-teal"
        >
          Manage Assignments
        </RouterLink>
        <RouterLink
          to="/coordinator/scheduling"
          class="px-4 py-2 rounded-md border border-neutral-300 text-neutral-800 hover:bg-neutral-100"
        >
          Manage Schedule
        </RouterLink>
      </div>
    </div>

    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchData">Retry</button>
    </div>

    <template v-else>
      <section class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard :value="summary.totalSchools" label="Schools" variant="default" />
          <StatCard :value="summary.assignedSchools" label="Fully Assigned" variant="green" />
          <StatCard :value="summary.unassignedSchools" label="Need Assignment" variant="yellow" />
          <StatCard :value="scheduledSchools" label="Scheduled" variant="default" />
        </div>
      </section>

      <section>
        <BaseCard>
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold text-neutral-900">
              School Coverage
              <span v-if="cycle" class="text-sm text-neutral-500 font-normal">({{ cycle.name }})</span>
            </h3>
          </div>

          <div v-if="schools.length === 0" class="text-center py-10 text-neutral-500">
            No included schools found for the active cycle.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">School</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Included Classes</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Assigned</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Unassigned</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Scheduled Dates</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr v-for="school in schools" :key="school.id">
                  <td class="px-4 py-3 text-sm text-neutral-900">
                    <div class="font-medium">{{ school.name }}</div>
                    <div class="text-xs text-neutral-500">{{ school.schoolCode }}</div>
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-700">{{ school.includedClassCount }}</td>
                  <td class="px-4 py-3 text-sm text-neutral-700">{{ school.assignedClassCount }}</td>
                  <td class="px-4 py-3 text-sm text-neutral-700">{{ school.unassignedClassCount }}</td>
                  <td class="px-4 py-3 text-sm text-neutral-700">{{ school.scheduledDateCount }}</td>
                  <td class="px-4 py-3 text-sm">
                    <span
                      :class="[
                        'inline-flex px-2 py-1 rounded-full text-xs font-medium',
                        school.isFullyAssigned
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800',
                      ]"
                    >
                      {{ school.isFullyAssigned ? 'Ready' : 'Pending' }}
                    </span>
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
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';

const authStore = useAuthStore();

interface SchoolCoverage {
  id: number;
  schoolCode: string;
  name: string;
  includedClassCount: number;
  assignedClassCount: number;
  unassignedClassCount: number;
  scheduledDateCount: number;
  isFullyAssigned: boolean;
}

interface CoordinatorSchoolsResponse {
  cycle?: { id: number; name: string };
  schools?: SchoolCoverage[];
  summary?: {
    totalSchools: number;
    assignedSchools: number;
    unassignedSchools: number;
  };
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
const cycle = ref<{ id: number; name: string } | null>(null);
const schools = ref<SchoolCoverage[]>([]);
const summary = ref({
  totalSchools: 0,
  assignedSchools: 0,
  unassignedSchools: 0,
});

const scheduledSchools = computed(
  () => schools.value.filter((school) => school.scheduledDateCount > 0).length,
);

async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.get<CoordinatorSchoolsResponse>('/coordinator/schools');
    cycle.value = response.cycle ?? null;
    schools.value = response.schools ?? [];
    summary.value = response.summary ?? summary.value;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchData);
</script>
