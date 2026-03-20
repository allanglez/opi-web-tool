<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white border-2 border-neutral-300 shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-200">
        <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wider">Bulk Date Assignment</h2>
        <button
          class="px-3 py-1 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 uppercase tracking-wider"
          @click="$emit('close')"
        >
          &times; Close
        </button>
      </div>

      <!-- Step 1: Select Schools -->
      <div class="p-4 border-b border-neutral-200">
        <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">
          1. Select Schools
          <span v-if="selectedSchoolIds.length > 0" class="text-xs font-normal text-neutral-500 normal-case">
            ({{ selectedSchoolIds.length }} selected)
          </span>
        </h3>

        <input
          v-model="schoolSearch"
          type="text"
          placeholder="Search schools..."
          class="w-full mb-3 rounded-md border-neutral-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        />

        <div class="max-h-48 overflow-y-auto border border-neutral-200 rounded-md">
          <label
            v-for="school in filteredSchools"
            :key="school.id"
            class="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0"
          >
            <input
              type="checkbox"
              :value="school.id"
              v-model="selectedSchoolIds"
              class="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-500"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-neutral-900 truncate">{{ school.name }}</div>
              <div class="text-xs text-neutral-500">{{ school.schoolType }} | {{ school.totalStudents }} students</div>
            </div>
          </label>
          <div v-if="filteredSchools.length === 0" class="text-center py-4 text-sm text-neutral-400">
            No schools match your search
          </div>
        </div>

        <div class="flex gap-2 mt-2">
          <button
            class="text-xs text-blue-600 hover:underline"
            @click="selectAllFiltered"
          >
            Select all{{ schoolSearch ? ' filtered' : '' }}
          </button>
          <span class="text-xs text-neutral-300">|</span>
          <button
            class="text-xs text-blue-600 hover:underline"
            @click="selectedSchoolIds = []"
          >
            Clear selection
          </button>
        </div>
      </div>

      <!-- Step 2: Add Dates -->
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-neutral-900 uppercase tracking-wider">2. Assessment Dates</h3>
          <button
            class="px-3 py-1 text-xs font-semibold border border-neutral-900 text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider"
            @click="addDate"
          >
            + Add Date
          </button>
        </div>

        <div v-if="dates.length === 0" class="text-neutral-500 text-sm py-4">
          No dates added. Click "+ Add Date" to add one.
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(dateItem, idx) in dates"
            :key="dateItem.tempId"
            class="flex items-center gap-3"
          >
            <input
              v-model="dates[idx].date"
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
          :disabled="isSaving || selectedSchoolIds.length === 0 || validDates.length === 0"
          class="px-4 py-2 text-sm font-semibold border-2 border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700 disabled:opacity-50 uppercase tracking-wider"
          @click="saveBulkDates"
        >
          {{ isSaving ? 'Saving...' : `Save Dates to ${selectedSchoolIds.length} School${selectedSchoolIds.length !== 1 ? 's' : ''}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { api } from '../../utils/api';
import { useToast } from '../../composables/useToast';

interface SchedulingSchool {
  id: number;
  name: string;
  schoolType: string;
  totalStudents: number;
}

interface DateEntry {
  tempId: number;
  date: string;
}

const props = defineProps<{
  schools: SchedulingSchool[];
  apiPrefix?: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const toast = useToast();
const prefix = computed(() => props.apiPrefix ?? '/coordinator');

const schoolSearch = ref('');
const selectedSchoolIds = ref<number[]>([]);
const dates = ref<DateEntry[]>([]);
const isSaving = ref(false);
let nextTempId = 1;

const filteredSchools = computed(() => {
  const q = schoolSearch.value.toLowerCase().trim();
  if (!q) return props.schools;
  return props.schools.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.schoolType.toLowerCase().includes(q),
  );
});

const validDates = computed(() =>
  dates.value.filter((d) => d.date.trim()).map((d) => d.date.trim()),
);

function selectAllFiltered() {
  const ids = new Set(selectedSchoolIds.value);
  for (const s of filteredSchools.value) {
    ids.add(s.id);
  }
  selectedSchoolIds.value = [...ids];
}

function addDate() {
  dates.value.push({ tempId: nextTempId++, date: '' });
}

function removeDate(idx: number) {
  dates.value.splice(idx, 1);
}

async function saveBulkDates() {
  if (selectedSchoolIds.value.length === 0 || validDates.value.length === 0) return;

  isSaving.value = true;

  try {
    const errors: string[] = [];

    for (const schoolId of selectedSchoolIds.value) {
      try {
        await api.post(`${prefix.value}/${schoolId}/dates/bulk`, {
          assessmentDates: validDates.value,
        });
      } catch (err) {
        const schoolName = props.schools.find((s) => s.id === schoolId)?.name ?? `School #${schoolId}`;
        errors.push(schoolName);
      }
    }

    if (errors.length > 0) {
      toast.error(`Failed to save dates for: ${errors.join(', ')}`);
    }

    if (errors.length < selectedSchoolIds.value.length) {
      emit('saved');
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to bulk schedule dates');
  } finally {
    isSaving.value = false;
  }
}
</script>
