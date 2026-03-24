<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="mt-8 mb-8 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-neutral-900">User Management</h1>
      <button
        class="px-4 py-2 bg-neutral-900 text-white text-sm font-semibold border border-neutral-900 hover:bg-neutral-800 transition-colors"
        @click="showAddModal = true"
      >
        + Add New User
      </button>
    </div>

    <!-- Stats Cards -->
    <section class="mb-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard :value="userStats.total" label="Total Users" variant="default" />
        <StatCard :value="userStats.admins" label="Administrators" variant="purple" />
        <StatCard :value="userStats.coordinators" label="Coordinators" variant="green" />
        <StatCard :value="userStats.evaluators" label="Evaluators" variant="blue" />
      </div>
    </section>

    <!-- Loading State -->
    <LoadingState v-if="isLoading" />

    <!-- No Cycle Notice -->
    <NoCycleNotice v-else-if="noCycle" />

    <!-- Error State -->
    <ErrorState v-else-if="error" :message="error" @retry="fetchUsers" />

    <!-- Users Table -->
    <BaseCard v-else>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-neutral-900">System Users</h2>
      </div>

      <!-- Bulk Actions Bar -->
      <div
        v-if="selectedUserIds.length > 0"
        class="flex items-center gap-3 mb-4 p-3 bg-blue-50 border border-blue-200"
      >
        <span class="text-sm font-medium text-blue-800">
          {{ selectedUserIds.length }} user{{ selectedUserIds.length !== 1 ? 's' : '' }} selected
        </span>
        <div class="flex gap-2 ml-auto">
          <button
            class="px-3 py-1.5 text-xs font-semibold border border-neutral-900 text-neutral-900 hover:bg-neutral-100 uppercase tracking-wider"
            @click="showBulkRoleModal = true"
          >
            Change Role
          </button>
          <button
            class="px-3 py-1.5 text-xs font-semibold border border-red-400 text-red-600 hover:bg-red-50 uppercase tracking-wider"
            @click="showBulkDeactivateModal = true"
          >
            Deactivate
          </button>
          <button
            class="px-3 py-1.5 text-xs font-semibold border border-green-400 text-green-600 hover:bg-green-50 uppercase tracking-wider"
            @click="bulkActivate"
          >
            Activate
          </button>
          <button
            class="px-3 py-1.5 text-xs text-neutral-500 hover:text-neutral-700"
            @click="selectedUserIds = []"
          >
            Clear
          </button>
        </div>
      </div>

      <AppDataTable
        :data="users"
        :columns="userColumns"
        search-placeholder="Search users by name, email, role..."
        empty-text="No users found."
        :initial-page-size="10"
        selectable
        v-model:selected-keys="selectedUserIds"
      >
        <template #cell-name="{ row }">
          <div class="py-1">
            <div class="font-medium text-neutral-900">{{ asUser(row).firstName }} {{ asUser(row).lastName }}</div>
            <div class="text-xs text-neutral-500">ID: {{ asUser(row).id }}</div>
          </div>
        </template>

        <template #cell-email="{ row }">
          <span class="text-sm text-neutral-700">{{ asUser(row).email }}</span>
        </template>

        <template #cell-roles="{ row }">
          <span
            v-for="role in asUser(row).roles"
            :key="role"
            class="inline-block px-2 py-0.5 text-xs font-semibold rounded mr-1"
            :class="getRoleBadgeClass(role)"
          >
            {{ role }}
          </span>
        </template>

        <template #cell-status="{ row }">
          <span
            class="inline-block px-2 py-0.5 text-xs font-semibold rounded"
            :class="asUser(row).isActive ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-neutral-100 text-neutral-500 border border-neutral-300'"
          >
            {{ asUser(row).isActive ? 'ACTIVE' : 'INACTIVE' }}
          </span>
        </template>

        <template #cell-lastLogin="{ row }">
          <span class="text-sm text-neutral-700">
            {{ formatDateTime(asUser(row).lastLoginAt) }}
          </span>
        </template>

        <template #cell-statusChanged="{ row }">
          <span class="text-sm text-neutral-700">
            {{ formatDateTime(asUser(row).statusChangedAt) }}
          </span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex space-x-2">
            <button
              class="px-3 py-1 text-xs font-semibold border border-neutral-300 hover:bg-neutral-100 transition-colors"
              @click="openEditModal(asUser(row))"
            >
              EDIT
            </button>
            <button
              v-if="asUser(row).isActive && asUser(row).id !== authStore.user?.id"
              class="px-3 py-1 text-xs font-semibold border border-red-300 text-red-600 hover:bg-red-50 transition-colors"
              @click="confirmDeactivate(asUser(row))"
            >
              DEACTIVATE
            </button>
            <button
              v-else-if="!asUser(row).isActive"
              class="px-3 py-1 text-xs font-semibold border border-green-300 text-green-600 hover:bg-green-50 transition-colors"
              @click="activateUser(asUser(row))"
            >
              ACTIVATE
            </button>
          </div>
        </template>
      </AppDataTable>
    </BaseCard>

    <!-- Add New User Modal -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showAddModal = false">
      <div class="bg-white shadow-xl w-full max-w-lg mx-4">
        <div class="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wide">Add New User</h2>
          <button class="text-red-500 hover:text-red-700 border border-red-300 rounded w-7 h-7 flex items-center justify-center" @click="showAddModal = false">
            &times;
          </button>
        </div>
        <div class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">Full Name *</label>
            <input
              v-model="newUser.fullName"
              type="text"
              placeholder="Enter full name"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">Email Address *</label>
            <input
              v-model="newUser.email"
              type="email"
              placeholder="user@yukon.ca"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">User Role *</label>
            <select
              v-model="newUser.role"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            >
              <option value="PENDING">Pending (No Access)</option>
              <option value="EVALUATOR">Evaluator</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="bg-neutral-50 border border-neutral-200 rounded p-3 text-xs text-neutral-600">
            <div class="font-semibold mb-1">Role Permissions:</div>
            <ul class="space-y-0.5">
              <li><span class="font-medium">Evaluator:</span> Assessment forms, student assignments</li>
              <li><span class="font-medium">Coordinator:</span> Assignment management, scheduling</li>
              <li><span class="font-medium">Admin:</span> Full system access, user management</li>
            </ul>
          </div>
        </div>
        <div class="flex items-center justify-between p-6 border-t border-neutral-200">
          <button
            class="px-4 py-2 text-sm font-semibold text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
            @click="showAddModal = false"
          >
            CANCEL
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
            :disabled="!canCreateUser || isCreating"
            @click="createUser"
          >
            {{ isCreating ? 'CREATING...' : 'CREATE USER' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showEditModal = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div class="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 class="text-lg font-bold text-neutral-900 uppercase tracking-wide">Edit User</h2>
          <button class="text-red-500 hover:text-red-700 border border-red-300 rounded w-7 h-7 flex items-center justify-center" @click="showEditModal = false">
            &times;
          </button>
        </div>
        <div class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">Full Name *</label>
            <input
              v-model="editingUser.fullName"
              type="text"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">Email Address *</label>
            <input
              v-model="editingUser.email"
              type="email"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">User Role *</label>
            <select
              v-model="editingUser.role"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            >
              <option value="PENDING">Pending (No Access)</option>
              <option value="EVALUATOR">Evaluator</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div class="flex items-center justify-between p-6 border-t border-neutral-200">
          <button
            class="px-4 py-2 text-sm font-semibold text-neutral-700 border border-neutral-300 hover:bg-neutral-100 transition-colors"
            @click="showEditModal = false"
          >
            CANCEL
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-white bg-neutral-900 border border-neutral-900 hover:bg-neutral-800 transition-colors disabled:opacity-50"
            :disabled="!canEditUser || isEditing"
            @click="updateUser"
          >
            {{ isEditing ? 'SAVING...' : 'SAVE CHANGES' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Deactivate Confirmation Modal -->
    <div v-if="showDeactivateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showDeactivateModal = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-lg font-bold text-neutral-900 mb-2">Confirm Deactivation</h2>
          <p class="text-sm text-neutral-600">
            Are you sure you want to deactivate <strong>{{ deactivatingUser?.firstName }} {{ deactivatingUser?.lastName }}</strong>?
            They will no longer be able to access the system.
          </p>
        </div>
        <div class="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200">
          <button
            class="px-4 py-2 text-sm font-semibold text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
            @click="showDeactivateModal = false"
          >
            CANCEL
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 rounded hover:bg-red-700 transition-colors"
            @click="deactivateUser"
          >
            DEACTIVATE
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Deactivate Confirmation Modal -->
    <div v-if="showBulkDeactivateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showBulkDeactivateModal = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-lg font-bold text-neutral-900 mb-2">Bulk Deactivation</h2>
          <p class="text-sm text-neutral-600 mb-3">
            Are you sure you want to deactivate <strong>{{ bulkDeactivatableUsers.length }}</strong> user{{ bulkDeactivatableUsers.length !== 1 ? 's' : '' }}?
            They will no longer be able to access the system.
          </p>
          <div v-if="bulkDeactivatableUsers.length > 0" class="max-h-40 overflow-y-auto border border-neutral-200">
            <div
              v-for="u in bulkDeactivatableUsers"
              :key="u.id"
              class="px-3 py-2 text-sm text-neutral-700 border-b border-neutral-100 last:border-b-0"
            >
              {{ u.firstName }} {{ u.lastName }} <span class="text-neutral-400">({{ u.email }})</span>
            </div>
          </div>
          <p v-if="bulkSkippedCount > 0" class="text-xs text-neutral-500 mt-2">
            {{ bulkSkippedCount }} user{{ bulkSkippedCount !== 1 ? 's' : '' }} skipped (already inactive or is yourself)
          </p>
        </div>
        <div class="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200">
          <button
            class="px-4 py-2 text-sm font-semibold text-neutral-700 border border-neutral-300 hover:bg-neutral-100 transition-colors"
            @click="showBulkDeactivateModal = false"
          >
            CANCEL
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-white bg-red-600 border border-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
            :disabled="bulkDeactivatableUsers.length === 0 || isBulkProcessing"
            @click="bulkDeactivate"
          >
            {{ isBulkProcessing ? 'DEACTIVATING...' : 'DEACTIVATE ALL' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Change Role Modal -->
    <div v-if="showBulkRoleModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" @click.self="showBulkRoleModal = false">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div class="p-6">
          <h2 class="text-lg font-bold text-neutral-900 mb-2">Bulk Change Role</h2>
          <p class="text-sm text-neutral-600 mb-3">
            Change role for <strong>{{ selectedUserIds.length }}</strong> selected user{{ selectedUserIds.length !== 1 ? 's' : '' }}:
          </p>
          <div class="max-h-32 overflow-y-auto border border-neutral-200 rounded-md mb-4">
            <div
              v-for="u in selectedUsers"
              :key="u.id"
              class="px-3 py-2 text-sm text-neutral-700 border-b border-neutral-100 last:border-b-0 flex items-center justify-between"
            >
              <span>{{ u.firstName }} {{ u.lastName }}</span>
              <span
                class="inline-block px-2 py-0.5 text-xs font-semibold rounded"
                :class="getRoleBadgeClass(u.roles[0])"
              >
                {{ u.roles[0] }}
              </span>
            </div>
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 uppercase tracking-wide mb-1">New Role</label>
            <select
              v-model="bulkNewRole"
              class="w-full px-3 py-2 border border-neutral-300 rounded focus:outline-none focus:ring-2 focus:ring-neutral-400 text-sm"
            >
              <option value="PENDING">Pending (No Access)</option>
              <option value="EVALUATOR">Evaluator</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div class="flex items-center justify-end space-x-3 p-6 border-t border-neutral-200">
          <button
            class="px-4 py-2 text-sm font-semibold text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
            @click="showBulkRoleModal = false"
          >
            CANCEL
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
            :disabled="isBulkProcessing"
            @click="bulkChangeRole"
          >
            {{ isBulkProcessing ? 'SAVING...' : 'CHANGE ROLE' }}
          </button>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { api, ApiError } from '../../utils/api';
import NoCycleNotice from '../../components/ui/NoCycleNotice.vue';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import LoadingState from '../../components/ui/LoadingState.vue';
import ErrorState from '../../components/ui/ErrorState.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';
import { useToast } from '../../composables/useToast';

const authStore = useAuthStore();
const toast = useToast();

const currentUser = computed(() => authStore.user ? {
  firstName: authStore.user.firstName,
  lastName: authStore.user.lastName,
  email: authStore.user.email,
} : null);

interface UserItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  roles: string[];
  lastLoginAt: string | null;
  statusChangedAt: string | null;
}

const users = ref<UserItem[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);
const noCycle = ref(false);

const userColumns: DataTableColumn<UserItem>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    searchable: true,
    value: (row) => `${row.firstName} ${row.lastName}`.trim(),
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    searchable: true,
    value: (row) => row.email,
  },
  {
    key: 'roles',
    header: 'Role',
    sortable: true,
    searchable: true,
    value: (row) => row.roles.join(', '),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    searchable: true,
    value: (row) => (row.isActive ? 'ACTIVE' : 'INACTIVE'),
  },
  {
    key: 'lastLogin',
    header: 'Last Login',
    sortable: true,
    searchable: false,
    value: (row) => row.lastLoginAt || '',
  },
  {
    key: 'statusChanged',
    header: 'Last Status Change',
    sortable: true,
    searchable: false,
    value: (row) => row.statusChangedAt || '',
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    searchable: false,
    value: () => '',
  },
];

function asUser(row: unknown): UserItem {
  return row as UserItem;
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).replace(',', '');
}

const userStats = computed(() => {
  const all = users.value;
  return {
    total: all.length,
    admins: all.filter(u => u.roles.includes('ADMIN')).length,
    coordinators: all.filter(u => u.roles.includes('COORDINATOR')).length,
    evaluators: all.filter(u => u.roles.includes('EVALUATOR')).length,
  };
});

// Add User Modal
const showAddModal = ref(false);
const isCreating = ref(false);
const newUser = ref({ fullName: '', email: '', role: 'EVALUATOR' });

const canCreateUser = computed(() => {
  return newUser.value.fullName.trim() !== '' && newUser.value.email.trim() !== '';
});

// Edit User Modal
const showEditModal = ref(false);
const isEditing = ref(false);
const editingUserId = ref<number | null>(null);
const editingUser = ref({ fullName: '', email: '', role: 'EVALUATOR' });

const canEditUser = computed(() => {
  return editingUser.value.fullName.trim() !== '' && editingUser.value.email.trim() !== '';
});

// Row selection
const selectedUserIds = ref<(string | number)[]>([]);

// Deactivate Modal
const showDeactivateModal = ref(false);
const deactivatingUser = ref<UserItem | null>(null);

// Bulk modals
const showBulkDeactivateModal = ref(false);
const showBulkRoleModal = ref(false);
const bulkNewRole = ref('EVALUATOR');
const isBulkProcessing = ref(false);

const selectedUsers = computed(() =>
  users.value.filter((u) => selectedUserIds.value.includes(u.id)),
);

const bulkDeactivatableUsers = computed(() =>
  selectedUsers.value.filter((u) => u.isActive && u.id !== authStore.user?.id),
);

const bulkSkippedCount = computed(() =>
  selectedUsers.value.length - bulkDeactivatableUsers.value.length,
);

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-700';
    case 'COORDINATOR':
      return 'bg-green-100 text-green-700 border';
    case 'EVALUATOR':
      return 'bg-blue-100 text-blue-700 border';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700 border';
    default:
      return 'bg-neutral-100 text-neutral-700 border';
  }
}

