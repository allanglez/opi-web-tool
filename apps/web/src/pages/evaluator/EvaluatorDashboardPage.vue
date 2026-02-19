<template>
  <AppShell :user="currentUser">
    <section class="pb-5 pt-1 md:pt-2">
      <h1 class="text-[2rem] md:text-[2.2rem] font-bold text-neutral-900 leading-tight">Evaluator Dashboard</h1>
      <p class="mt-1 text-sm text-neutral-600">Track your OPI assessment progress and upcoming sessions</p>
    </section>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 mt-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchDashboard">Retry</button>
    </div>

    <template v-else>
      <!-- MY ASSIGNMENTS Stats -->
      <section class="mb-6">
        <BaseCard class="border border-neutral-300 shadow-none">
          <h2 class="text-3xl font-bold text-neutral-900 mb-5">My Assignments</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <StatCard :value="dashboard.stats.totalStudents" label="Total Students" variant="default" />
            <StatCard :value="dashboard.stats.completed" label="Completed" variant="green" />
            <StatCard :value="dashboard.stats.inProgress" label="In Progress" variant="yellow" />
            <StatCard :value="dashboard.stats.notStarted" label="Not Started" variant="red" />
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span class="font-medium text-neutral-700 uppercase tracking-wider text-xs">My Progress</span>
              <span class="text-neutral-600 text-xs">{{ dashboard.stats.progressPercent }}%</span>
            </div>
            <ProgressBar
              :percentage="dashboard.stats.progressPercent"
              :show-label="false"
              variant="green"
            />
          </div>
        </BaseCard>
      </section>

      <!-- MY SCHOOLS + NEXT STUDENTS -->
      <section class="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-6 mb-6">
        <!-- My Schools -->
        <BaseCard class="border border-neutral-300 shadow-none flex flex-col lg:min-h-[38rem] lg:max-h-[38rem]">
          <h2 class="text-3xl font-bold text-neutral-900 mb-4">My Schools</h2>
          <div v-if="dashboard.schools.length === 0" class="text-neutral-500 text-sm py-4 text-center">
            No schools assigned.
          </div>
          <div v-else class="space-y-4 lg:max-h-[30rem] lg:overflow-y-auto lg:pr-1">
            <div
              v-for="school in dashboard.schools"
              :key="school.id"
              class="border border-neutral-200 rounded-lg p-4"
            >
              <h3 class="font-semibold text-neutral-900">{{ school.name }}</h3>
              <p class="text-sm text-neutral-600">
                {{ school.studentCount }} students | {{ school.schoolType || 'School' }}
              </p>
              <p class="text-sm text-neutral-600">Progress: {{ school.progress }}%</p>
              <p v-if="school.assessmentDates.length > 0" class="text-xs text-yellow-700 mt-1">
                Assessment dates: {{ school.assessmentDates.join(', ') }}
              </p>
              <router-link
                :to="{ name: 'evaluator-assignments', query: { schoolId: school.id } }"
                class="mt-3 inline-flex w-full items-center justify-center text-xs font-semibold uppercase tracking-wider border border-yukon-teal text-yukon-navy rounded px-3 py-1.5 hover:bg-cyan-50"
              >
                View Students
              </router-link>
            </div>
          </div>
        </BaseCard>

        <!-- Next Students to Assess -->
        <BaseCard class="border border-neutral-300 shadow-none flex flex-col lg:min-h-[38rem] lg:max-h-[38rem]">
          <h2 class="text-3xl font-bold text-neutral-900 mb-4">Next Students to Assess</h2>
          <div v-if="dashboard.nextStudents.length === 0" class="text-neutral-500 text-sm py-4 text-center">
            All students assessed!
          </div>
          <div v-else class="space-y-3 lg:max-h-[30rem] lg:overflow-y-auto lg:pr-1">
            <div
              v-for="student in dashboard.nextStudents"
              :key="student.studentId"
              class="border border-neutral-200 rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <p class="font-semibold text-neutral-900">{{ student.firstName }} {{ student.lastName }}</p>
                <p class="text-sm text-neutral-600">
                  Grade {{ student.grade }} | {{ student.schoolName }}
                </p>
                <p class="text-xs text-neutral-500">
                  Program: {{ student.programName || 'N/A' }} | Teacher: {{ student.teacherName || 'N/A' }}
                </p>
                <span
                  class="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full"
                  :class="student.status === 'IN_PROGRESS'
                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                    : 'bg-red-100 text-red-800 border border-red-300'"
                >
                  {{ student.status.replace('_', ' ') }}
                </span>
              </div>
              <button
                class="text-xs font-semibold uppercase tracking-wider border border-yukon-teal text-yukon-navy rounded px-3 py-1.5 hover:bg-cyan-50 whitespace-nowrap"
                @click="handleStudentAction(student)"
              >
                {{ student.status === 'IN_PROGRESS' ? 'Continue' : 'Start Assessment' }}
              </button>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- RECENT ASSESSMENTS -->
      <section class="mb-6">
        <BaseCard class="border border-neutral-300 shadow-none">
          <h2 class="text-3xl font-bold text-neutral-900 mb-4">Recent Assessments</h2>
          <div class="border border-neutral-200 rounded-lg overflow-hidden">
            <div v-if="dashboard.recentAssessments.length === 0" class="px-4 py-8 text-neutral-500 text-sm text-center bg-white">
              No completed assessments yet.
            </div>
            <div v-else>
              <div
                v-for="ra in dashboard.recentAssessments"
                :key="ra.id"
                class="flex justify-between items-center px-4 py-3 border-b border-neutral-200 last:border-b-0 bg-white"
              >
                <span class="text-sm font-semibold text-neutral-900">
                  {{ ra.studentName }} - Grade {{ ra.grade }}
                </span>
                <span class="text-xs text-neutral-600">
                  Score: {{ ra.score ?? '-' }} | {{ formatDate(ra.completedAt) }}
                </span>
              </div>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- QUICK LINKS -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <router-link :to="{ name: 'evaluator-assignments' }" class="block">
          <BaseCard class="border border-yukon-teal shadow-none hover:bg-cyan-50 transition-colors cursor-pointer">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-neutral-900 uppercase tracking-wider">View All Assignments</h3>
                <p class="text-sm text-neutral-600 mt-1">Complete assessments by school</p>
              </div>
              <ChevronRight class="w-5 h-5 text-yukon-navy" />
            </div>
          </BaseCard>
        </router-link>
        <router-link :to="{ name: 'evaluator-class-view' }" class="block">
          <BaseCard class="border border-yukon-teal shadow-none hover:bg-cyan-50 transition-colors cursor-pointer">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-neutral-900 uppercase tracking-wider inline-flex items-center gap-2">
                  <Lock class="w-4 h-4" />
                  Manage Audio Files
                </h3>
                <p class="text-sm text-neutral-600 mt-1">Upload and organize recordings</p>
              </div>
              <ChevronRight class="w-5 h-5 text-yukon-navy" />
            </div>
          </BaseCard>
        </router-link>
      </section>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { ChevronRight, Lock } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';

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

