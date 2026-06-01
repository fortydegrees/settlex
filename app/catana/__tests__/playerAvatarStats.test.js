import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { getVpDisplay } from "../components/PlayerAvatarStatsUtils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const playerAvatarStatsPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerAvatarStats.js"
);

describe("getVpDisplay", () => {
  it("shows public points only for opponents", () => {
    expect(getVpDisplay({ publicPoints: 3, totalPoints: 5, isMe: false }))
      .toBe("3");
  });

  it("shows hidden points for local player", () => {
    expect(getVpDisplay({ publicPoints: 3, totalPoints: 5, isMe: true }))
      .toBe("3 (+2)");
  });

  it("allows the local badge to render from a frozen vp snapshot override", () => {
    const source = fs.readFileSync(playerAvatarStatsPath, "utf8");

    expect(source).toContain("vpDisplayOverride");
    expect(source).toContain("vpDisplayOverride?.publicPoints");
    expect(source).toContain("vpDisplayOverride?.totalPoints");
  });

  it("allows Knight count and Largest Army display to be temporarily overridden", () => {
    const source = fs.readFileSync(playerAvatarStatsPath, "utf8");

    expect(source).toContain("knightDisplayOverride");
    expect(source).toContain("knightDisplayOverride?.knightsPlayed");
    expect(source).toContain("knightDisplayOverride?.largestArmyOwnerId");
    expect(source).toContain("`p${player.id}-largest-army`");
  });

  it("renders the VP badge through the reusable animated count component", () => {
    const source = fs.readFileSync(playerAvatarStatsPath, "utf8");

    expect(source).toContain('import { AnimatedCount } from "./AnimatedCount";');
    expect(source).toContain("<AnimatedCount");
    expect(source).toContain("value={vpDisplay}");
    expect(source).toContain("motionValue={");
  });

  it("allows callers to add state-specific avatar chrome", () => {
    const source = fs.readFileSync(playerAvatarStatsPath, "utf8");

    expect(source).toContain('avatarClassName = ""');
    expect(source).toContain("${avatarClassName}");
  });
});
