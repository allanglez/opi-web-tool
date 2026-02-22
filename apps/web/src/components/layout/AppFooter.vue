<template>
  <footer class="mt-auto bg-[#0f3f52] text-white">
    <div class="w-full max-w-[1280px] mx-auto px-6 md:px-8">
      <!-- Top row: logo + aurora waves -->
      <div class="flex items-center justify-between py-6 md:py-8">
        <img
          src="../../assets/branding/logo-white.svg"
          alt="Yukon"
          class="h-8 w-auto"
          @error="handleLogoError"
        />
        <img
          src="../../assets/branding/Aurora-main-full.svg"
          alt=""
          class="h-12 md:h-14 w-auto object-contain"
          @error="handleWaveError"
        />
      </div>

      <!-- Divider -->
      <div class="border-t border-white/20" />

      <!-- Bottom row: links + copyright -->
      <div class="flex flex-col gap-3 py-5 text-[11px] leading-5 text-white/80 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-col gap-0.5">
          <a href="#" class="hover:text-white transition-colors">Government of Yukon</a>
          <a href="#" class="hover:text-white transition-colors">Copyright</a>
          <a href="#" class="hover:text-white transition-colors">Disclaimer</a>
          <a href="#" class="hover:text-white transition-colors">Privacy Statement</a>
        </div>
        <span class="md:text-right">© {{ currentYear }} Government of Yukon</span>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const currentYear = computed(() => new Date().getFullYear());

const handleLogoError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};

const handleWaveError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};
</script>
