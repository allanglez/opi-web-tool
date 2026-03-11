<template>
  <footer class="mt-auto border-t-4 border-[#f2b233] bg-[#0f3f52] text-white overflow-hidden">
    <div class="w-full max-w-[1280px] mx-auto px-6 md:px-8">
      <div class="relative flex items-center justify-between py-5 md:py-5">
        <img
          src="../../assets/branding/logo-white.svg"
          alt="Yukon"
          class="relative z-10 h-11 md:h-12 w-auto shrink-0"
          @error="handleLogoError"
        />
        <img
          src="../../assets/branding/Aurora-main-full.svg"
          alt=""
          class="pointer-events-none absolute -right-10 top-1/2 z-0 h-24 md:h-28 lg:h-32 w-auto max-w-none -translate-y-1/2 object-contain object-right"
          @error="handleWaveError"
        />
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const handleLogoError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};

const handleWaveError = (e: Event) => {
  (e.target as HTMLImageElement).style.display = 'none';
};
</script>
