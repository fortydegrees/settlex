import { describe, expect, it } from "vitest";
import {
  mergePlayerMetadata,
  sanitizeDisplayName,
} from "../utils/playerIdentity";

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

  it("fills missing emoji/color metadata from fallback match metadata", () => {
    const merged = mergePlayerMetadata(
      [
        { id: "0", name: "Ada", isConnected: true },
        { id: "1", name: "Puffer 2", isConnected: true },
      ],
      [
        { id: "0", name: "Ada", data: { emoji: "🦊", color: "blue" } },
        { id: "1", name: "Puffer 2", data: { emoji: "🤖", color: "red" } },
      ]
    );

    expect(merged).toEqual([
      {
        id: "0",
        name: "Ada",
        isConnected: true,
        data: { emoji: "🦊", color: "blue" },
      },
      {
        id: "1",
        name: "Puffer 2",
        isConnected: true,
        data: { emoji: "🤖", color: "red" },
      },
    ]);
  });
});
