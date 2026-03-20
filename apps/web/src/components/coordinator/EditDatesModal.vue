<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white border-2 border-neutral-300 shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-200">
        <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider">Edit Assessment Dates</h2>
        <button
          class="px-3 py-1 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 uppercase tracking-wider"
          @click="$emit('close')"
        >
          &times; Close
        </button>
      </div>

      <!-- School Info -->
      <div class="p-4 border-b border-neutral-200 bg-neutral-50">
        <div class="font-semibold text-neutral-900">{{ school.name }}</div>
        <div class="text-sm text-neutral-600">{{ school.schoolType }} | {{ school.totalStudents }} students</div>
      </div>

      <!-- Dates -->
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider">Assessment Dates:</h3>
          <button
            class="px-3 py-1 text-xs font-semibold border border-neutral-900 text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider"
            @click="addDate"
          >
            + Add Date
          </button>
        </div>

        <div v-if="localDates.length === 0" class="text-neutral-500 text-sm py-4">
          No dates scheduled. Click "+ Add Date" to add one.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(dateItem, idx) in localDates"
            :key="dateItem.tempId"
            class="flex items-center gap-3"
          >
            <input
              v-model="localDates[idx].date"
              type="date"
              class="flex-1 rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              class="px-2 py-1 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50"
              @click="removeDate(idx)"
            >
              &times;
            </button>
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
          :disabled="isSaving"
          class="px-4 py-2 text-sm font-semibold border-2 border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 uppercase tracking-wider"
          @click="saveDates"
        >
          {{ isSaving ? 'Saving...' : 'Save Dates' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '../../utils/api';
import { useToast } from '../../composables/useToast';

interface SchoolDate {
  id: number;
  date: string;
}

interface SchedulingSchool {
  id: number;
  name: string;
  schoolType: string;
  totalStudents: number;
  dates: SchoolDate[];
}

interface LocalDate {
  tempId: number;
  originalId: number | null;
  date: string;
}

const props = defineProps<{
  school: SchedulingSchool;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const toast = useToast();
const localDates = ref<LocalDate[]>([]);
const isSaving = ref(false);
let nextTempId = 1;

onMounted(() => {
  localDates.value = props.school.dates.map((d) => ({
    tempId: nextTempId++,
    originalId: d.id,
    date: d.date,
  }));
});

function addDate() {
  localDates.value.push({
    tempId: nextTempId++,
    originalId: null,
    date: '',
  });
}

function removeDate(idx: number) {
  localDates.value.splice(idx, 1);
}

async function saveDates() {
  isSaving.value = true;

  try {
    const originalIds = new Set(props.school.dates.map((d) => d.id));
    const currentOriginalIds = new Set(
      localDates.value.filter((d) => d.originalId !== null).map((d) => d.originalId!),
    );

    // Delete removed dates
    for (const origId of originalIds) {
      if (!currentOriginalIds.has(origId)) {
        await api.delete(`/coordinator/${props.school.id}/dates/${origId}`);
      }
    }

    // Add new dates
    const newDates = localDates.value
      .filter((d) => d.originalId === null && d.date.trim())
      .map((d) => d.date.trim());

    if (newDates.length > 0) {
      await api.post(`/coordinator/${props.school.id}/dates/bulk`, {
        assessmentDates: newDates,
      });
    }

    emit('saved');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to save dates');
  } finally {
    isSaving.value = false;
  }
}
</script>
