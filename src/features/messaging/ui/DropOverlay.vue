<script setup lang="ts">
import { useI18n } from "@/shared/lib/i18n";

defineProps<{
  visible: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <transition name="drop-overlay">
    <div
      v-if="visible"
      role="status"
      aria-live="polite"
      :aria-label="t('drop.title')"
      class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div class="flex flex-col items-center gap-3 rounded-2xl bg-background-total-theme/90 px-8 py-6 shadow-lg">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-color-bg-ac/15">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-color-bg-ac">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-base font-medium text-text-color">{{ t("drop.title") }}</p>
          <p class="mt-1 text-xs text-text-on-main-bg-color">{{ t("drop.subtitle") }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.drop-overlay-enter-active {
  transition: opacity 0.2s ease-out;
}
.drop-overlay-leave-active {
  transition: opacity 0.15s ease-in;
}
.drop-overlay-enter-from,
.drop-overlay-leave-to {
  opacity: 0;
}
</style>