async function fetchUsers() {
  isLoading.value = true;
  error.value = null;
  try {
    users.value = await api.get<UserItem[]>('/admin/users');
  } catch (err) {
    if (err instanceof ApiError && err.code === 'CYCLE_NOT_APPROVED') {
      noCycle.value = true;
    } else {
      error.value = err instanceof Error ? err.message : 'Unknown error';
    }
  } finally {
    isLoading.value = false;
  }
}

async function createUser() {
  isCreating.value = true;
  try {
    const nameParts = newUser.value.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    await api.post('/admin/users', {
        firstName,
        lastName,
        email: newUser.value.email.trim(),
        role: newUser.value.role,
    });
    showAddModal.value = false;
    newUser.value = { fullName: '', email: '', role: 'EVALUATOR' };
    await fetchUsers();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create user');
  } finally {
    isCreating.value = false;
  }
}

function openEditModal(user: UserItem) {
  editingUserId.value = user.id;
  editingUser.value = {
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    role: user.roles[0] || 'EVALUATOR',
  };
  showEditModal.value = true;
}

async function updateUser() {
  if (!editingUserId.value) return;
  isEditing.value = true;
  try {
    const nameParts = editingUser.value.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    await api.put(`/admin/users/${editingUserId.value}`, {
        firstName,
        lastName,
        email: editingUser.value.email.trim(),
        role: editingUser.value.role,
    });
    showEditModal.value = false;
    await fetchUsers();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update user');
  } finally {
    isEditing.value = false;
  }
}

