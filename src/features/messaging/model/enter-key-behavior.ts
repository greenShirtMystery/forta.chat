export interface EnterKeyContext {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  isMobile: boolean;
  isNative: boolean;
}

/**
 * Determines whether pressing Enter should send a message.
 *
 * Desktop / Electron: Enter = send, Shift+Enter = newline.
 * Mobile (native or narrow viewport): Enter = newline, send only via button.
 * During IME composition: never send (allows CJK / swipe confirm).
 */
export function shouldSendOnEnter(ctx: EnterKeyContext): boolean {
  if (ctx.key !== "Enter") return false;
  if (ctx.isComposing) return false;
  if (ctx.isNative || ctx.isMobile) return false;
  if (ctx.shiftKey) return false;
  return true;
}
