import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionContainerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);
const devCardDisplayPath = path.resolve(
  __dirname,
  "..",
  "components",
  "DevCardDisplay.js"
);

describe("PlayerActionContainer", () => {
  it("gates player hand badges behind a flag", () => {
    const contents = fs.readFileSync(actionContainerPath, "utf8");
    expect(contents).toMatch(/SHOW_PLAYER_HAND_BADGES/);
    expect(contents).toMatch(/showCountBadge/);
  });

  it("uses the white-ring danger disconnect styling for the player hand dock", () => {
    const contents = fs.readFileSync(actionContainerPath, "utf8");
    expect(contents).toContain('presence?.status === "idle"');
    expect(contents).toContain("ring-white/60");
    expect(contents).toContain("seat-disconnected-pulse");
    expect(contents).toContain("seat-disconnected-panel");
    expect(contents).not.toContain("animate-pulse");
  });

  it("colors build-action piece icons from the player's in-game color", () => {
    const contents = fs.readFileSync(actionContainerPath, "utf8");
    expect(contents).toContain('const pieceColor = player.color ?? "red"');
    expect(contents).toContain('getPieceSvgFile("road", pieceColor)');
    expect(contents).toContain('getPieceSvgFile("settlement", pieceColor)');
    expect(contents).toContain('getPieceSvgFile("city", pieceColor)');
    expect(contents).not.toContain('getPieceSvgFile("road", "red")');
    expect(contents).not.toContain('getPieceSvgFile("settlement", "red")');
    expect(contents).not.toContain('getPieceSvgFile("city", "red")');
  });
});

describe("DevCardDisplay", () => {
  it("defaults count badges to disabled", () => {
    const contents = fs.readFileSync(devCardDisplayPath, "utf8");
    expect(contents).toMatch(/showCountBadge\s*=\s*false/);
  });

  it("gates playable copies by count instead of type only", () => {
    const contents = fs.readFileSync(devCardDisplayPath, "utf8");
    expect(contents).toMatch(/playableCountsByType/);
    expect(contents).toMatch(/getPlayableDevCardGroups/);
  });

  it("can stay mounted as an empty destination shell during a reveal", () => {
    const contents = fs.readFileSync(devCardDisplayPath, "utf8");
    expect(contents).toMatch(/forceMount\s*=\s*false/);
    expect(contents).toMatch(/if\s*\(cards\.length\s*===\s*0\s*&&\s*!forceMount\)/);
  });

  it("does not rely on the legacy devcard-pop entry animation class", () => {
    const contents = fs.readFileSync(devCardDisplayPath, "utf8");
    expect(contents).not.toContain("devcard-pop");
  });
});
