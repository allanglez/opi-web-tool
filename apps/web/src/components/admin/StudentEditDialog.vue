<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center">
    <!-- Backdrop -->
    <div class="absolute inset-0 bg-black/50" @click="close"></div>

    <!-- Dialog -->
    <div class="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-neutral-200">
        <h2 class="text-xl font-semibold text-neutral-900">Edit Student</h2>
        <button class="text-neutral-400 hover:text-neutral-600" @click="close">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">
        <!-- Read-only fields -->
        <div class="bg-neutral-50 rounded-lg p-4 space-y-2">
          <p class="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Read-only</p>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-neutral-500">Student #:</span>
              <span class="ml-1 font-medium text-neutral-900">{{ student?.studentNumber }}</span>
            </div>
            <div>
              <span class="text-neutral-500">PEN:</span>
              <span class="ml-1 font-medium text-neutral-900">{{ student?.pen || 'N/A' }}</span>
            </div>
            <div>
              <span class="text-neutral-500">Cycle:</span>
              <span class="ml-1 font-medium text-neutral-900">{{ student?.cycle?.name }}</span>
            </div>
          </div>
        </div>

        <!-- Editable fields -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">First Name</label>
            <input
              v-model="form.firstName"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Last Name</label>
            <input
              v-model="form.lastName"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Middle Name</label>
            <input
              v-model="form.middleName"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-neutral-700 mb-1">Grade</label>
            <input
              v-model.number="form.grade"
              type="number"
              class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <!-- School reassignment -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-1">School</label>
          <select
            v-model.number="form.schoolId"
            class="w-full px-3 py-2 border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option v-for="school in schools" :key="school.id" :value="school.id">
              {{ school.name }} ({{ school.schoolCode }})
            </option>
          </select>
          <p v-if="form.schoolId !== student?.schoolId" class="mt-1 text-xs text-amber-600 font-medium">
            Moving student to a different school will remove current class enrollments.
          </p>
        </div>

        <!-- Class enrollments -->
        <div>
          <label class="block text-sm font-medium text-neutral-700 mb-2">Class Enrollments</label>

          <!-- Current enrollments -->
          <div v-if="currentEnrollments.length > 0" class="space-y-2 mb-3">
            <div
              v-for="enrollment in currentEnrollments"
              :key="enrollment.classId"
              class="flex items-center justify-between bg-neutral-50 px-3 py-2"
            >
              <span class="text-sm text-neutral-900">{{ enrollment.classCode }}</span>
              <button
                class="text-xs text-red-600 hover:text-red-800 font-medium"
                @click="removeEnrollment(enrollment.classId)"
              >
                Remove
              </button>
            </div>
          </div>
          <p v-else class="text-sm text-neutral-500 mb-3">No class enrollments.</p>

          <!-- Add enrollment -->
          <div v-if="availableClasses.length > 0" class="flex gap-2">
            <select
              v-model.number="selectedClassToAdd"
              class="flex-1 px-3 py-2 border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option :value="0" disabled>Select a class to add...</option>
              <option v-for="cls in availableClasses" :key="cls.id" :value="cls.id">
                {{ cls.classCode }}{{ cls.courseTitle ? ` - ${cls.courseTitle}` : '' }}
              </option>
            </select>
            <button
              :disabled="!selectedClassToAdd"
              class="px-3 py-2 text-sm bg-[#0f3f52] text-white hover:bg-[#0c3444] disabled:bg-neutral-300 disabled:cursor-not-allowed"
              @click="addEnrollment"
            >
              Add
            </button>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-sm text-red-800">{{ error }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-neutral-200">
        <button
          class="px-4 py-2 text-sm text-neutral-700 bg-neutral-100 hover:bg-neutral-200"
          @click="close"
        >
          Cancel
        </button>
        <button
          :disabled="isSaving || !hasChanges"
          class="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
          @click="save"
        >
          {{ isSaving ? 'Saving...' : 'Save Changes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { api } from '../../utils/api';

interface StudentDetail {
  id: number;
  studentNumber: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  pen?: string | null;
  grade?: number | null;
  schoolId: number;
  cycleId: number;
  isManuallyEdited: boolean;
  school: { id: number; schoolCode: string; name: string };
  cycle: { id: number; name: string; year: number };
  classStudents: Array<{
    classId: number;
    class: {
      id: number;
      classCode: string;
      courseTitle?: string;
    };
  }>;
}

interface School {
  id: number;
  schoolCode: string;
  name: string;
}

interface ClassOption {
  id: number;
  classCode: string;
  courseTitle?: string;
}

const props = defineProps<{
  visible: boolean;
  student: StudentDetail | null;
  schools: School[];
  cycleId: number;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const form = ref({
  firstName: '',
  lastName: '',
  middleName: '',
  grade: null as number | null,
  schoolId: 0,
});

const isSaving = ref(false);
const error = ref<string | null>(null);
const selectedClassToAdd = ref(0);
const enrollmentChanges = ref<{ add: number[]; remove: number[] }>({ add: [], remove: [] });
const schoolClasses = ref<ClassOption[]>([]);

const currentEnrollments = computed(() => {
  if (!props.student) return [];

  const original = props.student.classStudents.map((cs) => ({
    classId: cs.class.id,
    classCode: cs.class.classCode,
  }));

  // Remove removed, add added
  return [
    ...original.filter((e) => !enrollmentChanges.value.remove.includes(e.classId)),
    ...enrollmentChanges.value.add.map((id) => {
      const cls = schoolClasses.value.find((c) => c.id === id);
      return { classId: id, classCode: cls?.classCode ?? `Class ${id}` };
    }),
  ];
});

const availableClasses = computed(() => {
  const enrolledIds = new Set(currentEnrollments.value.map((e) => e.classId));
  return schoolClasses.value.filter((c) => !enrolledIds.has(c.id));
});

const hasChanges = computed(() => {
  if (!props.student) return false;
  return (
    form.value.firstName !== props.student.firstName ||
    form.value.lastName !== props.student.lastName ||
    (form.value.middleName || '') !== (props.student.middleName || '') ||
    form.value.grade !== props.student.grade ||
    form.value.schoolId !== props.student.schoolId ||
    enrollmentChanges.value.add.length > 0 ||
    enrollmentChanges.value.remove.length > 0
  );
});

watch(() => props.student, (student) => {
  if (student) {
    form.value = {
      firstName: student.firstName,
      lastName: student.lastName,
      middleName: student.middleName || '',
      grade: student.grade ?? null,
      schoolId: student.schoolId,
    };
    enrollmentChanges.value = { add: [], remove: [] };
    selectedClassToAdd.value = 0;
    error.value = null;
    fetchSchoolClasses(student.schoolId);
  }
}, { immediate: true });

watch(() => form.value.schoolId, (newSchoolId, oldSchoolId) => {
  if (newSchoolId && newSchoolId !== oldSchoolId) {
    fetchSchoolClasses(newSchoolId);
    // If school changed, reset enrollment changes
    if (props.student && newSchoolId !== props.student.schoolId) {
      enrollmentChanges.value = { add: [], remove: [] };
    }
  }
});

async function fetchSchoolClasses(schoolId: number) {
  if (!props.cycleId) return;
  try {
    const classes = await api.get<ClassOption[]>('/admin/classes', {
      cycleId: props.cycleId,
      schoolId,
    });
    schoolClasses.value = classes;
  } catch {
    schoolClasses.value = [];
  }
}

function removeEnrollment(classId: number) {
  if (enrollmentChanges.value.add.includes(classId)) {
    enrollmentChanges.value.add = enrollmentChanges.value.add.filter((id) => id !== classId);
  } else {
    enrollmentChanges.value.remove.push(classId);
  }
}

function addEnrollment() {
  if (selectedClassToAdd.value) {
    enrollmentChanges.value.add.push(selectedClassToAdd.value);
    selectedClassToAdd.value = 0;
  }
}

function close() {
  emit('close');
}

async function save() {
  if (!props.student || !hasChanges.value) return;
  isSaving.value = true;
  error.value = null;

  try {
    // Build student update payload (only changed fields)
    const studentUpdate: Record<string, unknown> = {};
    if (form.value.firstName !== props.student.firstName) studentUpdate.firstName = form.value.firstName;
    if (form.value.lastName !== props.student.lastName) studentUpdate.lastName = form.value.lastName;
    if ((form.value.middleName || '') !== (props.student.middleName || '')) studentUpdate.middleName = form.value.middleName || null;
    if (form.value.grade !== props.student.grade) studentUpdate.grade = form.value.grade;
    if (form.value.schoolId !== props.student.schoolId) studentUpdate.schoolId = form.value.schoolId;

    // Update student fields if changed
    if (Object.keys(studentUpdate).length > 0) {
      await api.patch(`/admin/students/${props.student.id}`, studentUpdate);
    }

    // Update enrollments if changed (only if school didn't change - school change auto-removes)
    if (form.value.schoolId === props.student.schoolId) {
      if (enrollmentChanges.value.add.length > 0 || enrollmentChanges.value.remove.length > 0) {
        await api.patch(`/admin/students/${props.student.id}/enrollment`, {
          addClassIds: enrollmentChanges.value.add.length > 0 ? enrollmentChanges.value.add : undefined,
          removeClassIds: enrollmentChanges.value.remove.length > 0 ? enrollmentChanges.value.remove : undefined,
        });
      }
    }

    emit('saved');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to save changes';
  } finally {
    isSaving.value = false;
  }
}
</script>
