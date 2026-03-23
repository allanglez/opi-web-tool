<template>
  <AppShell :user="currentUser">
    <EvaluatorSubNav />

    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mt-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchAssignments">Retry</button>
    </div>

    <template v-else>
      <section class="mt-6 mb-6">
        <BaseCard>
          <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider">My Student Assignments</h2>
            <div class="flex items-center gap-2 mt-2 md:mt-0">
              <label class="text-sm font-medium text-neutral-600 uppercase tracking-wider">Filter by School:</label>
              <select
                v-model="selectedSchoolId"
                class="border border-neutral-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                @change="fetchAssignments"
              >
                <option :value="null">All Schools</option>
                <option v-for="school in availableSchools" :key="school.id" :value="school.id">
                  {{ school.name }}
                </option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard :value="stats.totalStudents" label="Showing Students" variant="default" />
            <StatCard :value="stats.completed" label="Completed" variant="green" />
            <StatCard :value="stats.inProgress" label="In Progress" variant="yellow" />
            <StatCard :value="stats.absent" label="Absent" variant="purple" />
            <StatCard :value="stats.notStarted" label="Not Started" variant="red" />
          </div>
        </BaseCard>
      </section>

      <section v-if="schoolGroups.length === 0" class="text-center py-12">
        <p class="text-neutral-500 text-lg">No assignments found.</p>
      </section>

      <section v-else class="space-y-6 mb-6">
        <BaseCard v-for="group in schoolGroups" :key="group.school.id">
          <div class="flex items-start justify-between mb-2">
            <div>
              <h3 class="text-xl font-bold text-neutral-900">{{ group.school.name }}</h3>
              <p class="text-sm text-neutral-600">
                {{ group.school.schoolType || 'School' }} | {{ group.studentCount }} students | Progress: {{ group.progress }}%
              </p>
              <p v-if="group.assessmentDates.length > 0" class="text-xs text-yellow-700 mt-1">
                Assessment dates: {{ group.assessmentDates.join(', ') }}
              </p>
            </div>
            <div class="w-32">
              <ProgressBar :percentage="group.progress" :show-label="false" variant="green" />
            </div>
          </div>

          <div class="mt-4">
            <AppDataTable
              :data="group.students"
              :columns="assignmentColumns"
              search-placeholder="Search student, class, teacher..."
              empty-text="No students found for this school."
              :initial-page-size="10"
            >
              <template #cell-student="{ row }">
                <span class="text-sm font-medium text-neutral-900">
                  {{ asStudentRow(row).lastName }}, {{ asStudentRow(row).firstName }}
                </span>
              </template>

              <template #cell-classCode="{ row }">
                <span class="text-sm text-neutral-700 font-semibold">{{ asStudentRow(row).classCode }}</span>
              </template>

              <template #cell-programName="{ row }">
                <span class="text-sm text-neutral-600">{{ asStudentRow(row).programName || '-' }}</span>
              </template>

              <template #cell-teacherName="{ row }">
                <span class="text-sm text-neutral-600">{{ asStudentRow(row).teacherName || '-' }}</span>
              </template>

              <template #cell-status="{ row }">
                <span class="px-2 py-1 text-xs font-bold rounded" :class="statusClass(asStudentRow(row).status)">
                  {{ asStudentRow(row).status.replace('_', ' ') }}
                </span>
              </template>

              <template #cell-score="{ row }">
                <span v-if="asStudentRow(row).score !== null" class="border border-neutral-300 rounded px-2 py-0.5 text-sm text-neutral-600">
                  {{ asStudentRow(row).score }}
                </span>
                <span v-else class="border border-neutral-300 rounded px-2 py-0.5 text-sm text-neutral-400">
                  {{ asStudentRow(row).status === 'ABSENT' ? 'no-data' : '-' }}
                </span>
              </template>

              <template #cell-lastModifiedAt="{ row }">
                <div class="text-xs text-neutral-500">
                  <template v-if="asStudentRow(row).lastModifiedAt">
                    {{ formatDateTime(asStudentRow(row).lastModifiedAt as string) }}
                    <br />
                    <span v-if="asStudentRow(row).lastModifiedBy">by {{ asStudentRow(row).lastModifiedBy }}</span>
                  </template>
                  <template v-else>Never modified</template>
                </div>
              </template>

              <template #cell-action="{ row }">
                <button
                  v-if="asStudentRow(row).status === 'NOT_STARTED'"
                  class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-3 py-1 hover:bg-neutral-50"
                  @click="handleAction(asStudentRow(row))"
                >
                  Start
                </button>
                <button
                  v-else-if="asStudentRow(row).status === 'IN_PROGRESS'"
                  class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-3 py-1 hover:bg-neutral-50"
                  @click="handleAction(asStudentRow(row))"
                >
                  Continue
                </button>
                <router-link
                  v-else-if="asStudentRow(row).assessmentId"
                  :to="{ path: `/evaluator/assessments/${asStudentRow(row).assessmentId}`, query: { from: 'evaluator-assignments', returnTo: route.fullPath } }"
                  class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-3 py-1 hover:bg-neutral-50"
                >
                  View
                </router-link>
              </template>
            </AppDataTable>
          </div>
        </BaseCard>
      </section>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { useToast } from '../../composables/useToast';
