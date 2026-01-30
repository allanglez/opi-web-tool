<template>
  <div 
    class="card p-6"
    :class="{ 'card-hover': hover }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
interface Props {
  hover?: boolean;
}

withDefaults(defineProps<Props>(), {
  hover: false,
});
</script>
