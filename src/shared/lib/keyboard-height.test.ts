import { describe, it, expect } from "vitest";
import { computeKeyboardHeight, shouldScrollIntoView } from "./keyboard-height";

describe("computeKeyboardHeight", () => {
  it("returns native kbh for native events", () => {
    expect(computeKeyboardHeight({ isNativeEvent: true, nativeKbh: 280, webKbh: 0 })).toBe(280);
  });

  it("returns native kbh=0 when keyboard closes via native event", () => {
    expect(computeKeyboardHeight({ isNativeEvent: true, nativeKbh: 0, webKbh: 100 })).toBe(0);
  });

  it("uses max(webKbh, nativeKbh) for non-native events", () => {
    expect(computeKeyboardHeight({ isNativeEvent: false, nativeKbh: 250, webKbh: 280 })).toBe(280);
    expect(computeKeyboardHeight({ isNativeEvent: false, nativeKbh: 300, webKbh: 280 })).toBe(300);
  });

  it("returns 0 when both values are 0", () => {
    expect(computeKeyboardHeight({ isNativeEvent: false, nativeKbh: 0, webKbh: 0 })).toBe(0);
  });

  it("handles negative webKbh gracefully (takes max with nativeKbh)", () => {
    // visualViewport can sometimes report height > innerHeight briefly
    expect(computeKeyboardHeight({ isNativeEvent: false, nativeKbh: 0, webKbh: -10 })).toBe(0);
  });
});

describe("shouldScrollIntoView", () => {
  it("returns true for plain INPUT", () => {
    const el = document.createElement("input");
    expect(shouldScrollIntoView(el)).toBe(true);
  });

  it("returns true for plain TEXTAREA", () => {
    const el = document.createElement("textarea");
    expect(shouldScrollIntoView(el)).toBe(true);
  });

  it("returns true for contentEditable div", () => {
    const el = document.createElement("div");
    el.contentEditable = "true";
    expect(shouldScrollIntoView(el)).toBe(true);
  });

  it("returns false for element with data-keyboard-aware", () => {
    const el = document.createElement("textarea");
    el.dataset.keyboardAware = "";
    expect(shouldScrollIntoView(el)).toBe(false);
  });

  it("returns false for non-input elements", () => {
    const el = document.createElement("div");
    expect(shouldScrollIntoView(el)).toBe(false);
  });
});
