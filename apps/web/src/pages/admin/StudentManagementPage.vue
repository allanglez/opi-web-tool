<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="mb-8 mt-4">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Student Management</h1>
      <p class="text-neutral-600">View and manually correct student data. Changes are logged in the audit trail.</p>
    </div>

    <!-- Filters -->
    <BaseCard class="mb-6">
      <h2 class="text-lg font-semibold text-neutral-900 mb-4">Filters</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">Cycle</label>
          <select
            v-model="filters.cycleId"
            class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="fetchStudents"
          >
            <option value="">Select Cycle</option>
            <option v-if="activeCycle" :value="activeCycle.id">{{ activeCycle.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">School</label>
          <select
            v-model="filters.schoolId"
            class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @change="fetchStudents"
          >
            <option value="">All Schools</option>
            <option v-for="school in schools" :key="school.id" :value="school.id">
              {{ school.name }}
            </option>
          </select>
        </div>
      </div>
    </BaseCard>

    <!-- Students Table -->
    <BaseCard>
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold text-neutral-900">
          Students ({{ students.length }})
        </h2>
        <button
          :disabled="isLoading"
          class="px-4 py-2 text-sm bg-[#0f3f52] text-white hover:bg-[#0c3444] disabled:bg-neutral-300 transition-colors"
          @click="fetchStudents"
        >
          {{ isLoading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>

      <div v-if="isLoading && students.length === 0" class="text-center py-8 text-neutral-500">
        Loading students...
      </div>

      <div v-else-if="!filters.cycleId" class="text-center py-8 text-neutral-500">
        Select a cycle to view students.
      </div>

      <div v-else-if="students.length === 0" class="text-center py-8 text-neutral-500">
        No students found.
      </div>

      <div v-else>
        <AppDataTable
          :data="students"
          :columns="studentColumns"
          search-placeholder="Search name, student number, school..."
          empty-text="No students found."
          :initial-page-size="15"
        >
          <template #cell-name="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-neutral-900">
                {{ asStudent(row).lastName }}, {{ asStudent(row).firstName }}
              </span>
              <span
                v-if="asStudent(row).isManuallyEdited"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800"
              >
                <Pencil class="w-3 h-3 mr-1" />
                Manually Edited
              </span>
            </div>
          </template>

          <template #cell-studentNumber="{ row }">
            <span class="text-sm text-neutral-600">{{ asStudent(row).studentNumber }}</span>
          </template>

          <template #cell-grade="{ row }">
            <span class="text-sm text-neutral-600">{{ asStudent(row).grade ?? 'N/A' }}</span>
          </template>

          <template #cell-school="{ row }">
            <span class="text-sm text-neutral-600">{{ asStudent(row).school.name }}</span>
          </template>

          <template #cell-classes="{ row }">
            <span class="text-sm text-neutral-600">
              {{ asStudent(row).classStudents.length }}
            </span>
          </template>

          <template #cell-actions="{ row }">
            <button
              class="px-3 py-1 text-sm bg-[#0f3f52] text-white hover:bg-[#0c3444]"
              @click="editStudent(asStudent(row))"
            >
              Edit
            </button>
          </template>
        </AppDataTable>
      </div>
    </BaseCard>

    <!-- Error -->
    <div v-if="error" class="mt-6">
      <BaseCard>
        <div class="text-red-600">{{ error }}</div>
      </BaseCard>
    </div>

    <!-- Edit Dialog -->
    <StudentEditDialog
      :visible="editDialogVisible"
      :student="selectedStudent"
      :schools="schools"
      :cycle-id="Number(filters.cycleId) || 0"
      @close="editDialogVisible = false"
      @saved="onStudentSaved"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Pencil } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import StudentEditDialog from '../../components/admin/StudentEditDialog.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

const authStore = useAuthStore();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

interface StudentListItem {
  id: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  grade?: number | null;
  isManuallyEdited: boolean;
  schoolId: number;
  school: { id: number; schoolCode: string; name: string };
  classStudents: Array<{ class: { id: number; classCode: string } }>;
}

interface StudentDetail {
  id: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  pen?: string | null;
  grade?: number | null;
  schoolId: number;
  cycleId: number;
  isManuallyEdited: boolean;
  school: { id: number; schoolCode: string; name: string };
  cycle: { id: number; name: string; year: number };
  classStudents: Array<{
    classId: number;
    class: { id: number; classCode: string; courseTitle?: string };
  }>;
}

interface School {
  id: number;
  schoolCode: string;
  name: string;
}

interface Cycle {
  id: number;
  name: string;
}

const students = ref<StudentListItem[]>([]);
const schools = ref<School[]>([]);
const activeCycle = ref<Cycle | null>(null);
const isLoading = ref(false);
const error = ref<string | null>(null);
const editDialogVisible = ref(false);
const selectedStudent = ref<StudentDetail | null>(null);

const filters = ref({
  cycleId: '',
  schoolId: '',
});

const studentColumns: DataTableColumn<StudentListItem>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    searchable: true,
    value: (row) => `${row.lastName}, ${row.firstName} ${row.middleName || ''}`,
    sortValue: (row) => `${row.lastName} ${row.firstName}`,
  },
  {
    key: 'studentNumber',
    header: 'Student #',
    sortable: true,
    searchable: true,
    value: (row) => row.studentNumber,
  },
  {
    key: 'grade',
    header: 'Grade',
    sortable: true,
    searchable: true,
    value: (row) => row.grade ?? 'N/A',
  },
  {
    key: 'school',
    header: 'School',
    sortable: true,
    searchable: true,
    value: (row) => row.school.name,
  },
  {
    key: 'classes',
    header: 'Classes',
    sortable: true,
    searchable: false,
    value: (row) => row.classStudents.length,
  },
  {
    key: 'actions',
    header: '',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

function asStudent(row: unknown): StudentListItem {
  return row as StudentListItem;
}

async function fetchActiveCycle() {
  try {
    const cycle = await api.get<Cycle>('/cycles/active');
    activeCycle.value = cycle;
    if (cycle?.id) {
      filters.value.cycleId = String(cycle.id);
    }
  } catch {
    // No active cycle
  }
}

async function fetchSchools() {
  try {
    // Get schools from the classes endpoint (which includes school info)
    const classes = await api.get<Array<{ school: School }>>('/admin/classes', {
      cycleId: filters.value.cycleId,
    });
    const schoolMap = new Map<number, School>();
    for (const cls of classes) {
      if (cls.school && !schoolMap.has(cls.school.id)) {
        schoolMap.set(cls.school.id, cls.school);
      }
    }
    schools.value = Array.from(schoolMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    schools.value = [];
  }
}

async function fetchStudents() {
  if (!filters.value.cycleId) return;

  isLoading.value = true;
  error.value = null;

  try {
    const params: Record<string, unknown> = {
      cycleId: filters.value.cycleId,
    };
    if (filters.value.schoolId) {
      params.schoolId = filters.value.schoolId;
    }

    students.value = await api.get<StudentListItem[]>('/admin/students', params);
    await fetchSchools();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load students';
  } finally {
    isLoading.value = false;
  }
}

async function editStudent(student: StudentListItem) {
  try {
    const detail = await api.get<StudentDetail>(`/admin/students/${student.id}`);
    selectedStudent.value = detail;
    editDialogVisible.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load student details';
  }
}

async function onStudentSaved() {
  editDialogVisible.value = false;
  selectedStudent.value = null;
  await fetchStudents();
}

onMounted(async () => {
  await fetchActiveCycle();
  if (filters.value.cycleId) {
    await fetchStudents();
  }
});
</script>
