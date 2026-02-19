<template>
  <footer class="mt-auto bg-[#0f3f52] text-white">
    <div class="w-full max-w-[1280px] mx-auto px-4 md:px-6 py-5 md:py-6">
      <div class="flex flex-col gap-5 md:gap-4">
        <div class="flex items-end justify-between gap-6">
          <div class="flex items-center gap-2">
            <img
              src="../../assets/branding/yukon-logo.png"
              alt="Yukon"
              class="h-7 w-auto brightness-0 invert"
              @error="handleLogoError"
            />
          </div>

          <img
            src="../../assets/branding/yukon-waves.png"
            alt=""
            class="h-9 md:h-10 w-auto object-contain"
            @error="handleWaveError"
          />
        </div>

        <div class="flex flex-col gap-3 text-[11px] leading-4 text-white/90 md:flex-row md:items-end md:justify-between">
          <div class="flex flex-col gap-1">
            <a href="#" class="hover:text-yukon-yellow transition-colors">Government of Yukon</a>
            <a href="#" class="hover:text-yukon-yellow transition-colors">Copyright</a>
            <a href="#" class="hover:text-yukon-yellow transition-colors">Disclaimer</a>
            <a href="#" class="hover:text-yukon-yellow transition-colors">Privacy Statement</a>
          </div>

          <span class="md:text-right">© {{ currentYear }} Government of Yukon</span>
        </div>
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
