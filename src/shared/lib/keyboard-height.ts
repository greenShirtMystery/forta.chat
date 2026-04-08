/**
 * Pure logic for computing effective keyboard height.
 * Extracted from App.vue for testability.
 *
 * With adjustNothing, the OS does NOT resize the WebView when the keyboard
 * opens — our CSS padding-bottom is the sole mechanism that lifts content.
 * This eliminates the "double-push" conflict that existed with adjustResize.
 */

export interface KeyboardHeightInput {
  isNativeEvent: boolean;
  nativeKbh: number;
  webKbh: number;
}

/**
 * Compute the effective keyboard height.
 *
 * - Native events (from WindowInsets via MainActivity.kt) are authoritative.
 * - For visualViewport events (web fallback), take the larger of web/native.
 */
export function computeKeyboardHeight(input: KeyboardHeightInput): number {
  if (input.isNativeEvent) return input.nativeKbh;
  return Math.max(input.webKbh, input.nativeKbh);
}

/**
 * Check whether a focused element should be excluded from the global
 * scrollIntoView handler. Elements with `data-keyboard-aware` manage
 * their own keyboard-related scrolling (e.g. chat message input).
 */
export function shouldScrollIntoView(target: HTMLElement): boolean {
  if (target.dataset?.keyboardAware !== undefined) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}
