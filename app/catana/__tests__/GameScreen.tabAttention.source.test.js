import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

const between = (source, start, end) => {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  return source.slice(startIndex, endIndex);
};

describe("GameScreen tab attention wiring", () => {
  it("requests turn attention only for the credentialed local human's actionable turn", () => {
    const source = read("app/catana/GameScreen.js");
    const gate = between(
      source,
      "const shouldRequestYourTurnAttention",
      "useEffect(() => {"
    );

    expect(source).toContain('import { tabAttention } from "./utils/tabAttention"');
    expect(gate).toContain("!isReplay");
    expect(gate).toContain("!isGameOver");
    expect(gate).toContain("Boolean(bgioProps.credentials)");
    expect(gate).toContain("bgioProps.ctx?.currentPlayer");
    expect(gate).toContain("rawGameStatus.activePlayerId");
    expect(gate).toContain('rawGameStatus.kind !== "pregame"');
    expect(gate).toContain('participantType !== "bot"');
  });

  it("releases turn attention on turn changes, game-over, and unmount while the controller restores visible metadata", () => {
    const source = read("app/catana/GameScreen.js");
    const effect = between(
      source,
      "useEffect(() => {\n    if (shouldRequestYourTurnAttention)",
      "latestPlayerViewMapRef.current"
    );

    expect(effect).toContain('tabAttention.request("your-turn")');
    expect(effect).toContain('tabAttention.release("your-turn")');
    expect(effect).toContain("return () => {");
    expect(effect).toContain("shouldRequestYourTurnAttention");
    expect(source).not.toContain("document.title");
    expect(source).not.toContain('addEventListener("visibilitychange"');
    expect(source).not.toContain('new Audio("/sounds/turn-start.mp3")');
  });
});

describe("match-found attention wiring", () => {
  it("requests match-found and attempts sound before navigating", () => {
    const source = read("app/catana/lobby/useLobbyHomeActions.js");
    const poll = between(
      source,
      "onMatchFound: () => {",
      "router.push(`/g/${searchState.matchID}`);"
    );

    const attentionIndex = poll.indexOf('tabAttention.request("match-found")');
    const soundIndex = poll.indexOf("onMatchFound?.()");

    expect(source).toContain('import { tabAttention } from "../utils/tabAttention"');
    expect(attentionIndex).toBeGreaterThan(-1);
    expect(soundIndex).toBeGreaterThan(attentionIndex);
  });

  it("plays the existing cue at most once, respects mute, and catches autoplay rejection", () => {
    const source = read("app/catana/home/HomeTableClient.js");
    const sound = between(
      source,
      "const useMatchFoundSound",
      "function HomeTableBoard"
    );

    expect(source).toContain("onMatchFound: playMatchFoundSound");
    expect(sound).toContain('"catana:audioMuted"');
    expect(sound).toContain('new window.Audio("/sounds/turn-start.mp3")');
    expect(sound).toContain("playback?.catch");
    expect(sound).toContain("matchFoundSoundPlayedRef.current");
  });
});
