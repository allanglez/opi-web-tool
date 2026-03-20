<template>
  <div id="app">
    <router-view />
    <AppToast />
  </div>
</template>

<script setup lang="ts">
import AppToast from './components/ui/AppToast.vue';
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: white;
}
</style>
