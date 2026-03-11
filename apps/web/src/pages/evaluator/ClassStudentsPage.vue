<template>
  <AppShell :user="currentUser">
    <component :is="subNavComponent" />

    <!-- Back Navigation -->
    <div class="mb-4 mt-4">
      <router-link :to="classViewRoute" class="text-neutral-600 hover:text-neutral-800 text-sm flex items-center">
        <ChevronLeft class="w-4 h-4 mr-1" />
        Back to Class View
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchStudents">Retry</button>
    </div>

    <template v-else>
      <!-- Class Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-neutral-900 mb-2">{{ classInfo?.classCode }}</h1>
        <p class="text-neutral-600">{{ classInfo?.school?.name }}</p>
        <div class="flex gap-4 mt-2 text-sm text-neutral-600">
          <span v-if="classInfo?.teacher">Teacher: {{ classInfo.teacher }}</span>
          <span v-if="classInfo?.grade">Grade: {{ classInfo.grade }}</span>
          <span v-if="classInfo?.program?.name">{{ classInfo.program.name }}</span>
        </div>
      </div>

      <!-- Stats -->
      <section class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard :value="students.length" label="Total Students" variant="default" />
          <StatCard :value="completedCount" label="Completed" variant="green" />
          <StatCard :value="inProgressCount" label="In Progress" variant="yellow" />
          <StatCard :value="notStartedCount" label="Not Started" variant="red" />
          <StatCard :value="absentCount" label="Absent" variant="default" />
        </div>
      </section>

      <!-- Student List -->
      <section>
        <BaseCard>
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Students</h3>
          
          <div v-if="students.length === 0" class="text-center py-8 text-neutral-500">
            No students in this class.
          </div>

          <div v-else>
            <AppDataTable
              :data="students"
              :columns="studentColumns"
              search-placeholder="Search student number, name, status..."
              empty-text="No students in this class."
              :initial-page-size="10"
            >
              <template #cell-student="{ row }">
                <div class="text-sm font-medium text-neutral-900">
                  {{ asStudent(row).lastName }}, {{ asStudent(row).firstName }}
                </div>
              </template>

              <template #cell-studentNumber="{ row }">
                <span class="text-sm text-neutral-600">{{ asStudent(row).studentNumber }}</span>
              </template>

              <template #cell-status="{ row }">
                <span class="px-2 py-1 text-xs font-bold rounded" :class="getStatusClass(asStudent(row))">
                  {{ asStudent(row).assessment.status.replace('_', ' ') }}
                </span>
                <span
                  v-if="asStudent(row).isLocked"
                  class="ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded bg-orange-100 text-orange-800"
                  :title="`Locked by ${asStudent(row).assessment.evaluatorName}`"
                >
                  <Lock class="w-3 h-3" /> {{ asStudent(row).assessment.evaluatorName }}
                </span>
              </template>

              <template #cell-opiLevel="{ row }">
                <span class="text-sm text-neutral-600">{{ asStudent(row).assessment.opiLevel || '-' }}</span>
              </template>

              <template #cell-actions="{ row }">
                <button
                  v-if="asStudent(row).assessment.status !== 'COMPLETED'"
                  :disabled="asStudent(row).isLocked || startingId === asStudent(row).id"
                  class="px-3 py-1 text-sm rounded-md"
                  :class="asStudent(row).isLocked
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'"
                  @click="startAssessment(asStudent(row))"
                >
                  {{ startingId === asStudent(row).id ? 'Starting...' : (asStudent(row).assessment.status === 'NOT_STARTED' ? 'Start' : 'Continue') }}
                </button>
                <router-link
                  v-else-if="asStudent(row).assessment.id"
                  :to="{ path: `/evaluator/assessments/${asStudent(row).assessment.id}`, query: { from: 'evaluator-class-students', returnTo: route.fullPath } }"
                  class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronLeft, Lock } from 'lucide-vue-next';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import EvaluatorSubNav from '../../components/layout/EvaluatorSubNav.vue';
import CoordinatorSubNav from '../../components/layout/CoordinatorSubNav.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

// User info
const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

const routeName = computed(() => String(route.name || ''));

const routeNamespace = computed<'admin' | 'coordinator' | 'evaluator'>(() => {
  if (routeName.value.startsWith('admin-')) {
    return 'admin';
  }
  if (routeName.value.startsWith('coordinator-')) {
    return 'coordinator';
  }
  return 'evaluator';
});

const subNavComponent = computed(() => {
  if (routeNamespace.value === 'admin') {
    return AdminSubNav;
  }
  if (routeNamespace.value === 'coordinator') {
    return CoordinatorSubNav;
  }
  return EvaluatorSubNav;
});

