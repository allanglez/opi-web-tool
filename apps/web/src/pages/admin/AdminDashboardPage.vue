<template>
  <AppShell :user="mockUser">
    <!-- Page Title -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-neutral-900 mb-2">Administrator Dashboard</h1>
      <p class="text-neutral-600">Welcome to the administrator workspace. Here you can manage system settings, users, and access controls.</p>
    </div>

    <!-- System Overview Stats -->
    <section class="mb-8">
      <h2 class="text-xl font-semibold text-neutral-900 mb-4">System Overview</h2>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard :value="31" label="Total Students" variant="default" />
        <StatCard :value="8" label="Completed" variant="green" />
        <StatCard :value="1" label="In Progress" variant="yellow" />
        <StatCard :value="22" label="Not Started" variant="red" />
      </div>
    </section>

    <!-- Overall Progress -->
    <section class="mb-8">
      <BaseCard>
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Overall Progress</h3>
        <ProgressBar :percentage="26" label="Overall Progress" variant="green" />
      </BaseCard>
    </section>

    <!-- Two Column Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Schools by Completion Rate -->
      <BaseCard>
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Schools by Completion Rate</h3>
        <div class="space-y-4">
          <div v-for="school in schools" :key="school.name" class="border-b border-neutral-100 last:border-0 pb-3 last:pb-0">
            <div class="flex justify-between items-center mb-2">
              <div>
                <div class="font-medium text-neutral-900">{{ school.name }}</div>
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
        </div>
      </BaseCard>

      <!-- Evaluator Workload -->
      <BaseCard>
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Evaluator Workload</h3>
        <div class="space-y-4">
          <div v-for="evaluator in evaluators" :key="evaluator.name" class="border-b border-neutral-100 last:border-0 pb-3 last:pb-0">
            <div class="font-medium text-neutral-900 mb-2">{{ evaluator.name }}</div>
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div class="text-neutral-500 text-xs">Students Assigned</div>
                <div class="font-semibold text-neutral-900">{{ evaluator.assigned }}</div>
              </div>
              <div>
                <div class="text-neutral-500 text-xs">Total Classes</div>
                <div class="font-semibold text-neutral-900">{{ evaluator.classes }}</div>
              </div>
              <div>
                <div class="text-neutral-500 text-xs">Total Schools</div>
                <div class="font-semibold text-neutral-900">{{ evaluator.schools }}</div>
              </div>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Recent Activity -->
    <section>
      <BaseCard>
        <h3 class="text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h3>
        <div class="space-y-3">
          <div 
            v-for="activity in recentActivity" 
            :key="activity.id"
            class="flex justify-between items-center py-2 border-b border-neutral-100 last:border-0"
          >
            <div class="flex-1">
              <span class="font-medium text-neutral-900">{{ activity.name }}</span>
              <span class="text-neutral-600"> - {{ activity.school }}</span>
            </div>
            <div class="text-sm text-neutral-500">{{ activity.timestamp }}</div>
          </div>
        </div>
      </BaseCard>
    </section>
  </AppShell>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import AppShell from '../../components/layout/AppShell.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import ProgressBar from '../../components/ui/ProgressBar.vue';

// Mock user data
const mockUser = ref({
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@yukon.ca',
});

// Mock schools data
const schools = ref([
  { name: 'Whitehorse Elementary', stats: 'Grade K-6 | 8 classes | 120 students', completion: 100 },
  { name: 'Jack Hulland Elementary', stats: 'Grade K-6 | 6 classes | 95 students', completion: 100 },
  { name: 'Vanier Catholic Secondary', stats: 'Grade 7-12 | 14 classes | 280 students', completion: 33 },
  { name: 'F.H. Collins Secondary', stats: 'Grade 7-12 | 16 classes | 320 students', completion: 25 },
  { name: 'Porter Creek Secondary', stats: 'Grade 7-12 | 12 classes | 240 students', completion: 0 },
  { name: 'Golden Horn Elementary', stats: 'Grade K-6 | 5 classes | 75 students', completion: 0 },
  { name: 'École Émilie-Tremblay', stats: 'Grade K-12 | 8 classes | 140 students', completion: 0 },
]);

// Mock evaluators data
const evaluators = ref([
  { name: 'Marie Dubois', assigned: 5, classes: 4, schools: 2 },
  { name: 'Pierre Gagnon', assigned: 2, classes: 1, schools: 1 },
  { name: 'Sylvie Tremblay', assigned: 1, classes: 2, schools: 1 },
]);

// Mock recent activity
const recentActivity = ref([
  { id: 1, name: 'Sophie Hebert', school: 'F.H. Collins Secondary', timestamp: 'Score: 12 | 2026-01-08, 04:26:01 PM' },
  { id: 2, name: 'Marc Cormier', school: 'F.H. Collins Secondary', timestamp: 'Score: 17 | 11:45 AM' },
  { id: 3, name: 'Emma Fortin', school: 'Whitehorse Elementary', timestamp: 'Score: 10 | 02:22 PM' },
  { id: 4, name: 'Lucas Gagnon', school: 'Whitehorse Elementary', timestamp: 'Score: 15 | 02:45 PM' },
  { id: 5, name: 'Chloe Harvey', school: 'Whitehorse Elementary', timestamp: 'Score: 16 | 03:11 PM' },
  { id: 6, name: 'Thomas Lacombe', school: 'Jack Hulland Elementary', timestamp: 'Score: 18 | 08:30 AM' },
  { id: 7, name: 'Sophie Mercier', school: 'Jack Hulland Elementary', timestamp: 'Score: 17 | 10:00 AM' },
  { id: 8, name: 'Alexandre Nadeau', school: 'Vanier Catholic Secondary', timestamp: 'Score: 14 | 01:20 PM' },
]);

const getProgressVariant = (percentage: number): 'green' | 'yellow' | 'red' => {
  if (percentage >= 75) return 'green';
  if (percentage >= 25) return 'yellow';
  return 'red';
};
</script>