import AppShell from '../../components/layout/AppShell.vue';
import EvaluatorSubNav from '../../components/layout/EvaluatorSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';
import { getEnv } from '../../utils/env';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();
const API_BASE = getEnv('VITE_API_URL') || 'http://localhost:3000/api/v1';

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

const isLoading = ref(true);
const error = ref<string | null>(null);
const selectedSchoolId = ref<number | null>(null);

interface StudentRow {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string;
  grade: number | null;
  classCode: string;
  classId: number;
  programName: string | null;
  teacherName: string | null;
  status: string;
  score: number | null;
  assessmentId: number | null;
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
}

interface SchoolGroup {
  school: { id: number; name: string; schoolType: string | null };
  assessmentDates: string[];
  studentCount: number;
  progress: number;
  students: StudentRow[];
}

const stats = ref({ totalStudents: 0, completed: 0, inProgress: 0, absent: 0, notStarted: 0 });
const availableSchools = ref<{ id: number; name: string }[]>([]);
const schoolGroups = ref<SchoolGroup[]>([]);
const cycleId = ref<number | null>(null);

const assignmentColumns: DataTableColumn<StudentRow>[] = [
  {
    key: 'student',
    header: 'Student',
    sortable: true,
    searchable: true,
    value: (row) => `${row.lastName}, ${row.firstName}`,
    sortValue: (row) => `${row.lastName} ${row.firstName}`,
  },
  {
    key: 'classCode',
    header: 'Class',
    sortable: true,
    searchable: true,
    value: (row) => row.classCode,
  },
  {
    key: 'programName',
    header: 'Program',
    sortable: true,
    searchable: true,
    value: (row) => row.programName || '-',
  },
  {
    key: 'teacherName',
    header: 'Teacher',
    sortable: true,
    searchable: true,
    value: (row) => row.teacherName || '-',
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => row.status,
  },
  {
    key: 'score',
    header: 'Score',
    sortable: true,
    searchable: false,
    value: (row) => row.score ?? (row.status === 'ABSENT' ? 'no-data' : '-'),
    sortValue: (row) => row.score ?? -1,
  },
  {
    key: 'lastModifiedAt',
    header: 'Last Modified',
    sortable: true,
    searchable: false,
    value: (row) => row.lastModifiedAt || '',
  },
  {
    key: 'action',
    header: 'Action',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

function asStudentRow(row: unknown): StudentRow {
  return row as StudentRow;
}

function statusClass(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
    case 'ABSENT': return 'bg-purple-100 text-purple-800';
    case 'NOT_STARTED': return 'bg-red-100 text-red-800';
    default: return 'bg-neutral-100 text-neutral-600';
  }
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
  const h = hours % 12 || 12;
  return `${month}-${day}, ${h}:${minutes} ${ampm}`;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await authStore.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}

async function handleAction(student: StudentRow) {
  if (student.assessmentId) {
    router.push({
      path: `/evaluator/assessments/${student.assessmentId}`,
      query: { from: 'evaluator-assignments', returnTo: route.fullPath },
    });
    return;
  }
  if (!cycleId.value) return;

  try {
    const res = await fetch(`${API_BASE}/assessments/start`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ studentId: student.id, cycleId: cycleId.value }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.message || 'Failed to start assessment');
      return;
    }

    const assessment = await res.json();
    router.push({
      path: `/evaluator/assessments/${assessment.id}`,
      query: { from: 'evaluator-assignments', returnTo: route.fullPath },
    });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'Failed to start assessment');
  }
}

async function fetchAssignments() {
  try {
    let url = `${API_BASE}/evaluator/assignments`;
    if (selectedSchoolId.value) {
      url += `?schoolId=${selectedSchoolId.value}`;
    }

    const res = await fetch(url, {
      headers: await getAuthHeaders(),
      credentials: 'include',
    });

    if (res.status === 403) {
      const err = await res.json();
      if (err.error === 'CYCLE_NOT_APPROVED') {
        window.location.href = '/cycle-not-approved';
        return;
      }
    }

    if (!res.ok) throw new Error('Failed to fetch assignments');

    const data = await res.json();
    cycleId.value = data.cycle.id;
    stats.value = data.stats;
    availableSchools.value = data.availableSchools;
    schoolGroups.value = data.schoolGroups;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  // Check for schoolId query param from dashboard link
  if (route.query.schoolId) {
    selectedSchoolId.value = parseInt(route.query.schoolId as string, 10);
  }
  fetchAssignments();
});
</script
>