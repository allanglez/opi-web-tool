<template>
  <footer class="bg-yukon-navy text-white mt-auto">
    <div class="container mx-auto px-6 py-8">
      <div class="flex items-center justify-between">
        <!-- Logo and links -->
        <div class="flex items-center space-x-8">
          <div class="flex items-center space-x-2">
            <img 
              src="../../assets/branding/yukon-logo.svg" 
              alt="Yukon" 
              class="h-6 brightness-0 invert"
              @error="handleLogoError"
            />
            <span class="text-xl font-bold">Yukon</span>
          </div>
          <nav class="flex space-x-6 text-sm">
            <a href="#" class="hover:text-yukon-yellow transition-colors">Government of Yukon</a>
            <a href="#" class="hover:text-yukon-yellow transition-colors">Copyright</a>
            <a href="#" class="hover:text-yukon-yellow transition-colors">Disclaimer</a>
            <a href="#" class="hover:text-yukon-yellow transition-colors">Privacy Statement</a>
          </nav>
        </div>

        <!-- Wave graphic and copyright -->
        <div class="flex items-center space-x-4">
          <span class="text-sm">© {{ currentYear }} Government of Yukon</span>
          <img 
            src="../../assets/branding/yukon-waves-footer.svg" 
            alt="" 
            class="h-12"
            @error="handleWaveError"
          />
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
