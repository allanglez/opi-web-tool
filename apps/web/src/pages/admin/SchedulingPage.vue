<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="container mx-auto px-6 py-8">
      <div v-if="isLoading" class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900" />
      </div>

      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-red-800">{{ error }}</p>
        <button class="mt-2 text-sm text-red-600 hover:underline" @click="fetchData">Retry</button>
      </div>

      <template v-else>
        <BaseCard class="mb-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-neutral-900">Assessment Scheduling</h2>
            <button
              class="px-4 py-2 text-sm font-semibold border-2 border-neutral-900 text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider"
              @click="showBulkModal = true"
            >
              Bulk Date Assignment
            </button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard :value="stats.totalSchools" label="Total Schools" variant="default" />
            <StatCard :value="stats.readyForAssessment" label="Ready for Assessment" variant="green" />
            <StatCard :value="stats.missingDates" label="Missing Dates" variant="yellow" />
            <StatCard :value="stats.noEvaluator" label="No Evaluator" variant="red" />
          </div>
        </BaseCard>

        <BaseCard class="mb-6">
          <h3 class="text-lg font-bold text-neutral-900 mb-4">Upcoming Assessments</h3>

          <div v-if="upcomingAssessments.length === 0" class="text-center py-8 text-neutral-500">
            <div class="text-4xl mb-2">📅</div>
            <div>No upcoming assessments scheduled</div>
            <div class="text-sm text-neutral-400 mt-1">Assign dates to schools below to see them here</div>
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="(item, idx) in upcomingAssessments"
              :key="idx"
              class="border border-neutral-200 p-3"
            >
              <div class="font-semibold text-neutral-900">{{ formatDateDisplay(item.date) }}</div>
              <div class="text-sm text-neutral-600">{{ item.schoolName }}</div>
              <div class="text-xs text-neutral-500">{{ item.schoolType }}</div>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <h3 class="text-lg font-bold text-neutral-900 mb-4">School Scheduling</h3>

          <div v-if="schools.length === 0" class="text-center py-8 text-neutral-500">
            No schools found.
          </div>

          <div v-else>
            <AppDataTable
              :data="schools"
              :columns="schoolColumns"
              search-placeholder="Search school, type, or status..."
              empty-text="No schools found."
              :initial-page-size="10"
            >
              <template #cell-name="{ row }">
                <span class="text-sm font-medium text-neutral-900">{{ asSchedulingSchool(row).name }}</span>
              </template>

              <template #cell-schoolType="{ row }">
                <span class="text-sm text-neutral-700">{{ asSchedulingSchool(row).schoolType }}</span>
              </template>

              <template #cell-totalClasses="{ row }">
                <span class="text-sm text-neutral-700">{{ asSchedulingSchool(row).totalClasses }}</span>
              </template>

              <template #cell-totalStudents="{ row }">
                <span class="text-sm text-neutral-700">{{ asSchedulingSchool(row).totalStudents }}</span>
              </template>

              <template #cell-status="{ row }">
                <span
                  class="inline-flex px-2 py-1 rounded text-xs font-semibold uppercase"
                  :class="statusClass(asSchedulingSchool(row).status)"
                >
                  {{ statusLabel(asSchedulingSchool(row).status) }}
                </span>
              </template>

              <template #cell-dates="{ row }">
                <div v-if="asSchedulingSchool(row).dates.length === 0" class="text-neutral-400 italic text-xs">
                  No dates
                </div>
                <div v-else class="flex flex-wrap gap-1">
                  <span
                    v-for="d in asSchedulingSchool(row).dates"
                    :key="d.id"
                    class="inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded"
                  >
                    {{ formatDateDisplay(d.date) }}
                  </span>
                </div>
              </template>

              <template #cell-actions="{ row }">
                <button
                  class="px-3 py-1 text-xs font-semibold border border-neutral-900 text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider"
                  @click="openEditDatesModal(asSchedulingSchool(row))"
                >
                  Edit Dates
                </button>
              </template>
            </AppDataTable>
          </div>
        </BaseCard>
      </template>

      <EditDatesModal
        v-if="showEditDatesModal && selectedSchool"
        :school="selectedSchool"
        @close="showEditDatesModal = false"
        @saved="onDatesSaved"
      />

      <BulkDateAssignmentModal
        v-if="showBulkModal"
        :schools="schools"
        @close="showBulkModal = false"
        @saved="onBulkDatesSaved"
      />
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { api } from '../../utils/api';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import EditDatesModal from '../../components/coordinator/EditDatesModal.vue';
import BulkDateAssignmentModal from '../../components/coordinator/BulkDateAssignmentModal.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';
const authStore = useAuthStore();

