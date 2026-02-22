<template>
  <AppShell :user="currentUser">
    <CoordinatorSubNav />

    <section class="pb-5 pt-1 md:pt-2">
      <h1 class="text-[2rem] md:text-[2.2rem] font-bold text-neutral-900 leading-tight">Coordinator Dashboard</h1>
      <p class="mt-1 text-sm text-neutral-600">Monitor assessment progress and manage evaluator assignments across your schools</p>
    </section>

    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
    </div>

    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchData">Retry</button>
    </div>

    <template v-else>
      <!-- Stats -->
      <section class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard :value="stats.totalSchools" label="Total Schools" variant="default" />
          <StatCard :value="stats.assignedSchools" label="Assigned" variant="green" />
          <StatCard :value="stats.unassignedSchools" label="Unassigned" variant="red" />
        </div>
      </section>

      <!-- Urgent + Evaluator Status -->
      <section class="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-6 mb-6">
        <!-- Urgent: Unassigned Schools -->
        <BaseCard class="border border-neutral-300 shadow-none flex flex-col lg:min-h-[38rem] lg:max-h-[38rem]">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-3xl font-bold text-neutral-900">Urgent: Unassigned Schools</h3>
            <RouterLink
              to="/coordinator/assignments"
              class="px-3 py-1.5 text-xs font-semibold border border-yukon-teal bg-yukon-teal text-white rounded uppercase tracking-wider hover:bg-yukon-navy"
            >
              Assign Now
            </RouterLink>
          </div>

          <div v-if="unassignedSchools.length === 0" class="text-neutral-500 text-sm py-4">
            All schools are fully assigned.
          </div>
          <div v-else class="space-y-3 lg:max-h-[30rem] lg:overflow-y-auto lg:pr-1">
            <div
              v-for="school in unassignedSchools"
              :key="school.id"
              class="rounded border border-red-300 bg-red-50 p-3"
            >
              <div class="font-semibold text-neutral-900">{{ school.name }}</div>
              <div class="text-sm text-neutral-600">
                {{ school.totalStudents }} students | {{ school.schoolType }}
              </div>
              <div v-if="school.dates.length > 0" class="text-sm text-red-600 mt-1">
                Assessment dates: {{ school.dates.join(', ') }}
              </div>
            </div>
          </div>
        </BaseCard>

        <!-- Evaluator Status -->
        <BaseCard class="border border-neutral-300 shadow-none flex flex-col lg:min-h-[38rem] lg:max-h-[38rem]">
          <h3 class="text-3xl font-bold text-neutral-900 mb-4">Evaluator Status</h3>

          <div v-if="evaluatorStatus.length === 0" class="text-neutral-500 text-sm py-4">
            No evaluators assigned yet.
          </div>
          <div v-else class="space-y-3 lg:max-h-[30rem] lg:overflow-y-auto lg:pr-1">
            <div
              v-for="ev in evaluatorStatus"
              :key="ev.id"
              class="rounded border border-neutral-200 bg-white p-3"
            >
              <div class="font-semibold text-neutral-900 mb-2">{{ ev.name }}</div>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div class="text-2xl font-bold text-yukon-navy leading-none">{{ ev.schoolCount }}</div>
                  <div class="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">Total Schools</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-yukon-navy leading-none">{{ ev.studentCount }}</div>
                  <div class="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">Total Students</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-yukon-navy leading-none">{{ ev.completedCount }}</div>
                  <div class="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">Assessed</div>
                </div>
              </div>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- Upcoming Assessment Dates -->
      <section class="mb-6">
        <BaseCard class="border border-neutral-300 shadow-none">
          <h3 class="text-3xl font-bold text-neutral-900 mb-4">Upcoming Assessment Dates</h3>

          <div v-if="upcomingDates.length === 0" class="text-neutral-500 text-sm py-4">
            No upcoming assessment dates scheduled.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="(item, idx) in upcomingDates"
              :key="idx"
              class="rounded border border-neutral-200 bg-white p-3"
            >
              <div class="font-semibold text-neutral-900">{{ item.schoolName }}</div>
              <div class="text-sm text-neutral-600">Evaluator: {{ item.evaluatorName }}</div>
              <div class="text-sm text-neutral-500 mt-1">
                Dates: {{ item.dates.join(', ') }}
              </div>
            </div>
          </div>
        </BaseCard>
      </section>

      <!-- Quick Links -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RouterLink to="/coordinator/assignments" class="block">
          <BaseCard class="border border-yukon-teal shadow-none hover:bg-cyan-50 transition-colors cursor-pointer">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-neutral-900 uppercase tracking-wider">Manage Assignments</h3>
                <p class="text-sm text-neutral-600 mt-1">Assign evaluators to schools</p>
              </div>
              <ChevronRight class="w-5 h-5 text-yukon-navy" />
            </div>
          </BaseCard>
        </RouterLink>
<!-- 
        <RouterLink to="/coordinator/reports" class="block">
          <BaseCard class="border border-yukon-teal shadow-none hover:bg-cyan-50 transition-colors cursor-pointer">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h3 class="font-bold text-neutral-900 uppercase tracking-wider">View Reports</h3>
                <p class="text-sm text-neutral-600 mt-1">Progress tracking and analytics</p>
              </div>
              <ChevronRight class="w-5 h-5 text-yukon-navy" />
            </div>
          </BaseCard>
        </RouterLink> -->
      </section>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import CoordinatorSubNav from '../../components/layout/CoordinatorSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';

const authStore = useAuthStore();

interface UnassignedSchool {
  id: number;
  name: string;
  schoolType: string;
  totalStudents: number;
  dates: string[];
}

interface EvaluatorStatus {
  id: number;
  name: string;
  schoolCount: number;
  studentCount: number;
  completedCount: number;
  progress: number;
}

interface UpcomingDate {
  schoolId: number;
  schoolName: string;
  evaluatorName: string;
  dates: string[];
}

interface DashboardResponse {
  cycle?: { id: number; name: string };
  stats?: {
    totalSchools: number;
    assignedSchools: number;
    unassignedSchools: number;
  };
  unassignedSchools?: UnassignedSchool[];
  evaluatorStatus?: EvaluatorStatus[];
  upcomingDates?: UpcomingDate[];
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
const stats = ref({ totalSchools: 0, assignedSchools: 0, unassignedSchools: 0 });
const unassignedSchools = ref<UnassignedSchool[]>([]);
const evaluatorStatus = ref<EvaluatorStatus[]>([]);
const upcomingDates = ref<UpcomingDate[]>([]);

async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.get<DashboardResponse>('/coordinator/dashboard');
    stats.value = response.stats ?? stats.value;
    unassignedSchools.value = response.unassignedSchools ?? [];
    evaluatorStatus.value = response.evaluatorStatus ?? [];
    upcomingDates.value = response.upcomingDates ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchData);
</script>
