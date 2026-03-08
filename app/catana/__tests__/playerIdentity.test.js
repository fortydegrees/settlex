import { describe, expect, it } from "vitest";
import { sanitizeDisplayName } from "../utils/playerIdentity";

describe("playerIdentity", () => {
  it("removes [BOT] prefix case-insensitively", () => {
    expect(sanitizeDisplayName("[BOT] Puffer 2")).toBe("Puffer 2");
    expect(sanitizeDisplayName("[bot] Puffer 3")).toBe("Puffer 3");
  });

  it("trims whitespace and keeps non-bot names", () => {
    expect(sanitizeDisplayName("  Alice  ")).toBe("Alice");
  });

  it("returns empty string for non-string values", () => {
    expect(sanitizeDisplayName(null)).toBe("");
    expect(sanitizeDisplayName(undefined)).toBe("");
  });
});
