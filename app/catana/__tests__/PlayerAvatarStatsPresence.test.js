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
  it("renders a disconnect badge and countdown pill hooks", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("⚠️");
    expect(contents).toContain("Disconnected");
    expect(contents).toContain("presence?.remainingMs");
    expect(contents).not.toContain("bg-amber-100/95");
    expect(contents).toContain("bg-rose-");
  });

  it("uses dedicated disconnected seat pulse styles", () => {
    const contents = fs.readFileSync(stylesPath, "utf8");
    expect(contents).toContain("seat-disconnect-pulse");
    expect(contents).toContain("seat-disconnected-panel");
  });

  it("keeps the road and army panel flush and top-aligned with the avatar row", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain('className="flex items-start"');
    expect(contents).not.toContain("min-w-[5.5rem]");
    expect(contents).not.toContain("gap-2");
  });
});
