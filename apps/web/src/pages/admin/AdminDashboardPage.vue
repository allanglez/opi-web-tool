<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <!-- Loading State -->
    <LoadingState v-if="isLoading" />

    <!-- Error State -->
    <ErrorState v-else-if="error" :message="error" @retry="fetchDashboard" />

    <template v-else>
      <!-- System Overview -->
      <BaseCard class="mt-8 mb-8">
        <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wide mb-4">System Overview</h2>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard :value="stats.systemOverview.totalStudents" label="Total Students" variant="default" />
          <StatCard :value="stats.systemOverview.completed" label="Completed" variant="green" />
          <StatCard :value="stats.systemOverview.inProgress" label="In Progress" variant="yellow" />
          <StatCard :value="stats.systemOverview.notStarted" label="Not Started" variant="red" />
        </div>
        <ProgressBar :percentage="stats.systemOverview.overallProgress" label="Overall Progress" variant="green" />
      </BaseCard>

      <!-- Two Column Section -->
      <div class="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-6 mb-8">
        <!-- Schools by Completion Rate -->
        <BaseCard class="flex flex-col lg:min-h-[38rem] lg:max-h-[38rem]">
          <h3 class="text-lg font-bold text-neutral-900 uppercase tracking-wide mb-4">Schools by Completion Rate</h3>
          <div class="space-y-4 lg:max-h-[30rem] lg:overflow-y-auto lg:pr-1">
            <div v-for="school in stats.schoolsCompletion" :key="school.name" class="border border-neutral-200 rounded p-3">
              <div class="flex justify-between items-center mb-1">
                <div>
                  <div class="font-semibold text-neutral-900">{{ school.name }}</div>
                  <div class="text-xs text-neutral-500">{{ school.stats }}</div>
                </div>
                <div class="text-sm font-semibold text-neutral-900">{{ school.completion }}%</div>
              </div>
              <ProgressBar 
                :percentage="school.completion" 
                :show-label="false"
                :variant="getProgressVariant(school.completion)"
              />
            </div>
            <EmptyState v-if="stats.schoolsCompletion.length === 0" title="No schools" message="No schools with students found in the active cycle." />
          </div>
        </BaseCard>

        <!-- Evaluator Workload -->
        <BaseCard class="flex flex-col lg:min-h-[38rem] lg:max-h-[38rem]">
          <h3 class="text-lg font-bold text-neutral-900 uppercase tracking-wide mb-4">Evaluator Workload</h3>
          <div class="space-y-4 lg:max-h-[30rem] lg:overflow-y-auto lg:pr-1">
            <div v-for="evaluator in stats.evaluatorWorkload" :key="evaluator.name" class="border border-neutral-200 rounded p-3">
              <div class="flex justify-between items-center mb-1">
                <div class="font-semibold text-neutral-900">{{ evaluator.name }}</div>
                <div class="text-sm font-semibold text-neutral-900">{{ evaluator.completed }}/{{ evaluator.total }}</div>
              </div>
              <ProgressBar
                :percentage="evaluator.total > 0 ? Math.round((evaluator.completed / evaluator.total) * 100) : 0"
                :show-label="false"
                :variant="getProgressVariant(evaluator.total > 0 ? Math.round((evaluator.completed / evaluator.total) * 100) : 0)"
              />
            </div>
            <EmptyState v-if="stats.evaluatorWorkload.length === 0" title="No evaluators" message="No evaluators with assignments found in the active cycle." />
          </div>
        </BaseCard>
      </div>

      <!-- Recent Activity -->
      <BaseCard>
        <h3 class="text-lg font-bold text-neutral-900 uppercase tracking-wide mb-4">Recent Activity</h3>
        <div class="space-y-0">
          <div 
            v-for="activity in stats.recentActivity" 
            :key="activity.id"
            class="flex justify-between items-center py-3 border-b border-neutral-100 last:border-0"
          >
            <div class="flex-1">
              <span class="font-medium text-neutral-900">{{ activity.name }}</span>
              <span class="text-neutral-500"> - {{ activity.school }}</span>
            </div>
            <div class="text-sm text-neutral-500 font-mono">{{ activity.timestamp }}</div>
          </div>
          <EmptyState v-if="stats.recentActivity.length === 0" title="No activity" message="No recent assessment activity found." />
        </div>
      </BaseCard>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';
import LoadingState from '../../components/ui/LoadingState.vue';
import ErrorState from '../../components/ui/ErrorState.vue';
import EmptyState from '../../components/ui/EmptyState.vue';

const authStore = useAuthStore();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

interface DashboardStats {
  systemOverview: {
    totalStudents: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overallProgress: number;
  };
  schoolsCompletion: Array<{
    name: string;
    stats: string;
    completion: number;
  }>;
  evaluatorWorkload: Array<{
    name: string;
    completed: number;
    total: number;
  }>;
  recentActivity: Array<{
    id: number;
    name: string;
    school: string;
    timestamp: string;
  }>;
}

const isLoading = ref(false);
const error = ref<string | null>(null);
const stats = ref<DashboardStats>({
  systemOverview: { totalStudents: 0, completed: 0, inProgress: 0, notStarted: 0, overallProgress: 0 },
  schoolsCompletion: [],
  evaluatorWorkload: [],
  recentActivity: [],
});

async function fetchDashboard() {
  isLoading.value = true;
  error.value = null;
  try {
    stats.value = await api.get<DashboardStats>('/admin/dashboard/stats');
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
  } finally {
    isLoading.value = false;
  }
}

const getProgressVariant = (percentage: number): 'green' | 'yellow' | 'red' => {
  if (percentage >= 75) return 'green';
  if (percentage >= 25) return 'yellow';
  return 'red';
};

onMounted(fetchDashboard);
</script>
