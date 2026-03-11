# Paste & Drag-and-Drop Files Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Telegram-style Cmd+V paste and drag-and-drop file support to send images, videos, and files in chat.

**Architecture:** One new composable `use-paste-drop.ts` handles both paste and drop events, classifies files (media vs other), and routes them to existing `mediaUpload.addFiles()` or `sendFile()`. One new overlay component `DropOverlay.vue` shows visual feedback during drag. Changes to `MessageInput.vue` (paste handler) and `ChatWindow.vue` (drag zone + overlay).

**Tech Stack:** Vue 3 Composition API, TypeScript, existing `use-media-upload.ts` and `use-messages.ts`

---

### Task 1: Add i18n keys for drop overlay

**Files:**
- Modify: `src/shared/lib/i18n/locales/en.ts`
- Modify: `src/shared/lib/i18n/locales/ru.ts`

**Step 1: Add English translation keys**

In `src/shared/lib/i18n/locales/en.ts`, add after the `"media.captionAbove"` line:

```typescript
// ── Drop overlay ──
"drop.title": "Drop files here to send",
"drop.subtitle": "Images and videos will open in preview",
```

**Step 2: Add Russian translation keys**

In `src/shared/lib/i18n/locales/ru.ts`, add the same keys:

```typescript
// ── Drop overlay ──
"drop.title": "Перетащите файлы сюда",
"drop.subtitle": "Изображения и видео откроются в превью",
```

**Step 3: Commit**

```bash
git add src/shared/lib/i18n/locales/en.ts src/shared/lib/i18n/locales/ru.ts
git commit -m "feat: add i18n keys for file drop overlay"
```

---

### Task 2: Create `use-paste-drop.ts` composable

**Files:**
- Create: `src/features/messaging/model/use-paste-drop.ts`

**Step 1: Create the composable**

```typescript
import { ref, onUnmounted } from "vue";
import type { Ref } from "vue";

function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

export function usePasteDrop(options: {
  onMediaFiles: (files: File[]) => void;
  onOtherFiles: (files: File[]) => void;
}) {
  const isDragging = ref(false);
  let dragCounter = 0;

  const classifyAndRoute = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const media = files.filter(isMediaFile);
    const other = files.filter((f) => !isMediaFile(f));

    if (media.length > 0) options.onMediaFiles(media);
    if (other.length > 0) options.onOtherFiles(other);
  };

  const handlePaste = (event: ClipboardEvent) => {
    const files = event.clipboardData?.files;
    if (!files || files.length === 0) return;
    event.preventDefault();
    classifyAndRoute(files);
  };

  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    // Only show overlay for files, not text/html drags
    if (!event.dataTransfer?.types.includes("Files")) return;
    dragCounter++;
    isDragging.value = true;
  };

  const handleDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "copy";
    }
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      isDragging.value = false;
    }
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragCounter = 0;
    isDragging.value = false;
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    classifyAndRoute(files);
  };

  let dropTarget: HTMLElement | null = null;

  const setupDragListeners = (element: Ref<HTMLElement | undefined>) => {
    const attach = () => {
      const el = element.value;
      if (!el || el === dropTarget) return;
      cleanup();
      dropTarget = el;
      el.addEventListener("dragenter", handleDragEnter);
      el.addEventListener("dragover", handleDragOver);
      el.addEventListener("dragleave", handleDragLeave);
      el.addEventListener("drop", handleDrop);
    };

    const cleanup = () => {
      if (dropTarget) {
        dropTarget.removeEventListener("dragenter", handleDragEnter);
        dropTarget.removeEventListener("dragover", handleDragOver);
        dropTarget.removeEventListener("dragleave", handleDragLeave);
        dropTarget.removeEventListener("drop", handleDrop);
        dropTarget = null;
      }
    };

    // Watch for element availability
    const interval = setInterval(() => {
      if (element.value) {
        attach();
        clearInterval(interval);
      }
    }, 100);

    onUnmounted(() => {
      clearInterval(interval);
      cleanup();
    });

    return cleanup;
  };

  return { isDragging, handlePaste, setupDragListeners };
}
```

**Step 2: Commit**

```bash
git add src/features/messaging/model/use-paste-drop.ts
git commit -m "feat: add use-paste-drop composable for clipboard and drag-drop files"
```

---

### Task 3: Create `DropOverlay.vue` component

**Files:**
- Create: `src/features/messaging/ui/DropOverlay.vue`

**Step 1: Create the overlay component**

```vue
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
```

**Step 2: Commit**

```bash
git add src/features/messaging/ui/DropOverlay.vue
git commit -m "feat: add DropOverlay component for drag-and-drop visual feedback"
```

---

