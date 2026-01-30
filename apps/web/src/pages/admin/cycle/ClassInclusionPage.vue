<template>
  <AppShell :user="currentUser">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Class Inclusion Management</h1>
      <p class="text-neutral-600">Control which classes are included in the assessment cycle.</p>
    </div>

    <BaseCard class="mb-6">
      <h2 class="text-lg font-semibold text-neutral-900 mb-4">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Cycle</label>
          <select
            v-model="filters.cycleId"
            @change="fetchClasses"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Cycles</option>
            <option v-if="activeCycle" :value="activeCycle.id">{{ activeCycle.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">School</label>
          <select
            v-model="filters.schoolId"
            @change="fetchClasses"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Schools</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Program</label>
          <select
            v-model="filters.programId"
            @change="fetchClasses"
            class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Programs</option>
          </select>
        </div>
      </div>
    </BaseCard>

    <BaseCard>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">
          Classes ({{ classes.length }})
        </h2>
        <button
          @click="fetchClasses"
          :disabled="isLoading"
          class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-neutral-300 transition-colors"
        >
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="isLoading && classes.length === 0" class="text-center py-8 text-neutral-500">
        Loading classes...
      </div>

      <div v-else-if="classes.length === 0" class="text-center py-8 text-neutral-500">
        No classes found. Import class data first.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">School</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Class Code</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Program</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Grade</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Teacher</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Students</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-neutral-700">Included</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            <tr v-for="classItem in classes" :key="classItem.id" class="hover:bg-neutral-50">
              <td class="px-4 py-3 text-sm text-neutral-900">
                {{ classItem.school.name }}
              </td>
              <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                {{ classItem.classCode }}
              </td>
              <td class="px-4 py-3 text-sm text-neutral-600">
                {{ classItem.program?.name || 'N/A' }}
              </td>
              <td class="px-4 py-3 text-sm text-neutral-600">
                {{ classItem.grade || 'N/A' }}
              </td>
              <td class="px-4 py-3 text-sm text-neutral-600">
                {{ classItem.teacher || 'N/A' }}
              </td>
              <td class="px-4 py-3 text-sm text-neutral-600">
                {{ classItem._count.classStudents }}
              </td>
              <td class="px-4 py-3 text-sm">
                <button
                  @click="toggleInclusion(classItem)"
                  :disabled="updatingClassIds.has(classItem.id)"
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  :class="classItem.isIncluded ? 'bg-green-600' : 'bg-neutral-300'"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    :class="classItem.isIncluded ? 'translate-x-6' : 'translate-x-1'"
                  />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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

const authStore = useAuthStore();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

interface Class {
  id: number;
  classCode: string;
  grade?: number;
  teacher?: string;
  isIncluded: boolean;
  school: {
    id: number;
    schoolCode: string;
    name: string;
  };
  program?: {
    id: number;
    name: string;
  };
  cycle: {
    id: number;
    name: string;
  };
  _count: {
    classStudents: number;
  };
}

interface Cycle {
  id: number;
  name: string;
}

const classes = ref<Class[]>([]);
const activeCycle = ref<Cycle | null>(null);
const updatingClassIds = ref(new Set<number>());
const isLoading = ref(false);
const error = ref<string | null>(null);

const filters = ref({
  cycleId: '',
  schoolId: '',
  programId: '',
});

const fetchActiveCycle = async () => {
  try {
    const response = await fetch('/api/v1/cycles/active', {
      credentials: 'include',
    });

    if (response.ok) {
      activeCycle.value = await response.json();
      filters.value.cycleId = activeCycle.value?.id.toString() || '';
    }
  } catch (err) {
    console.error('Failed to fetch active cycle:', err);
  }
};

const fetchClasses = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const params = new URLSearchParams();
    if (filters.value.cycleId) params.append('cycleId', filters.value.cycleId);
    if (filters.value.schoolId) params.append('schoolId', filters.value.schoolId);
    if (filters.value.programId) params.append('programId', filters.value.programId);

    const response = await fetch(`/api/v1/admin/classes?${params.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch classes');
    }

    classes.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    isLoading.value = false;
  }
};

const toggleInclusion = async (classItem: Class) => {
  updatingClassIds.value.add(classItem.id);
  error.value = null;

  try {
    const response = await fetch(`/api/v1/admin/classes/${classItem.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        isIncluded: !classItem.isIncluded,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update class inclusion');
    }

    classItem.isIncluded = !classItem.isIncluded;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    updatingClassIds.value.delete(classItem.id);
  }
};

onMounted(async () => {
  await fetchActiveCycle();
  await fetchClasses();
});
</script>
