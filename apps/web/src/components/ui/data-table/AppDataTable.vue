<template>
  <div class="space-y-3">
    <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div class="w-full md:max-w-sm">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
        />
      </div>

      <div class="flex items-center gap-3 text-sm text-neutral-600">
        <label class="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            v-model.number="pageSize"
            class="rounded-md border border-neutral-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-400"
          >
            <option v-for="option in pageSizeOptions" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <span>{{ filteredData.length }} result{{ filteredData.length === 1 ? '' : 's' }}</span>
      </div>
    </div>

    <div class="overflow-x-auto rounded-md border border-neutral-200">
      <table class="min-w-full divide-y divide-neutral-200">
        <thead class="bg-neutral-50">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              :class="[
                'px-4 py-3 text-xs font-medium uppercase tracking-wider text-neutral-500',
                alignmentClass(column.align),
                column.sortable ? 'cursor-pointer select-none hover:text-neutral-800' : '',
              ]"
              @click="column.sortable && toggleSort(column.key)"
            >
              <slot :name="`header-${column.key}`" :column="column">
                <span class="inline-flex items-center gap-1">
                  {{ column.header }}
                  <ArrowUpDown v-if="column.sortable && sortKey !== column.key" class="h-3.5 w-3.5" />
                  <ChevronUp v-if="column.sortable && sortKey === column.key && sortDirection === 'asc'" class="h-3.5 w-3.5" />
                  <ChevronDown v-if="column.sortable && sortKey === column.key && sortDirection === 'desc'" class="h-3.5 w-3.5" />
                </span>
              </slot>
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-neutral-200 bg-white">
          <tr v-if="pagedData.length === 0">
            <td :colspan="columns.length" class="px-4 py-8 text-center text-sm text-neutral-500">
              {{ emptyText }}
            </td>
          </tr>

          <tr v-for="(row, rowIndex) in pagedData" :key="getRowKey(row, rowIndex)" class="hover:bg-neutral-50">
            <td
              v-for="column in columns"
              :key="column.key"
              :class="['px-4 py-3 text-sm', alignmentClass(column.align)]"
            >
              <slot
                :name="`cell-${column.key}`"
                :row="row"
                :value="resolveValue(column, row)"
                :column="column"
                :row-index="rowIndex"
              >
                {{ resolveValue(column, row) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="flex flex-col gap-2 border-t border-neutral-200 pt-3 text-sm md:flex-row md:items-center md:justify-between">
      <p class="text-neutral-600">
        Page {{ currentPage }} of {{ totalPages }}
      </p>

      <div class="flex items-center gap-1">
        <button
          class="rounded border border-neutral-300 px-2 py-1 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="currentPage === 1"
          @click="goToPage(1)"
        >
          <ChevronsLeft class="h-4 w-4" />
        </button>
        <button
          class="rounded border border-neutral-300 px-2 py-1 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          class="rounded border border-neutral-300 px-2 py-1 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
        <button
          class="rounded border border-neutral-300 px-2 py-1 text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="currentPage === totalPages"
          @click="goToPage(totalPages)"
        >
          <ChevronsRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-vue-next';
import type { DataTableColumn, DataTablePrimitive } from './types';

const props = withDefaults(defineProps<{
  data: unknown[];
  columns: DataTableColumn<unknown>[];
  searchPlaceholder?: string;
  emptyText?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  rowKey?: string;
}>(), {
  searchPlaceholder: 'Search...',
  emptyText: 'No results found.',
  initialPageSize: 10,
  pageSizeOptions: () => [10, 20, 50, 100],
  rowKey: 'id',
});

const searchQuery = ref('');
const sortKey = ref<string | null>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');
const currentPage = ref(1);
const pageSize = ref(props.initialPageSize);

const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase());

const filteredData = computed(() => {
  if (!normalizedSearch.value) {
    return props.data;
  }

  const searchableColumns = props.columns.filter((column) => column.searchable !== false);
  if (searchableColumns.length === 0) {
    return props.data;
  }

  return props.data.filter((row) =>
    searchableColumns.some((column) => {
      const value = resolveValue(column, row);
      return String(value ?? '').toLowerCase().includes(normalizedSearch.value);
    }),
  );
});

const sortedData = computed(() => {
  if (!sortKey.value) {
    return filteredData.value;
  }

  const sortColumn = props.columns.find((column) => column.key === sortKey.value);
  if (!sortColumn) {
    return filteredData.value;
  }

  const sorted = [...filteredData.value].sort((a, b) => {
    const left = resolveSortValue(sortColumn, a);
    const right = resolveSortValue(sortColumn, b);
    return compareValues(left, right);
  });

  return sortDirection.value === 'asc' ? sorted : sorted.reverse();
});

const totalPages = computed(() => {
  const pages = Math.ceil(sortedData.value.length / pageSize.value);
  return Math.max(1, pages);
});

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return sortedData.value.slice(start, start + pageSize.value);
});

watch([() => props.data, normalizedSearch, pageSize], () => {
  currentPage.value = 1;
});

watch(totalPages, (pages) => {
  if (currentPage.value > pages) {
    currentPage.value = pages;
  }
});

function resolveValue(column: DataTableColumn<unknown>, row: unknown): DataTablePrimitive {
  return column.value(row);
}

function resolveSortValue(column: DataTableColumn<unknown>, row: unknown): DataTablePrimitive {
  if (column.sortValue) {
    return column.sortValue(row);
  }
  return resolveValue(column, row);
}

function compareValues(left: DataTablePrimitive, right: DataTablePrimitive): number {
  if (left == null && right == null) return 0;
  if (left == null) return -1;
  if (right == null) return 1;

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
}

function toggleSort(columnKey: string) {
  if (sortKey.value === columnKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    return;
  }

  sortKey.value = columnKey;
  sortDirection.value = 'asc';
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

function getRowKey(row: unknown, rowIndex: number): string | number {
  const key =
    typeof row === 'object' && row !== null
      ? (row as Record<string, unknown>)[props.rowKey]
      : undefined;
  if (typeof key === 'string' || typeof key === 'number') {
    return key;
  }
  return rowIndex;
}

function alignmentClass(align: DataTableColumn<unknown>['align']) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}
</script>
