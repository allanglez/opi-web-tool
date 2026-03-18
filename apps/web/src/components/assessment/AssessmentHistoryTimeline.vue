<template>
  <div class="assessment-history-timeline">
    <!-- Toggle Button -->
    <button
      class="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 mb-4"
      @click="isExpanded = !isExpanded"
    >
      <ChevronRight
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-90': isExpanded }"
      />
      Assessment History
      <span class="text-xs text-neutral-400">({{ entries.length }} events)</span>
    </button>

    <!-- Timeline -->
    <div v-if="isExpanded">
      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center gap-2 text-sm text-neutral-500 py-4">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-400"></div>
        Loading history...
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-sm text-red-600 py-2">
        {{ error }}
        <button class="ml-2 underline" @click="fetchTimeline">Retry</button>
      </div>

      <!-- Empty -->
      <div v-else-if="entries.length === 0" class="text-sm text-neutral-500 py-4">
        No history entries yet.
      </div>

      <!-- Timeline entries -->
      <div v-else class="relative pl-6 border-l-2 border-neutral-200 space-y-4">
        <div
          v-for="entry in entries"
          :key="entry.id"
          class="relative"
        >
          <!-- Timeline dot -->
          <div
            class="absolute -left-[25px] w-3 h-3 rounded-full border-2 border-white"
            :class="getDotColor(entry.action)"
          ></div>

          <!-- Entry content -->
          <div class="bg-neutral-50 rounded-lg p-3">
            <div class="flex items-start justify-between">
              <div>
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  :class="getBadgeClass(entry.action)"
                >
                  {{ formatAction(entry.action) }}
                </span>
                <span class="ml-2 text-xs text-neutral-500">
                  by {{ entry.changer?.firstName }} {{ entry.changer?.lastName }}
                </span>
              </div>
              <span class="text-xs text-neutral-400 whitespace-nowrap ml-2">
                {{ formatTime(entry.changedAt) }}
              </span>
            </div>

            <!-- Field change details -->
            <div v-if="entry.fieldName" class="mt-2 text-sm">
              <span class="text-neutral-500">{{ formatFieldName(entry.fieldName) }}:</span>
              <span v-if="entry.oldValue" class="ml-1 text-red-600 line-through">{{ entry.oldValue }}</span>
              <span v-if="entry.oldValue && entry.newValue" class="mx-1 text-neutral-400">&rarr;</span>
              <span v-if="entry.newValue" class="text-green-600 font-medium">{{ entry.newValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { ChevronRight } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth';

const props = defineProps<{
  assessmentId: number;
  refreshKey?: number;
}>();

const authStore = useAuthStore();
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface TimelineEntry {
  id: number;
  assessmentId: number;
  action: string;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  changer: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const isExpanded = ref(false);
const isLoading = ref(false);
const error = ref<string | null>(null);
const entries = ref<TimelineEntry[]>([]);
const needsRefresh = ref(false);

async function fetchTimeline() {
  if (!props.assessmentId) return;

  isLoading.value = true;
  error.value = null;

  try {
    const res = await fetch(`${API_BASE}/audit/assessments/${props.assessmentId}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch timeline');
    }

    entries.value = await res.json();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'An error occurred';
  } finally {
    isLoading.value = false;
  }
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    ASSESSMENT_START: 'Started',
    ASSESSMENT_COMPLETE: 'Completed',
    ASSESSMENT_REOPEN: 'Reopened',
    ASSESSMENT_UPDATE: 'Updated',
    ASSESSMENT_MARK_ABSENT: 'Marked Absent',
    ASSESSMENT_AUDIO_UPLOADED: 'Audio Uploaded',
    ASSESSMENT_RE_EVALUATE: 'Re-evaluated',
    SCORE_CHANGE: 'Score Changed',
    REVIEW_RESOLVED: 'Review Resolved',
    ASSESSMENT_LOCKED: 'Locked',
    ASSESSMENT_FLAGGED_FOR_REVIEW: 'Flagged for Review',
    CLASS_SUBMITTED: 'Class Submitted',
  };
  return labels[action] || action.replace(/_/g, ' ');
}

function formatFieldName(field: string): string {
  const labels: Record<string, string> = {
    status: 'Status',
    opiLevelId: 'OPI Level',
    needs_review: 'Needs Review',
    notes: 'Notes',
    reason: 'Reason',
    assessment: 'Assessment',
    criteria_count: 'Criteria Selected',
    criteria_ids: 'Criteria IDs',
  };
  return labels[field] || field;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDotColor(action: string): string {
  const colors: Record<string, string> = {
    ASSESSMENT_START: 'bg-blue-500',
    ASSESSMENT_COMPLETE: 'bg-green-500',
    ASSESSMENT_REOPEN: 'bg-yellow-500',
    ASSESSMENT_UPDATE: 'bg-neutral-400',
    ASSESSMENT_MARK_ABSENT: 'bg-gray-500',
    ASSESSMENT_AUDIO_UPLOADED: 'bg-purple-500',
    ASSESSMENT_RE_EVALUATE: 'bg-orange-500',
    SCORE_CHANGE: 'bg-red-500',
    REVIEW_RESOLVED: 'bg-teal-500',
    ASSESSMENT_FLAGGED_FOR_REVIEW: 'bg-pink-500',
  };
  return colors[action] || 'bg-neutral-400';
}

function getBadgeClass(action: string): string {
  const map: Record<string, string> = {
    ASSESSMENT_START: 'bg-blue-100 text-blue-800',
    ASSESSMENT_COMPLETE: 'bg-green-100 text-green-800',
    ASSESSMENT_REOPEN: 'bg-yellow-100 text-yellow-800',
    ASSESSMENT_UPDATE: 'bg-neutral-100 text-neutral-800',
    ASSESSMENT_MARK_ABSENT: 'bg-gray-100 text-gray-800',
    ASSESSMENT_AUDIO_UPLOADED: 'bg-purple-100 text-purple-800',
    ASSESSMENT_RE_EVALUATE: 'bg-orange-100 text-orange-800',
    SCORE_CHANGE: 'bg-red-100 text-red-800',
    REVIEW_RESOLVED: 'bg-teal-100 text-teal-800',
    ASSESSMENT_FLAGGED_FOR_REVIEW: 'bg-pink-100 text-pink-800',
  };
  return map[action] || 'bg-neutral-100 text-neutral-800';
}

// Fetch on expand
watch(isExpanded, (val) => {
  if (val && (entries.value.length === 0 || needsRefresh.value)) {
    needsRefresh.value = false;
    fetchTimeline();
  }
});

// Re-fetch when refreshKey changes (triggered after save)
watch(
  () => props.refreshKey,
  () => {
    if (!props.assessmentId) return;

    if (!isExpanded.value) {
      // Mark dirty so the next expand fetches fresh data; don't clear entries (preserves counter)
      needsRefresh.value = true;
      return;
    }

    fetchTimeline();
  },
);

watch(
  () => props.assessmentId,
  (assessmentId) => {
    if (!assessmentId) {
      entries.value = [];
      return;
    }

    fetchTimeline();
  },
  { immediate: true }
);
</script>
