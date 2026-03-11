# Paste & Drag-and-Drop Files in Chat

## Summary

Add Telegram-style clipboard paste (Cmd+V) and drag-and-drop support for sending files and images in chat. Both flows reuse the existing MediaPreview modal for images/video and direct sendFile() for other file types.

## Requirements

- **Cmd+V paste**: intercept paste events on the textarea, extract files from clipboard
- **Drag & drop**: accept files dragged from Finder/desktop onto the chat area
- **File classification**: images/video → MediaPreview modal; other files → direct send via sendFile()
- **Drop overlay**: semi-transparent overlay with icon and i18n text when dragging files over chat
- **Text paste preserved**: plain text Cmd+V must continue working normally

## Architecture

```
Cmd+V (paste) ──┐
                 ├──→ use-paste-drop.ts ──→ mediaUpload.addFiles()
Drag & Drop ────┘         │                      │
                          │                      ▼
                   (classification)        MediaPreview.vue (images/video)
                                                 │
                                           sendFile() (other files)
```

## New Files

### `src/features/messaging/model/use-paste-drop.ts`

Composable that handles both paste and drop events.

**API:**
```typescript
interface UsePasteDrop {
  isDragging: Ref<boolean>
  handlePaste: (event: ClipboardEvent) => void
  setupDragListeners: (element: Ref<HTMLElement | undefined>) => void
}

function usePasteDrop(options: {
  onMediaFiles: (files: File[]) => void   // images/video → MediaPreview
  onOtherFiles: (files: File[]) => void   // other files → sendFile()
}): UsePasteDrop
```

**Logic:**
- `handlePaste`: reads `event.clipboardData.files`, skips if empty (text paste)
- `setupDragListeners`: attaches dragenter/dragover/dragleave/drop on target element
- Classification: check `file.type.startsWith('image/') || file.type.startsWith('video/')` for media vs other
- Prevents default browser behavior for drag/drop
- Manages `isDragging` ref with dragenter/dragleave counter (nested element handling)

### `src/features/messaging/ui/DropOverlay.vue`

Visual overlay shown during drag-over.

**Props:**
```typescript
{ visible: boolean }
```

**Template:**
- `position: absolute` covering the chat area
- Semi-transparent background `rgba(0,0,0,0.5)`
- Centered icon (upload/cloud icon) + i18n text
- CSS transition `opacity 0.2s`
- `pointer-events: none` when hidden

## Modified Files

### `MessageInput.vue`

- Add `@paste="handlePaste"` to textarea
- Import and use `usePasteDrop` composable
- Connect `onMediaFiles` → `mediaUpload.addFiles()`
- Connect `onOtherFiles` → iterate and call `sendFile(file)` for each

### `ChatView.vue` (or equivalent chat wrapper)

- Add drag/drop zone wrapper with `setupDragListeners`
- Include `<DropOverlay :visible="isDragging" />`
- Pass `isDragging` from composable

## i18n Keys

```json
{
  "chat.dropOverlay.title": "Drop files here to send",
  "chat.dropOverlay.title_ru": "Перетащите файлы сюда"
}
```

## Edge Cases

- Multiple files pasted/dropped at once → all go through classification
- Paste event with both text and files → prefer files (prevent text insertion)
- Drag non-file content (text selection, URLs) → ignore, don't show overlay
- Drop outside overlay after dragenter → properly reset isDragging via counter
- Browser compatibility: Firefox clipboardData files may be empty for some paste types

## No Changes Needed

- `use-media-upload.ts` — `addFiles()` already accepts `File[]`
- `MediaPreview.vue` — already handles multiple files with thumbnails
- `use-messages.ts` — `sendFile()` already works for arbitrary files
- Message display — already renders images, videos, and file cards
