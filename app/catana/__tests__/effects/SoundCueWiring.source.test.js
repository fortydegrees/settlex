import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

describe("family sound-cue wiring", () => {
  it("emits the award cue for the local player's claims only, without largest-army visuals", () => {
    const source = read("../../effects/GameEffects.js");

    expect(source).toContain('"awardClaimed"');
    expect(source).toContain('payload.awardType !== "largestArmy"');
    expect(source).toContain('String(payload.playerId) === String(playerID)');
    expect(source).toContain('"award:claim:army"');
    expect(source).toContain('"award:claim:road"');
  });

  it("emits awardClaimed effects for both award types from the move layer", () => {
    const source = read("../../moves/awardLogging.js");

    expect(source).toContain('awardType: "longestRoad"');
    expect(source).toContain('awardType: "largestArmy"');
  });

  it("emits resource:blocked when the robber blocks a paying tile", () => {
    const source = read("../../effects/GameEffects.js");

    expect(source).toContain("payload?.blockedTileIds?.length");
    expect(source).toContain('{ name: "resource:blocked" }');
  });

  it("emits turn:end on the local hand-off, never into game over", () => {
    const source = read("../../effects/GameEffects.js");

    expect(source).toContain('{ name: "turn:end" }');
    expect(source).toContain("const handedOff =");
    expect(source).toContain("String(prev.currentPlayerId) === String(playerID)");
    expect(source).toContain("!gameOverState");
  });

  it("emits discard:required once per forced-discard prompt in GameScreen", () => {
    const source = read("../../GameScreen.js");

    expect(source).toContain("discardCueActiveRef");
    expect(source).toContain('{ name: "discard:required" }');
    expect(source).toContain("needsToDiscard;");
  });

  it("renders a single LowTimerCue that escalates from timer:low to timer:critical", () => {
    const screen = read("../../GameScreen.js");
    const cue = read("../../components/LowTimerCue.js");

    expect(screen.match(/<LowTimerCue/g)).toHaveLength(1);
    expect(screen).toContain("gameStatus?.activePlayerId === player.id");
    expect(cue).toContain("useLiveTurnTimer");
    expect(cue).toContain("isLowTimerAlertActive");
    expect(cue).toContain('"timer:critical"');
    expect(cue).toContain('"timer:low"');
    expect(cue).toContain("lastSecondRef");
  });
});
