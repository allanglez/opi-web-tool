<template>
  <AppShell :user="currentUser">
    <!-- Page Title -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Evaluator Dashboard</h1>
      <p class="text-neutral-600">View your assigned classes and assessment progress.</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">{{ error }}</p>
      <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchClasses">Retry</button>
    </div>

    <template v-else>
      <!-- Cycle Info -->
      <section v-if="cycleInfo" class="mb-6">
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p class="text-sm text-blue-800">
            <span class="font-semibold">Active Cycle:</span> {{ cycleInfo.name }}
          </p>
        </div>
      </section>

      <!-- Stats Overview -->
      <section class="mb-8">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard :value="classes.length" label="Total Classes" variant="default" />
          <StatCard :value="totalStudents" label="Total Students" variant="default" />
          <StatCard :value="completedStudents" label="Completed" variant="green" />
          <StatCard :value="inProgressStudents" label="In Progress" variant="yellow" />
        </div>
      </section>

      <!-- No Classes -->
      <div v-if="classes.length === 0" class="text-center py-12">
        <p class="text-neutral-500 text-lg">You have no assigned classes.</p>
        <p class="text-neutral-400 text-sm mt-2">Contact your coordinator to get assigned to classes.</p>
      </div>

      <!-- Assigned Classes -->
      <section v-else>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <router-link 
            v-for="cls in classes" 
            :key="cls.id"
            :to="`/evaluator/classes/${cls.id}`"
            class="block"
          >
            <BaseCard class="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <div class="flex flex-col h-full">
                <div class="flex justify-between items-start mb-3">
                  <div>
                    <h3 class="text-lg font-semibold text-neutral-900">{{ cls.classCode }}</h3>
                    <p class="text-sm text-neutral-600">{{ cls.school?.name }}</p>
                  </div>
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    :class="getStatusClass(cls)"
                  >
                    {{ getStatusLabel(cls) }}
                  </span>
                </div>
                
                <div class="text-sm text-neutral-600 mb-4">
                  <p v-if="cls.teacher">Teacher: {{ cls.teacher }}</p>
                  <p v-if="cls.grade">Grade: {{ cls.grade }}</p>
                  <p v-if="cls.program?.name">Program: {{ cls.program.name }}</p>
                </div>

                <div class="mt-auto">
                  <div class="flex justify-between text-sm mb-2">
                    <span class="text-neutral-600">Progress</span>
                    <span class="font-medium text-neutral-900">
                      {{ cls.completed }}/{{ cls.totalStudents }} students
                    </span>
                  </div>
                  <ProgressBar 
                    :percentage="getProgressPercentage(cls)" 
                    :show-label="false"
                    :variant="getProgressVariant(cls)"
                  />
                </div>
              </div>
            </BaseCard>
          </router-link>
        </div>
      </section>
    </template>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';

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

interface ClassWithProgress {
  id: number;
  classCode: string;
  grade?: string;
  teacher?: string;
  school?: { name: string };
  program?: { name: string };
  totalStudents: number;
  notStarted: number;
  inProgress: number;
  completed: number;
}

const cycleInfo = ref<{ id: number; name: string } | null>(null);
const classes = ref<ClassWithProgress[]>([]);
let pollingInterval: ReturnType<typeof setInterval> | null = null;

// Computed
const totalStudents = computed(() => classes.value.reduce((sum, c) => sum + c.totalStudents, 0));
const completedStudents = computed(() => classes.value.reduce((sum, c) => sum + c.completed, 0));
const inProgressStudents = computed(() => classes.value.reduce((sum, c) => sum + c.inProgress, 0));

function getProgressPercentage(cls: ClassWithProgress): number {
  if (cls.totalStudents === 0) return 0;
  return Math.round((cls.completed / cls.totalStudents) * 100);
}

function getProgressVariant(cls: ClassWithProgress): 'green' | 'yellow' | 'red' {
  const percentage = getProgressPercentage(cls);
  if (percentage >= 75) return 'green';
  if (percentage >= 25) return 'yellow';
  return 'red';
}

function getStatusClass(cls: ClassWithProgress): string {
  if (cls.completed === cls.totalStudents && cls.totalStudents > 0) {
    return 'bg-green-100 text-green-800';
  }
  if (cls.inProgress > 0 || cls.completed > 0) {
    return 'bg-yellow-100 text-yellow-800';
  }
  return 'bg-neutral-100 text-neutral-600';
}

function getStatusLabel(cls: ClassWithProgress): string {
  if (cls.completed === cls.totalStudents && cls.totalStudents > 0) return 'Complete';
  if (cls.inProgress > 0 || cls.completed > 0) return 'In Progress';
  return 'Not Started';
}

// API calls
async function fetchClasses() {
  try {
    const token = authStore.token;
    const headers = { 'Authorization': `Bearer ${token}` };

    const res = await fetch(`${API_BASE}/evaluator/classes`, { headers });
    
    if (res.status === 403) {
      const err = await res.json();
      if (err.error === 'CYCLE_NOT_APPROVED') {
        window.location.href = '/cycle-not-approved';
        return;
      }
    }

    if (!res.ok) throw new Error('Failed to fetch classes');

    const data = await res.json();
    cycleInfo.value = data.cycle;
    classes.value = data.classes;
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

function startPolling() {
  // Poll every 15 seconds
  pollingInterval = setInterval(fetchClasses, 15000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

onMounted(() => {
  fetchClasses();
  startPolling();
});

onUnmounted(() => {
  stopPolling();
});
</script>
