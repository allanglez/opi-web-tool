<template>
  <AppShell :user="currentUser">
    <AdminSubNav />

    <div class="mt-8 mb-8 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-neutral-900">User Management</h1>
      <button
        class="px-4 py-2 bg-neutral-900 text-white text-sm font-semibold rounded border border-neutral-900 hover:bg-neutral-800 transition-colors"
        @click="showAddModal = true"
      >
        + Add New User
      </button>
    </div>

    <!-- Stats Cards -->
    <section class="mb-8">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard :value="userStats.total" label="Total Users" variant="default" />
        <StatCard :value="userStats.admins" label="Administrators" variant="red" />
        <StatCard :value="userStats.coordinators" label="Coordinators" variant="green" />
        <StatCard :value="userStats.evaluators" label="Evaluators" variant="red" />
      </div>
    </section>

    <!-- Loading State -->
    <LoadingState v-if="isLoading" />

    <!-- Error State -->
    <ErrorState v-else-if="error" :message="error" @retry="fetchUsers" />

    <!-- Users Table -->
    <BaseCard v-else>
      <h2 class="text-lg font-semibold text-neutral-900 mb-4">System Users</h2>
      <AppDataTable
        :data="users"
        :columns="userColumns"
        search-placeholder="Search users by name, email, role..."
        empty-text="No users found."
        :initial-page-size="10"
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

        <template #cell-actions="{ row }">
          <div class="flex space-x-2">
            <button
              class="px-3 py-1 text-xs font-semibold border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
              @click="openEditModal(asUser(row))"
            >
              EDIT
            </button>
            <button
              v-if="asUser(row).isActive && asUser(row).id !== authStore.user?.id"
              class="px-3 py-1 text-xs font-semibold border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
              @click="confirmDeactivate(asUser(row))"
            >
              DEACTIVATE
            </button>
            <button
              v-else-if="!asUser(row).isActive"
              class="px-3 py-1 text-xs font-semibold border border-green-300 text-green-600 rounded hover:bg-green-50 transition-colors"
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
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
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
              <option value="EVALUATOR">Evaluator</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </div>
        <div class="flex items-center justify-between p-6 border-t border-neutral-200">
          <button
            class="px-4 py-2 text-sm font-semibold text-neutral-700 border border-neutral-300 rounded hover:bg-neutral-100 transition-colors"
            @click="showEditModal = false"
          >
            CANCEL
          </button>
          <button
            class="px-4 py-2 text-sm font-semibold text-white bg-neutral-900 border border-neutral-900 rounded hover:bg-neutral-800 transition-colors disabled:opacity-50"
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
  </AppShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import AppShell from '../../components/layout/AppShell.vue';
import AdminSubNav from '../../components/layout/AdminSubNav.vue';
import BaseCard from '../../components/ui/BaseCard.vue';
import StatCard from '../../components/ui/StatCard.vue';
import LoadingState from '../../components/ui/LoadingState.vue';
import ErrorState from '../../components/ui/ErrorState.vue';
import AppDataTable from '../../components/ui/data-table/AppDataTable.vue';
import type { DataTableColumn } from '../../components/ui/data-table/types';

const API_BASE = '/api/v1';
const authStore = useAuthStore();

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
}

const users = ref<UserItem[]>([]);
const isLoading = ref(false);
const error = ref<string | null>(null);

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

// Deactivate Modal
const showDeactivateModal = ref(false);
const deactivatingUser = ref<UserItem | null>(null);

function getAuthHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authStore.user?.id) {
    headers['X-Mock-User-Id'] = String(authStore.user.id);
  }
  return headers;
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'bg-red-100 text-red-700 border border-red-300';
    case 'COORDINATOR':
      return 'bg-green-100 text-green-700 border border-green-300';
    case 'EVALUATOR':
      return 'bg-blue-100 text-blue-700 border border-blue-300';
    default:
      return 'bg-neutral-100 text-neutral-700 border border-neutral-300';
  }
}

async function fetchUsers() {
  isLoading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    users.value = await response.json();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
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

    const response = await fetch(`${API_BASE}/admin/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        firstName,
        lastName,
        email: newUser.value.email.trim(),
        role: newUser.value.role,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to create user');
    }
    showAddModal.value = false;
    newUser.value = { fullName: '', email: '', role: 'EVALUATOR' };
    await fetchUsers();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to create user');
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

    const response = await fetch(`${API_BASE}/admin/users/${editingUserId.value}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        firstName,
        lastName,
        email: editingUser.value.email.trim(),
        role: editingUser.value.role,
      }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to update user');
    }
    showEditModal.value = false;
    await fetchUsers();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to update user');
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
    const response = await fetch(`${API_BASE}/admin/users/${deactivatingUser.value.id}/deactivate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to deactivate user');
    showDeactivateModal.value = false;
    deactivatingUser.value = null;
    await fetchUsers();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to deactivate user');
  }
}

async function activateUser(user: UserItem) {
  try {
    const response = await fetch(`${API_BASE}/admin/users/${user.id}/activate`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to activate user');
    await fetchUsers();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to activate user');
  }
}

onMounted(fetchUsers);
</script>