### Task 4: Wire paste handler into `MessageInput.vue`

**Files:**
- Modify: `src/features/messaging/ui/MessageInput.vue`

**Step 1: Import the composable**

Add import after the existing `useMediaUpload` import (line 10):

```typescript
import { usePasteDrop } from "../model/use-paste-drop";
```

**Step 2: Initialize the composable**

Add after `const mediaUpload = useMediaUpload();` (line 31):

```typescript
const pasteDrop = usePasteDrop({
  onMediaFiles: (files) => mediaUpload.addFiles(files),
  onOtherFiles: async (files) => {
    sending.value = true;
    try {
      for (const file of files) {
        await sendFile(file);
      }
    } finally {
      sending.value = false;
    }
  },
});
```

**Step 3: Add `@paste` handler to textarea**

On the textarea element (around line 419), add the paste handler:

Change:
```html
<textarea
  ref="textareaRef"
  v-model="text"
  ...
  @keydown="handleKeydown"
  @input="handleInput"
```

To:
```html
<textarea
  ref="textareaRef"
  v-model="text"
  ...
  @keydown="handleKeydown"
  @input="handleInput"
  @paste="pasteDrop.handlePaste"
```

**Step 4: Expose `isDragging` and `setupDragListeners` for parent**

Add `defineExpose` at the end of the script setup block (before `</script>`):

```typescript
defineExpose({
  pasteDrop,
});
```

**Step 5: Commit**

```bash
git add src/features/messaging/ui/MessageInput.vue
git commit -m "feat: wire paste handler into MessageInput for clipboard file support"
```

---

### Task 5: Wire drag-and-drop and overlay into `ChatWindow.vue`

**Files:**
- Modify: `src/widgets/chat-window/ChatWindow.vue`

**Step 1: Import DropOverlay and composable**

Add imports:

```typescript
import DropOverlay from "@/features/messaging/ui/DropOverlay.vue";
import { usePasteDrop } from "@/features/messaging/model/use-paste-drop";
import { useMediaUpload } from "@/features/messaging/model/use-media-upload";
```

**Step 2: Set up drag-and-drop zone**

Add after the existing refs (around line 87):

```typescript
const chatWindowRef = ref<HTMLElement>();
const mediaUploadForDrop = useMediaUpload();
const { sendFile: sendFileForDrop } = useMessages();

const pasteDrop = usePasteDrop({
  onMediaFiles: (files) => mediaUploadForDrop.addFiles(files),
  onOtherFiles: async (files) => {
    for (const file of files) {
      await sendFileForDrop(file);
    }
  },
});

pasteDrop.setupDragListeners(chatWindowRef);
```

Wait — this approach creates duplicate mediaUpload instances. Better approach: the composable should be shared. Since `MessageInput` already has `mediaUpload` and `sendFile`, we should pass the drag events from `ChatWindow` down.

**REVISED Step 2: Use a shared provide/inject approach**

Instead, add a `ref` for the drop zone in `ChatWindow.vue` and set up drag listeners using the same composable, but route files to the `MessageInput`'s existing mediaUpload.

Actually, simplest approach: set up drag handlers directly in ChatWindow, and use `provide/inject` to share the media upload and send functions.

**SIMPLEST approach: Move paste+drop to ChatWindow, MessageInput just has paste.**

Let me reconsider. The cleanest approach:

