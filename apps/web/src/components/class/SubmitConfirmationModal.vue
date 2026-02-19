<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="text-xl font-bold">Submit Class Assessment</h2>
        <button class="close-button" aria-label="Close modal" @click="$emit('close')">
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="modal-body">
        <!-- Validation Results -->
        <div v-if="!validating && validationResult" class="validation-section">
          <div v-if="validationResult.canSubmit" class="success-message">
            <CircleCheck class="icon" />
            <p>All assessments are complete and ready for submission.</p>
          </div>

          <div v-else class="error-message">
            <AlertCircle class="icon" />
            <div>
              <p class="font-semibold">Cannot submit class. Please resolve the following issues:</p>
              <ul class="requirements-list">
                <li v-for="(req, index) in validationResult.requirements" :key="index">
                  {{ req }}
                </li>
              </ul>
              <p class="mt-2">
                <strong>{{ validationResult.blockedAssessments.length }}</strong> assessment(s) are incomplete.
              </p>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="validating" class="loading-state">
          <div class="spinner"></div>
          <p>Validating assessments...</p>
        </div>

        <!-- Summary Information -->
        <div v-if="summary && !validating" class="summary-info">
          <h3 class="text-lg font-semibold mb-3">Class Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="label">Total Students:</span>
              <span class="value">{{ summary.completionStats.totalStudents }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Completed Assessments:</span>
              <span class="value">{{ summary.completionStats.completedAssessments }}</span>
            </div>
            <div class="summary-item">
              <span class="label">Average OPI Level:</span>
              <span class="value">{{ summary.scoreDistribution.averageScore.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- Submission Notes -->
        <div v-if="validationResult?.canSubmit && !submitting" class="notes-section">
          <label for="notes" class="label">Submission Notes (Optional)</label>
          <textarea
            id="notes"
            v-model="notes"
            rows="4"
            placeholder="Add any notes about this class submission..."
            class="notes-textarea"
          ></textarea>
        </div>

        <!-- Submission Confirmation -->
        <div v-if="validationResult?.canSubmit && !submitting" class="confirmation-section">
          <div class="warning-box">
            <TriangleAlert class="icon" />
            <p>
              <strong>Important:</strong> Once submitted, you will not be able to edit these assessments.
              Please ensure all information is accurate before proceeding.
            </p>
          </div>
        </div>

        <!-- Submitting State -->
        <div v-if="submitting" class="loading-state">
          <div class="spinner"></div>
          <p>Submitting class assessment...</p>
        </div>

        <!-- Error State -->
        <div v-if="submitError" class="error-message">
          <CircleX class="icon" />
          <p>{{ submitError }}</p>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn btn-secondary"
          :disabled="submitting"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          v-if="validationResult?.canSubmit"
          class="btn btn-primary"
          :disabled="submitting"
          @click="handleSubmit"
        >
          <span v-if="!submitting">Confirm Submission</span>
          <span v-else>Submitting...</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AlertCircle, CircleCheck, CircleX, TriangleAlert, X } from 'lucide-vue-next';

interface Props {
  classId: number;
  summary: any;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
  submitted: [];
}>();

const validating = ref(true);
const validationResult = ref<any>(null);
const notes = ref('');
const submitting = ref(false);
const submitError = ref<string | null>(null);

const validateSubmission = async () => {
  validating.value = true;
  try {
    const response = await fetch(`/api/v1/classes/${props.classId}/submission-status`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to validate submission');
    }

    const data = await response.json();
    validationResult.value = data.data;
  } catch (err: any) {
    submitError.value = err.message || 'Validation failed';
  } finally {
    validating.value = false;
  }
};

const handleSubmit = async () => {
  submitting.value = true;
  submitError.value = null;

  try {
    const response = await fetch(`/api/v1/assessments/classes/${props.classId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        submittedBy: 1, // TODO: Get from auth context
        notes: notes.value || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Submission failed');
    }

    emit('submitted');
  } catch (err: any) {
    submitError.value = err.message || 'An error occurred during submission';
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  validateSubmission();
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: #6b7280;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #374151;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.validation-section {
  margin-bottom: 1.5rem;
}

.success-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 6px;
  color: #065f46;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 6px;
  color: #991b1b;
}

.icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.requirements-list {
  list-style: disc;
  margin-left: 1.5rem;
  margin-top: 0.5rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  border: 4px solid #f3f4f6;
  border-top: 4px solid #2563eb;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.summary-info {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 6px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.summary-item {
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
  font-size: 1.125rem;
  color: #111827;
  font-weight: 600;
}

.notes-section {
  margin-bottom: 1.5rem;
}

.notes-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  margin-top: 0.5rem;
}

.notes-textarea:focus {
  outline: none;
  border-color: #2563eb;
  ring: 2px;
  ring-color: rgba(37, 99, 235, 0.2);
}

.confirmation-section {
  margin-bottom: 1.5rem;
}

.warning-box {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 6px;
  color: #92400e;
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

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
