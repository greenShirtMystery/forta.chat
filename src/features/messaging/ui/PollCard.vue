<script setup lang="ts">
import { computed } from "vue";
import type { Message } from "@/entities/chat";

interface Props {
  message: Message;
  isOwn: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  vote: [optionId: string];
  end: [];
}>();

const poll = computed(() => props.message.pollInfo!);

const totalVotes = computed(() => {
  let total = 0;
  for (const voters of Object.values(poll.value.votes)) {
    total += voters.length;
  }
  return total;
});

const hasVoted = computed(() => !!poll.value.myVote);

const getVoteCount = (optionId: string): number => {
  return (poll.value.votes[optionId] ?? []).length;
};

const getPercentage = (optionId: string): number => {
  if (totalVotes.value === 0) return 0;
  return Math.round((getVoteCount(optionId) / totalVotes.value) * 100);
};

const handleVote = (optionId: string) => {
  if (poll.value.ended || poll.value.myVote) return;
  emit("vote", optionId);
};
</script>

<template>
  <div class="flex flex-col gap-2 py-1">
    <!-- Question -->
    <div class="text-sm font-semibold" :class="isOwn ? 'text-white' : 'text-text-color'">
      {{ poll.question }}
    </div>

    <!-- Options -->
    <div class="flex flex-col gap-1.5">
      <button
        v-for="option in poll.options"
        :key="option.id"
        class="relative overflow-hidden rounded-lg px-3 py-2 text-left text-sm transition-colors"
        :class="[
          poll.ended || hasVoted
            ? 'cursor-default'
            : isOwn
              ? 'hover:bg-white/15 cursor-pointer'
              : 'hover:bg-neutral-grad-0 cursor-pointer',
          isOwn ? 'bg-white/10' : 'bg-neutral-grad-0/60',
          poll.myVote === option.id ? (isOwn ? 'ring-1 ring-white/40' : 'ring-1 ring-color-bg-ac/40') : '',
        ]"
        :disabled="poll.ended || hasVoted"
        @click="handleVote(option.id)"
      >
        <!-- Progress bar (shown after voting or when ended) -->
        <div
          v-if="hasVoted || poll.ended"
          class="absolute inset-0 transition-all duration-300"
          :class="isOwn ? 'bg-white/15' : 'bg-color-bg-ac/10'"
          :style="{ width: `${getPercentage(option.id)}%` }"
        />
        <div class="relative flex items-center justify-between gap-2">
          <span :class="isOwn ? 'text-white' : 'text-text-color'">
            {{ option.text }}
          </span>
          <span
            v-if="hasVoted || poll.ended"
            class="shrink-0 text-xs font-medium"
            :class="isOwn ? 'text-white/70' : 'text-text-on-main-bg-color'"
          >
            {{ getPercentage(option.id) }}%
          </span>
        </div>
      </button>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-between">
      <span class="text-[11px]" :class="isOwn ? 'text-white/50' : 'text-text-on-main-bg-color'">
        {{ totalVotes }} vote{{ totalVotes !== 1 ? "s" : "" }}
        <template v-if="poll.ended"> &middot; Final results</template>
      </span>
      <button
        v-if="isOwn && !poll.ended"
        class="text-[11px] hover:underline"
        :class="isOwn ? 'text-white/70' : 'text-color-bg-ac'"
        @click.stop="emit('end')"
      >
        End poll
      </button>
    </div>
  </div>
</template>
