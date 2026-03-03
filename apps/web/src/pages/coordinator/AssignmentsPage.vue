<template>
  <AppShell :user="currentUser">
    <CoordinatorSubNav />

    <div class="container mx-auto px-6 py-8">
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
        <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchData">Retry</button>
      </div>

      <template v-else>
        <section class="mb-6">
          <h1 class="text-4xl font-bold text-neutral-900 mb-1">Assignments</h1>
          <p class="text-sm text-neutral-600">Manage evaluator and student assignments for OPI assessments.</p>
        </section>

        <!-- Header + Stats -->
        <BaseCard class="mb-6 border border-neutral-200 shadow-none">
          <h2 class="text-2xl font-bold text-neutral-900 mb-4">Class Assignment Management</h2>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard :value="stats.unassignedClasses" label="Unassigned Classes" variant="red" />
            <StatCard :value="stats.assignedClasses" label="Assigned Classes" variant="blue" />
            <StatCard :value="stats.inProgressClasses" label="In Progress" variant="yellow" />
            <StatCard :value="stats.completedClasses" label="Completed" variant="green" />
          </div>
        </BaseCard>

        <!-- Evaluator Workload -->
        <BaseCard class="mb-6 border border-neutral-200 shadow-none">
          <h3 class="text-lg font-bold text-neutral-900 mb-4">Evaluator Workload</h3>
          <div v-if="evaluatorWorkload.length === 0" class="text-neutral-500 text-sm py-4">
            No evaluators found.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              v-for="ev in evaluatorWorkload"
              :key="ev.id"
              class="rounded border border-neutral-200 bg-white p-4"
            >
              <div class="font-semibold text-neutral-900">{{ ev.firstName }} {{ ev.lastName }}</div>
              <div class="text-[11px] text-yukon-teal mb-2">{{ ev.email }}</div>
              <div class="text-sm text-neutral-700 mb-2">
                Total Classes: {{ ev.classCount }}
              </div>
              <div class="text-xs text-neutral-500 mb-2">
                Total Students: {{ ev.studentCount }}
              </div>
              <ProgressBar
                :percentage="ev.progress"
                :show-label="false"
                variant="default"
              />
            </div>
          </div>
        </BaseCard>

        <!-- All Classes Table -->
        <BaseCard class="border border-neutral-200 shadow-none">
          <div class="flex flex-col gap-3 mb-4 md:flex-row md:items-center md:justify-between">
            <h3 class="text-3xl font-bold text-neutral-900">All Classes</h3>
            <div class="flex items-center gap-3">
              <AppAutocomplete
                v-model="selectedSchoolId"
                :options="schoolOptions"
                label="Filter by School"
                placeholder="Search schools..."
                @update:model-value="fetchData"
              />
              <span class="text-sm text-neutral-500">{{ filteredClasses.length }} classes total</span>
            </div>
          </div>

          <div v-if="filteredClasses.length === 0" class="text-center py-8 text-neutral-500">
            No classes found.
          </div>

          <div v-else>
            <AppDataTable
              :data="filteredClasses"
              :columns="classColumns"
              search-placeholder="Search school, class, teacher, evaluator..."
              empty-text="No classes found."
              :initial-page-size="10"
            >
              <template #cell-school="{ row }">
                <div class="text-sm">
                  <div class="font-medium text-neutral-900">{{ asClassRow(row).school.name }}</div>
                  <div class="text-xs text-neutral-500">{{ asClassRow(row).school.schoolType }}</div>
                </div>
              </template>

              <template #cell-classCode="{ row }">
                <div class="text-sm">
                  <div class="font-semibold text-neutral-900">{{ asClassRow(row).classCode }}</div>
                  <div class="text-xs text-neutral-400">{{ asClassRow(row).school.schoolCode }}-{{ asClassRow(row).classCode }}</div>
                </div>
              </template>

              <template #cell-teacher="{ row }">
                <span class="text-sm text-neutral-700">{{ asClassRow(row).teacher ?? '—' }}</span>
              </template>

              <template #cell-gradeProgram="{ row }">
                <div class="text-sm text-neutral-700">
                  <span v-if="asClassRow(row).grade">Grade {{ asClassRow(row).grade }}</span>
                  <br v-if="asClassRow(row).grade && asClassRow(row).program" />
                  <span v-if="asClassRow(row).program" class="text-xs text-neutral-500">{{ asClassRow(row).program }}</span>
                  <span v-if="!asClassRow(row).grade && !asClassRow(row).program">—</span>
                </div>
              </template>

              <template #cell-progress="{ row }">
                <div class="text-sm">
                  <div class="font-semibold" :class="progressCountClass(asClassRow(row).progress)">
                    {{ asClassRow(row).completedStudents }}/{{ asClassRow(row).totalStudents }}
                  </div>
                  <div class="text-xs text-neutral-500 mb-1">{{ asClassRow(row).progress }}% complete</div>
                  <ProgressBar
                    :percentage="asClassRow(row).progress"
                    :show-label="false"
                    :variant="progressBarVariant(asClassRow(row).progress)"
                    class="w-24"
                  />
                </div>
              </template>

              <template #cell-assessmentDate="{ row }">
                <span class="text-sm text-neutral-700">{{ asClassRow(row).assessmentDate ?? '—' }}</span>
              </template>

              <template #cell-evaluators="{ row }">
                <template v-if="asClassRow(row).evaluators.length > 0">
                  <span
                    v-for="ev in asClassRow(row).evaluators"
                    :key="ev.id"
                    class="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded mr-1 mb-1"
                  >
                    {{ ev.name }}
                  </span>
                </template>
                <span v-else class="text-neutral-400 text-xs italic">None assigned</span>
              </template>

              <template #cell-actions="{ row }">
                <button
                  v-if="asClassRow(row).isAssigned"
                  class="px-3 py-1 text-xs font-bold border border-yukon-teal text-yukon-teal bg-white hover:bg-cyan-50 uppercase tracking-wide"
                  @click="openAssignModal(asClassRow(row))"
                >
                  Edit
                </button>
                <button
                  v-else
                  class="px-3 py-1 text-xs font-bold border border-yukon-navy bg-yukon-navy text-white hover:bg-[#122937] uppercase tracking-wide"
                  @click="openAssignModal(asClassRow(row))"
                >
                  Assign
                </button>
              </template>
            </AppDataTable>
          </div>
        </BaseCard>
      </template>

      <!-- Assign Evaluator Modal -->
      <AssignEvaluatorModal
        v-if="showAssignModal && selectedClass"
        :class-data="selectedClass"
        :evaluators="evaluatorWorkload"
        @close="showAssignModal = false"
        @saved="onAssignmentSaved"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import CoordinatorSubNav from '../../components/layout/CoordinatorSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import AppAutocomplete from '../../components/ui/AppAutocomplete.vue';
