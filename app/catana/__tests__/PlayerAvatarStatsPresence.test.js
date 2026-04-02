import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerAvatarStats.js"
);
const stylesPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerAvatarStats.css"
);

describe("PlayerAvatarStats disconnect presence", () => {
  it("renders a disconnect badge and danger countdown pill hooks", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("⚠️");
    expect(contents).toContain("Disconnected");
    expect(contents).toContain("presence?.remainingMs");
    expect(contents).toContain("bg-rose-100");
    expect(contents).toContain("text-rose-700");
    expect(contents).toContain("ring-rose-200");
    expect(contents).toContain("tabular-nums");
  });

  it("uses grayscale disconnect surface styles", () => {
    const contents = fs.readFileSync(stylesPath, "utf8");
    expect(contents).toContain("grayscale(");
    expect(contents).toContain("seat-disconnected-panel");
  });

  it("keeps the road and army panel flush and top-aligned with the avatar row", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("flex items-start");
    expect(contents).not.toContain("min-w-[5.5rem]");
    expect(contents).not.toContain("gap-2");
  });

  it("suppresses the thought bubble while disconnected and insets the warning icon", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("!isMe && !isDisconnected");
    expect(contents).toContain("bottom-1 right-1");
    expect(contents).not.toContain("drop-shadow-[0_1px_3px_rgba(255,255,255,0.95)]");
    expect(contents).not.toContain("translate-x-1/4 translate-y-1/4");
  });

  it("keeps disconnected stats surfaces on white-ring glass with a dedicated disconnected pulse hook", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("ring-white/60");
    expect(contents).toContain("seat-disconnected-pulse");
    expect(contents).not.toContain("animate-pulse");
  });

  it("keeps the vp bubble above the side stats box and centers a stable disconnect pill below the full seat cluster", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("z-10");
    expect(contents).toContain("top-full mt-2");
    expect(contents).toContain("left-1/2");
    expect(contents).toContain("min-w-[7rem]");
    expect(contents).toContain("text-[11px]");
    expect(contents).toContain("gap-0");
    expect(contents).not.toContain("left-10");
  });
});
