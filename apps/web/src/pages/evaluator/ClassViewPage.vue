<template>
  <AppShell :user="currentUser">
    <EvaluatorSubNav />

    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mt-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchClassView">Retry</button>
    </div>

    <template v-else>
      <!-- Header + Filters -->
      <section class="mt-6 mb-6">
        <BaseCard>
          <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider mb-4">My Class Assignments</h2>
          <div class="flex flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-neutral-600 uppercase tracking-wider">School:</label>
              <select
                v-model="selectedSchoolId"
                class="border border-neutral-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                @change="onFilterChange"
              >
                <option :value="null">All Schools</option>
                <option v-for="school in availableSchools" :key="school.id" :value="school.id">
                  {{ school.name }}
                </option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <label class="text-sm font-medium text-neutral-600 uppercase tracking-wider">Class:</label>
              <select
                v-model="selectedClassId"
                class="border border-neutral-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
                @change="onFilterChange"
              >
                <option :value="null">All Classes</option>
                <option v-for="cls in filteredClasses" :key="cls.id" :value="cls.id">
                  {{ cls.classCode }}
                </option>
              </select>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- No Classes -->
      <section v-if="classes.length === 0" class="text-center py-12">
        <p class="text-neutral-500 text-lg">No classes found.</p>
      </section>

      <!-- Class Cards -->
      <section v-else class="space-y-6 mb-6">
        <BaseCard v-for="cls in classes" :key="cls.id">
          <!-- Class Header -->
          <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
            <div class="flex items-center gap-3 mb-2 lg:mb-0">
              <h3 class="text-xl font-bold text-neutral-900">{{ cls.classCode }}</h3>
              <span
                class="px-2 py-0.5 text-xs font-bold rounded"
                :class="classStatusStyle(cls.classStatus)"
              >
                {{ cls.classStatus.replace('_', ' ') }}
              </span>
            </div>
            <div class="text-right">
              <p class="text-2xl font-bold text-neutral-900">
                {{ cls.completed }}<span class="text-neutral-400">/{{ cls.totalStudents }}</span>
              </p>
              <p class="text-xs text-neutral-500">{{ cls.progressPercent }}% complete</p>
              <div class="w-32 mt-1">
                <ProgressBar :percentage="cls.progressPercent" :show-label="false" variant="default" />
              </div>
            </div>
          </div>

          <!-- Class Details Grid -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
            <div>
              <span class="font-semibold text-neutral-700">School:</span><br />
              <span class="text-neutral-600">{{ cls.school.name }}</span>
            </div>
            <div>
              <span class="font-semibold text-neutral-700">Teacher:</span><br />
              <span class="text-neutral-600">{{ cls.teacher || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-semibold text-neutral-700">Program:</span><br />
              <span class="text-neutral-600">{{ cls.program?.name || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-semibold text-neutral-700">Grade:</span><br />
              <span class="text-neutral-600">Grade {{ cls.grade || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-semibold text-neutral-700">Assessment Date:</span><br />
              <span class="text-neutral-600">{{ cls.assessmentDates[0] || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-semibold text-neutral-700">Students:</span><br />
              <span class="text-neutral-600">{{ cls.totalStudents }} total</span>
            </div>
          </div>

          <!-- Status Counts -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p class="text-xl font-bold text-green-800">{{ cls.completed }}</p>
              <p class="text-xs text-green-700">Completed</p>
            </div>
            <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p class="text-xl font-bold text-yellow-800">{{ cls.inProgress }}</p>
              <p class="text-xs text-yellow-700">In Progress</p>
            </div>
            <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p class="text-xl font-bold text-red-800">{{ cls.absent }}</p>
              <p class="text-xs text-red-700">Absent</p>
            </div>
            <div class="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-center">
              <p class="text-xl font-bold text-neutral-800">{{ cls.notStarted }}</p>
              <p class="text-xs text-neutral-600">Not Started</p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3 mb-4">
            <button
              class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50"
              @click="openClassNotes(cls)"
            >
              Add Class Notes
            </button>
            <button
              class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50"
              @click="toggleStudents(cls.id)"
            >
              {{ expandedClasses.has(cls.id) ? 'Hide Students' : 'Show Students' }}
            </button>
            <router-link
              :to="{ name: 'evaluator-assignments', query: { schoolId: cls.school.id } }"
              class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-4 py-2 hover:bg-neutral-50"
            >
              View in Assignments
            </router-link>
          </div>

          <!-- Last Activity -->
          <p class="text-xs text-neutral-500 text-right mb-4">
            Last activity: {{ cls.lastActivity ? formatDateTime(cls.lastActivity) : 'No activity' }}
          </p>

          <!-- Expandable Student Table -->
          <div v-if="expandedClasses.has(cls.id)" class="border-t border-neutral-200 pt-4">
            <h4 class="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">Class Students</h4>
            <AppDataTable
              :data="cls.students"
              :columns="classStudentColumns"
              search-placeholder="Search class students..."
              empty-text="No students found in this class."
              :initial-page-size="10"
            >
              <template #cell-student="{ row }">
                <span class="text-sm font-medium text-neutral-900">
                  {{ asClassStudent(row).lastName }}, {{ asClassStudent(row).firstName }}
                </span>
              </template>

              <template #cell-status="{ row }">
                <span class="px-2 py-1 text-xs font-bold rounded" :class="statusStyle(asClassStudent(row).status)">
                  {{ asClassStudent(row).status.replace('_', ' ') }}
                </span>
              </template>

              <template #cell-score="{ row }">
                <span v-if="asClassStudent(row).score !== null" class="border border-neutral-300 rounded px-2 py-0.5 text-sm text-neutral-600">
                  {{ asClassStudent(row).score }}
                </span>
                <span v-else class="border border-neutral-300 rounded px-2 py-0.5 text-sm text-neutral-400">
                  {{ asClassStudent(row).status === 'ABSENT' ? 'no-data' : '-' }}
                </span>
              </template>

              <template #cell-lastModifiedAt="{ row }">
                <span class="text-xs text-neutral-500">
                  {{ asClassStudent(row).lastModifiedAt ? formatDateTime(asClassStudent(row).lastModifiedAt as string) : 'Never' }}
                </span>
              </template>

              <template #cell-action="{ row }">
                <button
                  v-if="asClassStudent(row).status === 'NOT_STARTED'"
                  class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-3 py-1 hover:bg-neutral-50"
                  @click="handleStudentAction(asClassStudent(row), cls)"
                >
                  Start
                </button>
                <button
                  v-else-if="asClassStudent(row).status === 'IN_PROGRESS'"
                  class="text-xs font-semibold uppercase tracking-wider border border-neutral-300 rounded px-3 py-1 hover:bg-neutral-50"
                  @click="handleStudentAction(asClassStudent(row), cls)"
                >
                  Continue
                </button>
                <router-link
                  v-else-if="asClassStudent(row).assessmentId"
                  :to="`/evaluator/assessments/${asClassStudent(row).assessmentId}`"
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

    <!-- Class Notes Modal -->
    <ClassNotesModal
      v-if="notesModalClass"
      :class-info="notesModalClass"
      @close="notesModalClass = null"
    />
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import EvaluatorSubNav from '../../components/layout/EvaluatorSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';
import ClassNotesModal from '../../components/evaluator/ClassNotesModal.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

const router = useRouter();
const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

const isLoading = ref(true);
const error = ref<string | null>(null);
const selectedSchoolId = ref<number | null>(null);
const selectedClassId = ref<number | null>(null);
const expandedClasses = ref<Set<number>>(new Set());

interface ClassStudent {
  id: number;
  firstName: string;
  lastName: string;
  studentNumber: string;
  status: string;
  score: number | null;
  assessmentId: number | null;
  lastModifiedAt: string | null;
}

interface ClassDetail {
  id: number;
  classCode: string;
  grade: number | null;
  school: { id: number; name: string };
  program: { id: number; name: string } | null;
  teacher: string | null;
  assessmentDates: string[];
  totalStudents: number;
  completed: number;
  inProgress: number;
  absent: number;
  notStarted: number;
  progressPercent: number;
  classStatus: string;
  lastActivity: string | null;
  students: ClassStudent[];
}

const availableSchools = ref<{ id: number; name: string }[]>([]);
const allAvailableClasses = ref<{ id: number; classCode: string; schoolId: number }[]>([]);
const classes = ref<ClassDetail[]>([]);
const cycleId = ref<number | null>(null);
const notesModalClass = ref<ClassDetail | null>(null);

const classStudentColumns: DataTableColumn<ClassStudent>[] = [
  {
    key: 'student',
    header: 'Student',
    sortable: true,
    searchable: true,
    value: (row) => `${row.lastName}, ${row.firstName}`,
    sortValue: (row) => `${row.lastName} ${row.firstName}`,
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

function asClassStudent(row: unknown): ClassStudent {
  return row as ClassStudent;
}

const filteredClasses = computed(() => {
  if (!selectedSchoolId.value) return allAvailableClasses.value;
  return allAvailableClasses.value.filter((c) => c.schoolId === selectedSchoolId.value);
});

function classStatusStyle(status: string): string {
  switch (status) {
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-red-100 text-red-800';
  }
}

function statusStyle(status: string): string {
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

function toggleStudents(classId: number) {
  if (expandedClasses.value.has(classId)) {
    expandedClasses.value.delete(classId);
  } else {
    expandedClasses.value.add(classId);
  }
  // Force reactivity
  expandedClasses.value = new Set(expandedClasses.value);
}

function openClassNotes(cls: ClassDetail) {
  notesModalClass.value = cls;
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}

async function handleStudentAction(student: ClassStudent, _cls: ClassDetail) {
  if (student.assessmentId) {
    router.push(`/evaluator/assessments/${student.assessmentId}`);
    return;
  }
  if (!cycleId.value) return;

  try {
    const res = await fetch(`${API_BASE}/assessments/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ studentId: student.id, cycleId: cycleId.value }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.message || 'Failed to start assessment');
      return;
    }

    const assessment = await res.json();
    router.push(`/evaluator/assessments/${assessment.id}`);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to start assessment');
  }
}

function onFilterChange() {
  // Reset class filter when school changes
  if (selectedSchoolId.value) {
    const validClassIds = filteredClasses.value.map((c) => c.id);
    if (selectedClassId.value && !validClassIds.includes(selectedClassId.value)) {
      selectedClassId.value = null;
    }
  }
  fetchClassView();
}

async function fetchClassView() {
  try {
    const params = new URLSearchParams();
    if (selectedSchoolId.value) params.set('schoolId', String(selectedSchoolId.value));
    if (selectedClassId.value) params.set('classId', String(selectedClassId.value));

    const url = `${API_BASE}/evaluator/class-view${params.toString() ? '?' + params.toString() : ''}`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });

    if (res.status === 403) {
      const err = await res.json();
      if (err.error === 'CYCLE_NOT_APPROVED') {
        window.location.href = '/cycle-not-approved';
        return;
      }
    }

    if (!res.ok) throw new Error('Failed to fetch class view');

    const data = await res.json();
    cycleId.value = data.cycle.id;
    availableSchools.value = data.availableSchools;
    allAvailableClasses.value = data.availableClasses;
    classes.value = data.classes;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchClassView();
});
</script>