function confirmDeactivate(user: UserItem) {
  deactivatingUser.value = user;
  showDeactivateModal.value = true;
}

async function deactivateUser() {
  if (!deactivatingUser.value) return;
  try {
    await api.patch(`/admin/users/${deactivatingUser.value.id}/deactivate`);
    showDeactivateModal.value = false;
    deactivatingUser.value = null;
    await fetchUsers();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to deactivate user');
  }
}

async function activateUser(user: UserItem) {
  try {
    await api.patch(`/admin/users/${user.id}/activate`);
    await fetchUsers();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to activate user');
  }
}

async function bulkDeactivate() {
  isBulkProcessing.value = true;
  try {
    const errors: string[] = [];
    for (const u of bulkDeactivatableUsers.value) {
      try {
        await api.patch(`/admin/users/${u.id}/deactivate`);
      } catch {
        errors.push(`${u.firstName} ${u.lastName}`);
      }
    }
    if (errors.length > 0) {
      toast.error(`Failed to deactivate: ${errors.join(', ')}`);
    }
    showBulkDeactivateModal.value = false;
    selectedUserIds.value = [];
    await fetchUsers();
  } finally {
    isBulkProcessing.value = false;
  }
}

async function bulkActivate() {
  isBulkProcessing.value = true;
  try {
    const toActivate = selectedUsers.value.filter((u) => !u.isActive);
    const errors: string[] = [];
    for (const u of toActivate) {
      try {
        await api.patch(`/admin/users/${u.id}/activate`);
      } catch {
        errors.push(`${u.firstName} ${u.lastName}`);
      }
    }
    if (errors.length > 0) {
      toast.error(`Failed to activate: ${errors.join(', ')}`);
    }
    selectedUserIds.value = [];
    await fetchUsers();
  } finally {
    isBulkProcessing.value = false;
  }
}

async function bulkChangeRole() {
  isBulkProcessing.value = true;
  try {
    const errors: string[] = [];
    for (const u of selectedUsers.value) {
      try {
        await api.put(`/admin/users/${u.id}`, {
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: bulkNewRole.value,
        });
      } catch {
        errors.push(`${u.firstName} ${u.lastName}`);
      }
    }
    if (errors.length > 0) {
      toast.error(`Failed to change role for: ${errors.join(', ')}`);
    }
    showBulkRoleModal.value = false;
    selectedUserIds.value = [];
    await fetchUsers();
  } finally {
    isBulkProcessing.value = false;
  }
}

onMounted(fetchUsers);
</script>