interface DashboardData {
  cycle: { id: number; name: string };
  stats: {
    totalStudents: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    progressPercent: number;
  };
  schools: {
    id: number;
    name: string;
    schoolType: string | null;
    studentCount: number;
    progress: number;
    assessmentDates: string[];
  }[];
  nextStudents: {
    studentId: number;
    firstName: string;
    lastName: string;
    grade: number | null;
    schoolName: string;
    programName: string | null;
    teacherName: string | null;
    classId: number;
    classCode: string;
    status: string;
    assessmentId: number | null;
  }[];
  recentAssessments: {
    id: number;
    studentName: string;
    grade: number | null;
    score: number | null;
    completedAt: string | null;
  }[];
}

const dashboard = ref<DashboardData>({
  cycle: { id: 0, name: '' },
  stats: { totalStudents: 0, completed: 0, inProgress: 0, notStarted: 0, progressPercent: 0 },
  schools: [],
  nextStudents: [],
  recentAssessments: [],
});

let pollingInterval: ReturnType<typeof setInterval> | null = null;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

async function handleStudentAction(student: DashboardData['nextStudents'][0]) {
  if (student.assessmentId) {
    router.push(`/evaluator/assessments/${student.assessmentId}`);
    return;
  }

  // Start new assessment
  try {
    const res = await fetch(`${API_BASE}/assessments/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        studentId: student.studentId,
        cycleId: dashboard.value.cycle.id,
      }),
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

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}

async function fetchDashboard() {
  try {
    const res = await fetch(`${API_BASE}/evaluator/dashboard`, {
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

    if (!res.ok) throw new Error('Failed to fetch dashboard');

    dashboard.value = await res.json();
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

function startPolling() {
  pollingInterval = setInterval(fetchDashboard, 15000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

onMounted(() => {
  fetchDashboard();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>
