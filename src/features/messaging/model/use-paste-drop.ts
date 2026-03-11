import { ref, watch, onUnmounted } from "vue";
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
    const attach = (el: HTMLElement) => {
      if (el === dropTarget) return;
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

    watch(element, (el) => {
      if (el) attach(el);
      else cleanup();
    }, { immediate: true });

    onUnmounted(cleanup);
  };

  return { isDragging, handlePaste, setupDragListeners };
}
