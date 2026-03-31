import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const getSource = () => readFileSync(resolve(__dirname, "../stores.ts"), "utf-8");

describe("registration poll", () => {
  it("should not have a hardcoded 5-minute timeout", () => {
    const source = getSource();
    expect(source).not.toContain("MAX_WAIT_MS");
    expect(source).not.toContain("5 * 60 * 1000");
  });

  it("should use setTimeout instead of setInterval for backoff", () => {
    const source = getSource();
    // The poll function should use setTimeout, not setInterval
    const pollSection = source.slice(
      source.indexOf("const startRegistrationPoll"),
      source.indexOf("const stopRegistrationPoll")
    );
    expect(pollSection).toContain("setTimeout");
    expect(pollSection).not.toContain("setInterval");
  });

  it("should use exponential backoff with 60s cap", () => {
    const source = getSource();
    const pollSection = source.slice(
      source.indexOf("const startRegistrationPoll"),
      source.indexOf("const stopRegistrationPoll")
    );
    expect(pollSection).toContain("Math.min");
    expect(pollSection).toContain("60000");
  });

  it("should use clearTimeout in stopRegistrationPoll", () => {
    const source = getSource();
    const stopSection = source.slice(
      source.indexOf("const stopRegistrationPoll"),
      source.indexOf("const stopRegistrationPoll") + 200
    );
    expect(stopSection).toContain("clearTimeout");
  });
});