import AssignEvaluatorModal from '../../components/coordinator/AssignEvaluatorModal.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

const authStore = useAuthStore();

interface ClassEvaluator {
  id: number;
  name: string;
  email: string;
  assignmentId: number;
}

interface ClassRow {
  id: number;
  classCode: string;
  grade: number | null;
  school: {
    id: number;
    schoolCode: string;
    name: string;
    schoolType: string;
  };
  teacher: string | null;
  program: string | null;
  totalStudents: number;
  completedStudents: number;
  inProgressStudents: number;
  progress: number;
  assessmentDates: string[];
  assessmentDate: string | null;
  evaluators: ClassEvaluator[];
  isAssigned: boolean;
}

interface EvaluatorWorkload {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  classCount: number;
  studentCount: number;
  completedCount: number;
  progress: number;
}

interface ManagementResponse {
  cycle?: { id: number; name: string };
  stats?: {
    unassignedClasses: number;
    assignedClasses: number;
    inProgressClasses: number;
    completedClasses: number;
    totalClasses: number;
  };
  evaluatorWorkload?: EvaluatorWorkload[];
  schools?: Array<{ id: number; name: string }>;
  classes?: ClassRow[];
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
const selectedSchoolId = ref<number | null>(null);
const stats = ref({
  unassignedClasses: 0,
  assignedClasses: 0,
  inProgressClasses: 0,
  completedClasses: 0,
  totalClasses: 0,
});
const evaluatorWorkload = ref<EvaluatorWorkload[]>([]);
const schools = ref<Array<{ id: number; name: string }>>([]);
const classes = ref<ClassRow[]>([]);

const classColumns: DataTableColumn<ClassRow>[] = [
  {
    key: 'school',
    header: 'School',
    sortable: true,
    searchable: true,
    value: (row) => row.school.name,
  },
  {
    key: 'classCode',
    header: 'Class',
    sortable: true,
    searchable: true,
    value: (row) => row.classCode,
  },
  {
    key: 'teacher',
    header: 'Teacher',
    sortable: true,
    searchable: true,
    value: (row) => row.teacher ?? '—',
  },
  {
    key: 'gradeProgram',
    header: 'Grade/Program',
    sortable: true,
    searchable: true,
    value: (row) => `Grade ${row.grade ?? 'N/A'} ${row.program ?? ''}`.trim(),
  },
  {
    key: 'progress',
    header: 'Assessment Progress',
    sortable: true,
    searchable: false,
    value: (row) => row.progress,
  },
  {
    key: 'assessmentDate',
    header: 'Assessment Date',
    sortable: true,
    searchable: true,
    value: (row) => row.assessmentDate ?? '—',
  },
  {
    key: 'evaluators',
    header: 'Assigned Evaluators',
    sortable: false,
    searchable: true,
    value: (row) => row.evaluators.map((ev) => ev.name).join(', '),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

const showAssignModal = ref(false);
const selectedClass = ref<ClassRow | null>(null);

function asClassRow(row: unknown): ClassRow {
  return row as ClassRow;
}

function progressCountClass(progress: number): string {
  if (progress >= 100) return 'text-yukon-green';
  if (progress <= 0) return 'text-yukon-red';
  return 'text-yukon-navy';
}

function progressBarVariant(progress: number): 'default' | 'green' | 'red' {
  if (progress >= 100) return 'green';
  if (progress <= 0) return 'red';
  return 'default';
}

const filteredClasses = computed(() => {
  if (selectedSchoolId.value === null) return classes.value;
  return classes.value.filter((c) => c.school.id === selectedSchoolId.value);
});

const schoolOptions = computed(() => [
  { value: null, label: 'All Schools' },
  ...schools.value.map((school) => ({ value: school.id, label: school.name })),
]);

function openAssignModal(cls: ClassRow) {
  selectedClass.value = cls;
  showAssignModal.value = true;
}

async function onAssignmentSaved() {
  showAssignModal.value = false;
  await fetchData();
}

async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    const params: Record<string, string> = {};
    if (selectedSchoolId.value) {
      params.schoolId = String(selectedSchoolId.value);
    }
    const response = await api.get<ManagementResponse>('/coordinator/assignments/management', params);
    stats.value = response.stats ?? stats.value;
    evaluatorWorkload.value = response.evaluatorWorkload ?? [];
    schools.value = response.schools ?? [];
    classes.value = response.classes ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchData);
</script>
