<template>
  <div class="min-h-screen flex items-center justify-center bg-neutral-100">
    <BaseCard class="w-full max-w-md text-center">
      <ErrorState
        title="Access Denied"
        message="You don't have permission to access this page. Please contact your administrator if you believe this is an error."
        :show-retry="false"
      />
      <button
        @click="goBack"
        class="mt-4 px-4 py-2 bg-yukon-navy text-white rounded hover:bg-yukon-teal transition-colors"
      >
        Go Back
      </button>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import BaseCard from '../components/ui/BaseCard.vue';
import ErrorState from '../components/ui/ErrorState.vue';

const router = useRouter();

const goBack = () => {
  router.back();
};
</script>
