<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white border-2 border-neutral-300 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-200">
        <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider">Assign Evaluators to Class</h2>
        <button
          class="px-3 py-1 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 uppercase tracking-wider"
          @click="$emit('close')"
        >
          &times; Close
        </button>
      </div>

      <!-- Class Info -->
      <div class="p-4 border-b border-neutral-200 bg-neutral-50">
        <div class="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span class="font-semibold">School:</span> {{ classData.school.name }}</div>
          <div><span class="font-semibold">Teacher:</span> {{ classData.teacher ?? '—' }}</div>
          <div><span class="font-semibold">Grade:</span> {{ classData.grade ?? '—' }}</div>
          <div><span class="font-semibold">Program:</span> {{ classData.program ?? '—' }}</div>
          <div><span class="font-semibold">Students:</span> {{ classData.totalStudents }}</div>
          <div><span class="font-semibold">Assessment Date:</span> {{ classData.assessmentDate ?? '—' }}</div>
        </div>
      </div>

      <!-- Evaluator Selection -->
      <div class="p-4">
        <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">
          Select Evaluators (Multiple allowed):
        </h3>

        <div class="space-y-3">
          <div
            v-for="ev in evaluators"
            :key="ev.id"
            class="border-2 p-3 cursor-pointer transition-colors"
            :class="isSelected(ev.id)
              ? 'border-blue-400 bg-blue-50'
              : 'border-neutral-200 hover:border-neutral-400'"
            @click="toggleEvaluator(ev.id)"
          >
            <div class="flex items-center justify-between">
              <div>
                <div class="font-semibold text-neutral-900">{{ ev.firstName }} {{ ev.lastName }}</div>
                <div class="text-xs text-neutral-500">{{ ev.email }}</div>
              </div>
              <div class="text-right text-xs text-neutral-600">
                <div>Current: {{ ev.classCount }} classes</div>
                <div>{{ ev.studentCount }} students</div>
              </div>
            </div>
            <div class="mt-2">
              <button
                v-if="isSelected(ev.id)"
                class="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 uppercase tracking-wider"
              >
                &#10003; Selected
              </button>
              <button
                v-else
                class="px-3 py-1 text-xs font-semibold border border-neutral-300 text-neutral-600 uppercase tracking-wider"
              >
                Click to Select
              </button>
            </div>
          </div>
        </div>

        <!-- Selected Summary -->
        <div v-if="selectedEvaluatorIds.length > 0" class="mt-4 p-3 bg-blue-50 border border-blue-200">
          <div class="text-sm font-semibold text-neutral-900 mb-2">
            Selected Evaluators ({{ selectedEvaluatorIds.length }}):
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="evId in selectedEvaluatorIds"
              :key="evId"
              class="inline-block px-2 py-1 text-xs font-medium bg-white border border-blue-300 text-blue-800 rounded"
            >
              {{ getEvaluatorName(evId) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t border-neutral-200">
        <button
          class="px-4 py-2 text-sm font-semibold border border-neutral-300 text-neutral-700 hover:bg-neutral-100 uppercase tracking-wider"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          :disabled="isSaving || selectedEvaluatorIds.length === 0"
          class="px-4 py-2 text-sm font-semibold border-2 border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 uppercase tracking-wider"
          @click="saveAssignment"
        >
          {{ isSaving ? 'Saving...' : 'Save Assignment' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../utils/api';

interface ClassEvaluator {
  id: number;
  name: string;
  email: string;
  assignmentId: number;
}

interface ClassData {
  id: number;
  classCode: string;
  grade: number | null;
  school: {
    id: number;
    schoolCode: string;
    name: string;
    schoolType: string;
  };
  teacher: string | null;
  program: string | null;
  totalStudents: number;
  assessmentDate: string | null;
  evaluators: ClassEvaluator[];
}

interface EvaluatorWorkload {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  classCount: number;
  studentCount: number;
}

const props = defineProps<{
  classData: ClassData;
  evaluators: EvaluatorWorkload[];
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const selectedEvaluatorIds = ref<number[]>([]);
const isSaving = ref(false);

onMounted(() => {
  // Pre-select currently assigned evaluators
  selectedEvaluatorIds.value = props.classData.evaluators.map((ev) => ev.id);
});

function isSelected(evaluatorId: number): boolean {
  return selectedEvaluatorIds.value.includes(evaluatorId);
}

function toggleEvaluator(evaluatorId: number) {
  if (isSelected(evaluatorId)) {
    selectedEvaluatorIds.value = selectedEvaluatorIds.value.filter((id) => id !== evaluatorId);
  } else {
    selectedEvaluatorIds.value.push(evaluatorId);
  }
}

function getEvaluatorName(evaluatorId: number): string {
  const ev = props.evaluators.find((e) => e.id === evaluatorId);
  return ev ? `${ev.firstName} ${ev.lastName}`.trim() : 'Unknown';
}

async function saveAssignment() {
  isSaving.value = true;

  try {
    // Get the active cycle
    const cycleResponse = await api.get<{ id: number }>('/cycles/active');
    const cycleId = cycleResponse.id;

    // Remove evaluators that were previously assigned but are now deselected
    const previousIds = new Set(props.classData.evaluators.map((ev) => ev.id));
    const currentIds = new Set(selectedEvaluatorIds.value);

    // Delete removed assignments
    for (const ev of props.classData.evaluators) {
      if (!currentIds.has(ev.id)) {
        await api.delete(`/coordinator/assignments/${ev.assignmentId}`);
      }
    }

    // Add new assignments
    const newEvaluatorIds = selectedEvaluatorIds.value.filter((id) => !previousIds.has(id));
    if (newEvaluatorIds.length > 0) {
      await api.post('/coordinator/assignments/bulk', {
        cycleId,
        assignments: newEvaluatorIds.map((evaluatorId) => ({
          classId: props.classData.id,
          evaluatorId,
        })),
      });
    }

    emit('saved');
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to save assignment');
  } finally {
    isSaving.value = false;
  }
}
</script>
