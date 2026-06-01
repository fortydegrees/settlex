import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "OpponentPlayerBox.js"
);

describe("OpponentPlayerBox", () => {
  it("does not limit visible stacks with maxVisible", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).not.toMatch(/maxVisible/);
  });

  it("animates card stack width changes", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("transition-[width]");
    expect(contents).toContain("motion-reduce:transition-none");
  });

  it("passes presence state into the avatar and shared seat-warning styling", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("presence={presence}");
    expect(contents).toContain('presence?.status === "idle"');
    expect(contents).toContain("seat-disconnected-pulse");
    expect(contents).not.toContain("animate-pulse");
  });

  it("supports a compact phone presentation without replacing the shared avatar stats", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("compact = false");
    expect(contents).toContain("scale-[0.78]");
    expect(contents).toContain("<PlayerAvatarStats");
  });

  it("top-aligns the opponent card stacks with taller disconnect status content", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("flex items-start");
  });

  it("mirrors over-limit danger state into opponent panel and avatar chrome", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain('resourceBadgeTone === "danger"');
    expect(contents).toContain("catana-hud-glass--danger");
    expect(contents).toContain("avatarClassName={dangerAvatarClassName}");
    expect(contents).toContain("ring-rose-300");
  });
});
