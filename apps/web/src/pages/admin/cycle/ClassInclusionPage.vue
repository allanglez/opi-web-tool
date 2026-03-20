<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="mb-8 mt-4">
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
            class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="fetchClasses"
          >
            <option value="">All Cycles</option>
            <option v-if="activeCycle" :value="activeCycle.id">{{ activeCycle.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">School</label>
          <select
            v-model="filters.schoolId"
            class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="fetchClasses"
          >
            <option value="">All Schools</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Program</label>
          <select
            v-model="filters.programId"
            class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="fetchClasses"
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
          :disabled="isLoading"
          class="px-4 py-2 text-sm bg-[#0f3f52] text-white hover:bg-[#0c3444] disabled:bg-neutral-300 transition-colors"
          @click="fetchClasses"
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

      <div v-else>
        <AppDataTable
          :data="classes"
          :columns="classColumns"
          search-placeholder="Search school, class, program, teacher..."
          empty-text="No classes found."
          :initial-page-size="10"
        >
          <template #cell-school="{ row }">
            <span class="text-sm text-neutral-900">{{ asClassItem(row).school.name }}</span>
          </template>

          <template #cell-classCode="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-neutral-900">{{ asClassItem(row).classCode }}</span>
              <span
                v-if="asClassItem(row).isManuallyEdited"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800"
                title="This class was manually edited"
              >
                <Pencil class="w-3 h-3 mr-1" />
                Manually Edited
              </span>
            </div>
          </template>

          <template #cell-program="{ row }">
            <span class="text-sm text-neutral-600">{{ asClassItem(row).program?.name || 'N/A' }}</span>
          </template>

          <template #cell-grade="{ row }">
            <span class="text-sm text-neutral-600">{{ asClassItem(row).grade || 'N/A' }}</span>
          </template>

          <template #cell-teacher="{ row }">
            <span class="text-sm text-neutral-600">{{ asClassItem(row).teacher?.name || 'N/A' }}</span>
          </template>

          <template #cell-students="{ row }">
            <span class="text-sm text-neutral-600">{{ asClassItem(row)._count.classStudents }}</span>
          </template>

          <template #cell-included="{ row }">
            <button
              :disabled="updatingClassIds.has(asClassItem(row).id)"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              :class="asClassItem(row).isIncluded ? 'bg-green-600' : 'bg-neutral-300'"
              @click="toggleInclusion(asClassItem(row))"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                :class="asClassItem(row).isIncluded ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </template>
          <template #cell-actions="{ row }">
            <button
              class="px-3 py-1 text-sm bg-[#0f3f52] text-white hover:bg-[#0c3444]"
              @click="openEditDialog(asClassItem(row))"
            >
              Edit
            </button>
          </template>
        </AppDataTable>
      </div>
    </BaseCard>

    <div v-if="error" class="mt-6">
      <BaseCard variant="error">
        <div class="text-red-600">{{ error }}</div>
      </BaseCard>
    </div>

    <!-- Class Edit Dialog -->
    <ClassEditDialog
      :visible="editDialogVisible"
      :class-item="selectedClass"
      :programs="programs"
      @close="editDialogVisible = false"
      @saved="onClassSaved"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil } from 'lucide-vue-next';
import { useAuthStore } from '../../../stores/auth';
import AppShell from '../../../components/layout/AppShell.vue';
import AdminSubNav from '../../../components/layout/AdminSubNav.vue';
import BaseCard from '../../../components/ui/BaseCard.vue';
import AppDataTable from '../../../components/ui/data-table/AppDataTable.vue';
import ClassEditDialog from '../../../components/admin/ClassEditDialog.vue';
import type { DataTableColumn } from '../../../components/ui/data-table/types';

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
  teacher?: { id: number; teacherId: string; name: string } | null;
  isIncluded: boolean;
  isManuallyEdited: boolean;
  school: {
    id: number;
    schoolCode: string;
    name: string;
  };
  program?: {
    id: number;
    name: string;
  } | null;
  cycle: {
    id: number;
    name: string;
  };
  _count: {
    classStudents: number;
  };
}

interface Program {
  id: number;
  name: string;
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
const editDialogVisible = ref(false);
const selectedClass = ref<Class | null>(null);
const programs = ref<Program[]>([]);

const classColumns: DataTableColumn<Class>[] = [
  {
    key: 'school',
    header: 'School',
    sortable: true,
    searchable: true,
    value: (row) => row.school.name,
  },
  {
    key: 'classCode',
    header: 'Class Code',
    sortable: true,
    searchable: true,
    value: (row) => row.classCode,
  },
  {
    key: 'program',
    header: 'Program',
    sortable: true,
    searchable: true,
    value: (row) => row.program?.name || 'N/A',
  },
  {
    key: 'grade',
    header: 'Grade',
    sortable: true,
    searchable: true,
    value: (row) => row.grade || 'N/A',
  },
  {
    key: 'teacher',
    header: 'Teacher',
    sortable: true,
    searchable: true,
    value: (row) => row.teacher?.name || 'N/A',
  },
  {
    key: 'students',
    header: 'Students',
    sortable: true,
    searchable: false,
    value: (row) => row._count.classStudents,
  },
  {
    key: 'included',
    header: 'Included',
    sortable: true,
    searchable: true,
    value: (row) => (row.isIncluded ? 'Included' : 'Excluded'),
  },
  {
    key: 'actions',
    header: '',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

function asClassItem(row: unknown): Class {
  return row as Class;
}

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

function openEditDialog(classItem: Class) {
  selectedClass.value = classItem;
  editDialogVisible.value = true;
}

async function onClassSaved() {
  editDialogVisible.value = false;
  selectedClass.value = null;
  await fetchClasses();
}

async function fetchPrograms() {
  try {
    // Extract unique programs from loaded classes
    const programMap = new Map<number, Program>();
    for (const cls of classes.value) {
      if (cls.program) {
        programMap.set(cls.program.id, cls.program);
      }
    }
    programs.value = Array.from(programMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    programs.value = [];
  }
}

onMounted(async () => {
  await fetchActiveCycle();
  await fetchClasses();
  fetchPrograms();
});
</script>