1. `MessageInput.vue` handles paste on the textarea (already done in Task 4)
2. `ChatWindow.vue` handles drag-and-drop on the entire chat area + shows the overlay
3. Both use the same `usePasteDrop` composable
4. `ChatWindow` needs access to `mediaUpload.addFiles()` and `sendFile()` — import `useMediaUpload` and `useMessages` directly (they're composables, Vue handles this)

**Revised Step 2:**

Add refs and composable setup in ChatWindow script:

```typescript
const chatWindowRef = ref<HTMLElement>();
const dropMediaUpload = useMediaUpload();
const { sendFile: dropSendFile } = useMessages();

const pasteDrop = usePasteDrop({
  onMediaFiles: (files) => dropMediaUpload.addFiles(files),
  onOtherFiles: async (files) => {
    for (const file of files) {
      await dropSendFile(file);
    }
  },
});

pasteDrop.setupDragListeners(chatWindowRef);
```

Add imports at the top:

```typescript
import DropOverlay from "@/features/messaging/ui/DropOverlay.vue";
import { usePasteDrop } from "@/features/messaging/model/use-paste-drop";
import { useMediaUpload } from "@/features/messaging/model/use-media-upload";
import { useMessages } from "@/features/messaging/model/use-messages";
```

**Step 3: Add ref and overlay to template**

On the root div (line 241), add the ref:

Change:
```html
<div class="flex h-full flex-col bg-background-total-theme" style="...">
```
To:
```html
<div ref="chatWindowRef" class="relative flex h-full flex-col bg-background-total-theme" style="...">
```

Add the `DropOverlay` and `MediaPreview` for drop right before the closing `</div>` of the root element (before line 455):

```html
<DropOverlay :visible="pasteDrop.isDragging.value" />

<!-- MediaPreview for drag-and-dropped media files -->
<MediaPreview
  :show="dropMediaUpload.files.value.length > 0"
  :files="dropMediaUpload.files.value"
  :active-index="dropMediaUpload.activeIndex.value"
  :caption="dropMediaUpload.caption.value"
  :caption-above="dropMediaUpload.captionAbove.value"
  :sending="dropMediaUpload.sending.value"
  @close="dropMediaUpload.clear()"
  @send="handleDropMediaSend"
  @update:active-index="dropMediaUpload.activeIndex.value = $event"
  @update:caption="dropMediaUpload.caption.value = $event"
  @update:caption-above="dropMediaUpload.captionAbove.value = $event"
  @remove-file="dropMediaUpload.removeFile($event)"
/>
```

Add the handler in script:

```typescript
const handleDropMediaSend = async () => {
  if (dropMediaUpload.files.value.length === 0) return;
  dropMediaUpload.sending.value = true;
  try {
    const files = dropMediaUpload.files.value;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isLast = i === files.length - 1;
      const captionOpts = isLast && dropMediaUpload.caption.value
        ? { caption: dropMediaUpload.caption.value, captionAbove: dropMediaUpload.captionAbove.value }
        : {};

      if (f.type === "image") {
        await dropSendImage(f.file, captionOpts);
      } else {
        await dropSendFile(f.file);
      }
    }
  } finally {
    dropMediaUpload.clear();
  }
};
```

Also add `sendImage` to the destructuring:

```typescript
const { sendFile: dropSendFile, sendImage: dropSendImage } = useMessages();
```

Add `MediaPreview` import:

```typescript
import MediaPreview from "@/features/messaging/ui/MediaPreview.vue";
```

**Step 4: Add `position: relative` to root**

Already done in Step 3 (added `relative` class to root div).

**Step 5: Commit**

```bash
git add src/widgets/chat-window/ChatWindow.vue
git commit -m "feat: add drag-and-drop file support with overlay to ChatWindow"
```

---

### Task 6: Export new modules from feature barrel

**Files:**
- Modify: `src/features/messaging/index.ts` (if it exists, add exports)

**Step 1: Check if barrel export exists and add new exports**

Add to `src/features/messaging/index.ts`:

```typescript
export { usePasteDrop } from "./model/use-paste-drop";
export { default as DropOverlay } from "./ui/DropOverlay.vue";
```

If the file doesn't exist or already re-exports everything, skip this step.

**Step 2: Commit**

```bash
git add src/features/messaging/index.ts
git commit -m "feat: export paste-drop composable and DropOverlay from messaging feature"
```

---

### Task 7: Manual testing & verification

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Test paste (Cmd+V)**

1. Copy an image from Finder (select file → Cmd+C)
2. Focus the chat textarea → Cmd+V
3. **Expected**: MediaPreview modal opens with the pasted image
4. Click Send → image is sent as a message

5. Copy a PDF file from Finder → Cmd+V
6. **Expected**: File is sent directly (no MediaPreview)

7. Copy text → Cmd+V
8. **Expected**: Normal text paste, no file behavior

**Step 3: Test drag & drop**

1. Drag an image from Finder over the chat window
2. **Expected**: Drop overlay appears ("Перетащите файлы сюда" / "Drop files here to send")
3. Drop the image
4. **Expected**: Overlay disappears, MediaPreview opens

5. Drag a non-media file
6. **Expected**: Overlay appears, on drop file is sent directly

7. Drag over → drag away (don't drop)
8. **Expected**: Overlay appears → disappears when cursor leaves

**Step 4: Test edge cases**

1. Paste multiple images at once
2. Drag multiple files at once (mix of images and PDFs)
3. Paste while in edit mode
4. Paste while replying

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: address paste/drop edge cases found during testing"
```

---

### Task 8: Team review

After implementation is complete, run the review team:

1. **Planner**: Review the diff and produce a verification checklist
2. **Reviewer**: Code review for style, architecture, conventions
3. **Regression Agent**: Check for regressions in existing file sending
4. **Tests Agent**: Propose test cases for the new composable
5. **Security/Perf Agent**: Check for XSS via pasted content, memory leaks on drag listeners
6. **UI/UX Reviewer**: Verify overlay design, animations, accessibility
