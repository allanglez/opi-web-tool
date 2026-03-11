<template>
  <div class="class-summary-page">
    <div class="page-header">
      <h1 class="text-2xl font-bold">Class Summary</h1>
      <button
        v-if="canSubmit && !isSubmitted"
        class="btn btn-primary"
        :disabled="loading"
        @click="showSubmitModal = true"
      >
        Submit Class
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading class summary...</p>
    </div>

    <!-- Error State -->
    <div v-if="error" class="error-message">
      <p>{{ error }}</p>
      <button class="btn btn-secondary" @click="loadSummary">Retry</button>
    </div>

    <!-- Summary Content -->
    <div v-if="!loading && !error && summary" class="summary-content">
      <!-- Class Information -->
      <div class="class-info card">
        <h2 class="text-xl font-semibold mb-4">Class Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="label">Class Code:</span>
            <span class="value">{{ summary.class.classCode }}</span>
          </div>
          <div class="info-item">
            <span class="label">Course Title:</span>
            <span class="value">{{ summary.class.courseTitle || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Grade:</span>
            <span class="value">{{ summary.class.grade || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <span class="label">School:</span>
            <span class="value">{{ summary.class.school?.name || 'N/A' }}</span>
          </div>
        </div>
      </div>

      <!-- Completion Statistics -->
      <div class="completion-stats card">
        <h2 class="text-xl font-semibold mb-4">Completion Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ summary.completionStats.totalStudents }}</div>
            <div class="stat-label">Total Students</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ summary.completionStats.completedAssessments }}</div>
            <div class="stat-label">Completed Assessments</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ completionPercentage }}%</div>
            <div class="stat-label">Completion Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ averageScore }}</div>
            <div class="stat-label">Average OPI Level</div>
          </div>
        </div>
      </div>

      <!-- Score Distribution Chart -->
      <div class="score-distribution card">
        <h2 class="text-xl font-semibold mb-4">OPI Level Distribution</h2>
        <div class="chart-container">
          <canvas ref="chartCanvas"></canvas>
        </div>
        <div class="distribution-legend">
          <div
            v-for="(count, level) in summary.scoreDistribution.levels"
            :key="level"
            class="legend-item"
          >
            <span class="legend-color" :style="{ backgroundColor: getColorForLevel(String(level)) }"></span>
            <span class="legend-label">{{ level }}: {{ count }} students</span>
          </div>
        </div>
      </div>

      <!-- Student List -->
      <div class="student-list card">
        <h2 class="text-xl font-semibold mb-4">Student Assessment Status</h2>
        <AppDataTable
          :data="studentList"
          :columns="studentColumns"
          search-placeholder="Search student, number, status..."
          empty-text="No students found."
          :initial-page-size="10"
        >
          <template #cell-name="{ row }">
            <span class="text-sm text-neutral-900">{{ asStudentItem(row).name }}</span>
          </template>

          <template #cell-studentNumber="{ row }">
            <span class="text-sm text-neutral-700">{{ asStudentItem(row).studentNumber }}</span>
          </template>

          <template #cell-status="{ row }">
            <span :class="['status-badge', `status-${asStudentItem(row).status.toLowerCase()}`]">
              {{ asStudentItem(row).status }}
            </span>
          </template>

          <template #cell-opiLevel="{ row }">
            <span class="text-sm text-neutral-700">{{ asStudentItem(row).opiLevel || '-' }}</span>
          </template>

          <template #cell-hasAudio="{ row }">
            <span v-if="asStudentItem(row).hasAudio" class="text-green-600">Yes</span>
            <span v-else class="text-red-600">No</span>
          </template>

          <template #cell-actions="{ row }">
            <button
              class="btn btn-sm btn-secondary"
              @click="viewAssessment(asStudentItem(row).assessmentId)"
            >
              View
            </button>
          </template>
        </AppDataTable>
      </div>

      <!-- Export Options -->
      <div class="export-options card">
        <h2 class="text-xl font-semibold mb-4">Export Options</h2>
        <div class="export-buttons">
          <button class="btn btn-secondary" :disabled="exporting" @click="exportToCSV">
            <span v-if="!exporting">Export to CSV</span>
            <span v-else>Exporting...</span>
          </button>
          <button class="btn btn-secondary" @click="printSummary">
            Print Summary
          </button>
        </div>
      </div>
    </div>

    <!-- Submit Confirmation Modal -->
    <SubmitConfirmationModal
      v-if="showSubmitModal"
      :class-id="classId"
      :summary="summary"
      @close="showSubmitModal = false"
      @submitted="handleSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Chart, registerables } from 'chart.js';
import SubmitConfirmationModal from '../../components/class/SubmitConfirmationModal.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

Chart.register(...registerables);

const route = useRoute();
const router = useRouter();

const classId = computed(() => parseInt(route.params.id as string, 10));
const loading = ref(false);
const error = ref<string | null>(null);
const summary = ref<any>(null);
const showSubmitModal = ref(false);
const canSubmit = ref(false);
const isSubmitted = ref(false);
const exporting = ref(false);
const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<'bar', number[], string> | null = null;

interface StudentListItem {
  id: number;
  name: string;
  studentNumber: string;
  status: string;
  opiLevel: string | null;
  hasAudio: boolean;
  assessmentId: number;
}