interface SchoolDate {
  id: number;
  date: string;
}

interface SchedulingSchool {
  id: number;
  name: string;
  schoolType: string;
  totalClasses: number;
  totalStudents: number;
  status: string;
  dates: SchoolDate[];
}

interface UpcomingAssessment {
  date: string;
  schoolName: string;
  schoolType: string;
}

interface SchedulingResponse {
  cycle?: { id: number; name: string };
  stats?: {
    totalSchools: number;
    readyForAssessment: number;
    missingDates: number;
    noEvaluator: number;
  };
  upcomingAssessments?: UpcomingAssessment[];
  schools?: SchedulingSchool[];
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
const stats = ref({
  totalSchools: 0,
  readyForAssessment: 0,
  missingDates: 0,
  noEvaluator: 0,
});
const upcomingAssessments = ref<UpcomingAssessment[]>([]);
const schools = ref<SchedulingSchool[]>([]);

const schoolColumns: DataTableColumn<SchedulingSchool>[] = [
  {
    key: 'name',
    header: 'School',
    sortable: true,
    searchable: true,
    value: (row) => row.name,
  },
  {
    key: 'schoolType',
    header: 'Type',
    sortable: true,
    searchable: true,
    value: (row) => row.schoolType,
  },
  {
    key: 'totalClasses',
    header: 'Classes',
    sortable: true,
    searchable: false,
    value: (row) => row.totalClasses,
  },
  {
    key: 'totalStudents',
    header: 'Students',
    sortable: true,
    searchable: false,
    value: (row) => row.totalStudents,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => row.status,
  },
  {
    key: 'dates',
    header: 'Assessment Dates',
    sortable: true,
    searchable: true,
    value: (row) => row.dates.map((d) => d.date).join(', '),
    sortValue: (row) => row.dates[0]?.date ?? '',
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

const showEditDatesModal = ref(false);
const selectedSchool = ref<SchedulingSchool | null>(null);

function asSchedulingSchool(row: unknown): SchedulingSchool {
  return row as SchedulingSchool;
}

const showBulkModal = ref(false);

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function statusClass(status: string): string {
  switch (status) {
    case 'READY':
      return 'bg-green-100 text-green-800';
    case 'MISSING_DATES':
      return 'bg-yellow-100 text-yellow-800';
    case 'NO_EVALUATOR':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'READY':
      return 'Ready';
    case 'MISSING_DATES':
      return 'Missing Dates';
    case 'NO_EVALUATOR':
      return 'No Evaluator';
    default:
      return status;
  }
}

function openEditDatesModal(school: SchedulingSchool) {
  selectedSchool.value = school;
  showEditDatesModal.value = true;
}

async function onDatesSaved() {
  showEditDatesModal.value = false;
  await fetchData();
}

async function onBulkDatesSaved() {
  showBulkModal.value = false;
  await fetchData();
}

async function fetchData() {
  isLoading.value = true;
  error.value = null;

  try {
    const response = await api.get<SchedulingResponse>('/coordinator/scheduling');
    stats.value = response.stats ?? stats.value;
    upcomingAssessments.value = response.upcomingAssessments ?? [];
    schools.value = response.schools ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

onMounted(fetchData);
</script>
