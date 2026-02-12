<template>
  <AppShell :user="currentUser">
    <!-- Back Navigation -->
    <div class="mb-4">
      <router-link to="/evaluator/dashboard" class="text-blue-600 hover:text-blue-800 text-sm flex items-center">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
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
        </div>
      </section>

      <!-- Student List -->
      <section>
        <BaseCard>
          <h3 class="text-lg font-semibold text-neutral-900 mb-4">Students</h3>
          
          <div v-if="students.length === 0" class="text-center py-8 text-neutral-500">
            No students in this class.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200">
              <thead>
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Student</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Student #</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">OPI Level</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr v-for="student in students" :key="student.id">
                  <td class="px-4 py-3 whitespace-nowrap">
                    <div class="text-sm font-medium text-neutral-900">
                      {{ student.lastName }}, {{ student.firstName }}
                    </div>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                    {{ student.studentNumber }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <span 
                      class="px-2 py-1 text-xs font-medium rounded-full"
                      :class="getStatusClass(student)"
                    >
                      {{ student.assessment.status.replace('_', ' ') }}
                    </span>
                    <!-- Lock Badge -->
                    <span 
                      v-if="student.isLocked" 
                      class="ml-2 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800"
                      :title="`Locked by ${student.assessment.evaluatorName}`"
                    >
                      🔒 {{ student.assessment.evaluatorName }}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm text-neutral-600">
                    {{ student.assessment.opiLevel || '-' }}
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap">
                    <!-- Start/Continue Assessment -->
                    <button
                      v-if="student.assessment.status !== 'COMPLETED'"
                      :disabled="student.isLocked || startingId === student.id"
                      class="px-3 py-1 text-sm rounded-md"
                      :class="student.isLocked 
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'"
                      @click="startAssessment(student)"
                    >
                      {{ startingId === student.id ? 'Starting...' : (student.assessment.status === 'NOT_STARTED' ? 'Start' : 'Continue') }}
                    </button>
                    <!-- View Completed -->
                    <router-link
                      v-else-if="student.assessment.id"
                      :to="`/evaluator/assessments/${student.assessment.id}`"
                      class="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                    >
                      View
                    </router-link>
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';

const route = useRoute();
const router = useRouter();
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

function getStatusClass(student: StudentWithAssessment): string {
  switch (student.assessment.status) {
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-neutral-100 text-neutral-600';
  }
}

// API calls
async function fetchStudents() {
  const classId = route.params.classId;
  if (!classId) return;

  try {
    const token = authStore.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    const res = await fetch(`${API_BASE}/evaluator/classes/${classId}/students`, { headers });
    
    if (res.status === 403) {
      const err = await res.json();
      if (err.error === 'NOT_ASSIGNED') {
        router.push('/forbidden');
        return;
      }
      if (err.error === 'CYCLE_NOT_APPROVED') {
        router.push('/cycle-not-approved');
        return;
      }
    }

    if (!res.ok) throw new Error('Failed to fetch students');

    const data = await res.json();
    classInfo.value = data.class;
    students.value = data.students;
    error.value = null;

    // Get cycle ID from active cycle
    const cycleRes = await fetch(`${API_BASE}/cycles/active`, { headers });
    if (cycleRes.ok) {
      const cycle = await cycleRes.json();
      cycleId.value = cycle?.id;
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

async function startAssessment(student: StudentWithAssessment) {
  if (!cycleId.value) return;

  startingId.value = student.id;
  try {
    const token = authStore.token;
    const res = await fetch(`${API_BASE}/assessments/start`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        studentId: student.id,
        cycleId: cycleId.value,
      }),
    });

    if (res.status === 409) {
      const err = await res.json();
      if (err.error === 'ASSESSMENT_LOCKED') {
        alert(`This student is currently being assessed by another evaluator.`);
        await fetchStudents(); // Refresh to show updated lock status
        return;
      }
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to start assessment');
    }

    const assessment = await res.json();
    router.push(`/evaluator/assessments/${assessment.id}`);
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Failed to start assessment');
  } finally {
    startingId.value = null;
  }
}

function startPolling() {
  pollingInterval = setInterval(fetchStudents, 10000);
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