const studentColumns: DataTableColumn<StudentListItem>[] = [
  {
    key: 'name',
    header: 'Student Name',
    sortable: true,
    searchable: true,
    value: (row) => row.name,
  },
  {
    key: 'studentNumber',
    header: 'Student Number',
    sortable: true,
    searchable: true,
    value: (row) => row.studentNumber,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => row.status,
  },
  {
    key: 'opiLevel',
    header: 'OPI Level',
    sortable: true,
    searchable: true,
    value: (row) => row.opiLevel || '-',
  },
  {
    key: 'hasAudio',
    header: 'Audio',
    sortable: true,
    searchable: true,
    value: (row) => (row.hasAudio ? 'Yes' : 'No'),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

function asStudentItem(row: unknown): StudentListItem {
  return row as StudentListItem;
}

const completionPercentage = computed(() => {
  if (!summary.value) return 0;
  const { totalStudents, completedAssessments } = summary.value.completionStats;
  return totalStudents > 0 ? Math.round((completedAssessments / totalStudents) * 100) : 0;
});

const averageScore = computed(() => {
  if (!summary.value) return 'N/A';
  return summary.value.scoreDistribution.averageScore.toFixed(1);
});

const studentList = computed<StudentListItem[]>(() => {
  if (!summary.value?.class?.classStudents) return [];
  
  return summary.value.class.classStudents.map((cs: any) => ({
    id: cs.student.id,
    name: `${cs.student.firstName} ${cs.student.lastName}`,
    studentNumber: cs.student.studentNumber,
    status: cs.student.assessments?.[0]?.status || 'NOT_STARTED',
    opiLevel: cs.student.assessments?.[0]?.score?.opiLevel?.description || null,
    hasAudio: cs.student.assessments?.[0]?.audioRecordings?.length > 0,
    assessmentId: cs.student.assessments?.[0]?.id,
  }));
});

const loadSummary = async () => {
  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(`/api/v1/classes/${classId.value}/summary`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to load class summary');
    }

    const data = await response.json();
    summary.value = data.data;

    // Check submission status
    await checkSubmissionStatus();

    // Render chart after data is loaded
    await renderChart();
  } catch (err: any) {
    error.value = err.message || 'An error occurred while loading the summary';
  } finally {
    loading.value = false;
  }
};

const checkSubmissionStatus = async () => {
  try {
    const response = await fetch(`/api/v1/classes/${classId.value}/submission-status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      canSubmit.value = data.data.canSubmit;
    }
  } catch (err) {
    console.error('Failed to check submission status:', err);
  }
};

const renderChart = async () => {
  if (!chartCanvas.value || !summary.value) return;

  // Destroy existing chart
  if (chartInstance) {
    chartInstance.destroy();
  }

  const levels = summary.value.scoreDistribution.levels;
  const labels = Object.keys(levels);
  const data = Object.values(levels).map((value) => Number(value));
  const colors = labels.map((level: string) => getColorForLevel(level));

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Number of Students',
          data,
          backgroundColor: colors,
          borderColor: colors.map((c: string) => c.replace('0.6', '1')),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'OPI Level Distribution',
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
    },
  });
};

const getColorForLevel = (level: string): string => {
  const colors: Record<string, string> = {
    'Novice Low': 'rgba(239, 68, 68, 0.6)',
    'Novice Mid': 'rgba(249, 115, 22, 0.6)',
    'Novice High': 'rgba(245, 158, 11, 0.6)',
    'Intermediate Low': 'rgba(234, 179, 8, 0.6)',
    'Intermediate Mid': 'rgba(132, 204, 22, 0.6)',
    'Intermediate High': 'rgba(34, 197, 94, 0.6)',
    'Advanced Low': 'rgba(16, 185, 129, 0.6)',
    'Advanced Mid': 'rgba(20, 184, 166, 0.6)',
    'Advanced High': 'rgba(6, 182, 212, 0.6)',
    'Superior': 'rgba(59, 130, 246, 0.6)',
  };
  return colors[level] || 'rgba(107, 114, 128, 0.6)';
};

const viewAssessment = (assessmentId: number) => {
  router.push({
    path: `/evaluator/assessments/${assessmentId}`,
    query: { from: 'evaluator-class-summary', returnTo: route.fullPath },
  });
};

const exportToCSV = async () => {
  exporting.value = true;
  try {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-summary-${classId.value}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export failed:', err);
    alert('Failed to export CSV');
  } finally {
    exporting.value = false;
  }
};

const generateCSV = (): string => {
  const headers = ['Student Name', 'Student Number', 'Status', 'OPI Level', 'Has Audio'];
  const rows = studentList.value.map((student: any) => [
    student.name,
    student.studentNumber,
    student.status,
    student.opiLevel || 'N/A',
    student.hasAudio ? 'Yes' : 'No',
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

const printSummary = () => {
  window.print();
};

const handleSubmitted = () => {
  isSubmitted.value = true;
  showSubmitModal.value = false;
  alert('Class submitted successfully!');
  loadSummary();
};

onMounted(() => {
  loadSummary();
});

watch(classId, () => {
  loadSummary();
});
</script>

<style scoped>
.class-summary-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.label {
  font-weight: 600;
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}

.value {
  font-size: 1rem;
  color: #111827;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  text-align: center;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.chart-container {
  height: 300px;
  margin-bottom: 1rem;
}

.distribution-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.legend-label {
  font-size: 0.875rem;
  color: #4b5563;
}

.table-container {
  overflow-x: auto;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
}

.students-table th,
.students-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.students-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-completed {
  background: #d1fae5;
  color: #065f46;
}

.status-in_progress {
  background: #fef3c7;
  color: #92400e;
}

.status-not_started {
  background: #f3f4f6;
  color: #374151;
}

.status-absent {
  background: #fee2e2;
  color: #991b1b;
}

.export-buttons {
  display: flex;
  gap: 1rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-primary {
  background: #2563eb;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.btn-sm {
  padding: 0.25rem 0.75rem;
  font-size: 0.875rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-spinner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  border: 4px solid #f3f4f6;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #fee2e2;
  color: #991b1b;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

@media print {
  .page-header button,
  .export-options,
  .students-table button {
    display: none;
  }
}
</style>
