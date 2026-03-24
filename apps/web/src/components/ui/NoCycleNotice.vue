<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <div class="text-center max-w-lg">
      <div
        class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 text-yellow-600 mb-4"
      >
        <TriangleAlert class="w-8 h-8" />
      </div>
      <h2 class="text-2xl font-bold text-neutral-900 mb-2">No Active Cycle</h2>
      <p class="text-neutral-600 mb-6">
        There is no active assessment cycle at the moment. To get started, create
        a new cycle or seed data from the data warehouse.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
        <router-link
          to="/admin/cycle"
          class="px-5 py-2 text-sm font-semibold bg-yukon-navy text-white rounded hover:bg-[#122937] transition-colors"
        >
          Set Up New Cycle
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { TriangleAlert } from 'lucide-vue-next';
</script>