const classViewRoute = computed(() => {
  if (routeNamespace.value === 'admin') {
    return { name: 'admin-class-view' };
  }
  if (routeNamespace.value === 'coordinator') {
    return { name: 'coordinator-class-view' };
  }
  return { name: 'evaluator-class-view' };
});

// State
const isLoading = ref(true);
const error = ref<string | null>(null);
const startingId = ref<number | null>(null);

interface StudentWithAssessment {
  id: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  grade?: string;
  assessment: {
    id: number | null;
    status: string;
    evaluatorId: number | null;
    evaluatorName: string | null;
    opiLevel: string | null;
  };
  isLocked: boolean;
}

const classInfo = ref<{
  id: number;
  classCode: string;
  grade?: string;
  teacher?: string;
  school?: { name: string };
  program?: { name: string };
} | null>(null);

const students = ref<StudentWithAssessment[]>([]);
const cycleId = ref<number | null>(null);
let pollingInterval: ReturnType<typeof setInterval> | null = null;

const studentColumns: DataTableColumn<StudentWithAssessment>[] = [
  {
    key: 'student',
    header: 'Student',
    sortable: true,
    searchable: true,
    value: (row) => `${row.lastName}, ${row.firstName}`,
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
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => row.assessment.status,
  },
  {
    key: 'opiLevel',
    header: 'OPI Level',
    sortable: true,
    searchable: true,
    value: (row) => row.assessment.opiLevel || '-',
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

function asStudent(row: unknown): StudentWithAssessment {
  return row as StudentWithAssessment;
}

// Computed
const completedCount = computed(() => 
  students.value.filter(s => s.assessment.status === 'COMPLETED').length
);
const inProgressCount = computed(() => 
  students.value.filter(s => s.assessment.status === 'IN_PROGRESS').length
);
const notStartedCount = computed(() => 
  students.value.filter(s => s.assessment.status === 'NOT_STARTED').length
);
const absentCount = computed(() => 
  students.value.filter(s => s.assessment.status === 'ABSENT').length
);

function getStatusClass(student: StudentWithAssessment): string {
  switch (student.assessment.status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800';
    case 'ABSENT':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}

// API calls
async function fetchStudents() {
  const classId = route.params.classId;
  if (!classId) return;

  try {
    const data = await api.get<{
      class: {
        id: number;
        classCode: string;
        grade?: string;
        teacher?: string;
        school?: { name: string };
        program?: { name: string };
      };
      students: StudentWithAssessment[];
    }>(`/evaluator/classes/${classId}/students`);
    classInfo.value = data.class;
    students.value = data.students;
    error.value = null;

    // Get cycle ID from active cycle
    const cycle = await api.get<{ id?: number }>('/cycles/active');
    cycleId.value = cycle?.id ?? null;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'An error occurred';
    if (message.includes('NOT_ASSIGNED')) {
      router.push('/forbidden');
      return;
    }
    if (message.includes('CYCLE_NOT_APPROVED')) {
      router.push('/cycle-not-approved');
      return;
    }
    error.value = message;
  } finally {
    isLoading.value = false;
  }
}

async function startAssessment(student: StudentWithAssessment) {
  if (!cycleId.value) return;

  startingId.value = student.id;
  try {
    const assessment = await api.post<{ id: number }>('/assessments/start', {
        studentId: student.id,
        cycleId: cycleId.value,
    });
    router.push({
      path: `/evaluator/assessments/${assessment.id}`,
      query: { from: 'evaluator-class-students', returnTo: route.fullPath },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to start assessment';
    if (message.includes('ASSESSMENT_LOCKED')) {
      alert('This student is currently being assessed by another evaluator.');
      await fetchStudents();
      return;
    }
    alert(message);
  } finally {
    startingId.value = null;
  }
}

function startPolling() {
  // Clear any existing interval
  stopPolling();
  
  // Poll every 10 seconds but with exponential backoff on errors
  let backoffMs = 10000;
  let consecutiveErrors = 0;
  
  pollingInterval = setInterval(async () => {
    try {
      await fetchStudents();
      consecutiveErrors = 0; // Reset on success
      backoffMs = 10000; // Reset to normal interval
    } catch (error) {
      consecutiveErrors++;
      console.warn('Polling error:', error);
      
      // Exponential backoff: 10s, 20s, 40s, max 60s
      backoffMs = Math.min(10000 * Math.pow(2, consecutiveErrors - 1), 60000);
      
      // If too many errors, stop polling
      if (consecutiveErrors >= 5) {
        console.error('Too many polling errors, stopping');
        stopPolling();
      }
    }
  }, backoffMs);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

onMounted(() => {
  fetchStudents();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>
