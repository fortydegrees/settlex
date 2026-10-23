import { describe, expect, it } from "vitest";
import { createReplaySessionState, replaySessionReducer } from "../_features/replay/replaySessionState";
import { buildReplayGameScreenProps } from "../_features/replay/replayGameScreenProps";
import { buildReplayTimeline } from "../_features/replay/replayTimeline";
import { formatLogEntry } from "../../lib/shared/gameText";

describe("replay information visibility", () => {
  it("reveals hands by default and preserves a hidden choice across navigation", () => {
    const initial = createReplaySessionState({ eventCount: 5 });
    expect(initial.revealAllHands).toBe(true);
    const hidden = replaySessionReducer(initial, { type: "setRevealAllHands", reveal: false });
    const seated = replaySessionReducer(hidden, { type: "setPerspective", perspectiveId: "1" });
    const sought = replaySessionReducer(seated, { type: "seek", eventIndex: 2 });
    const returned = replaySessionReducer(replaySessionReducer(sought, { type: "openResults" }), { type: "closeResults" });
    expect(returned).toMatchObject({ revealAllHands: false, perspectiveId: "1", eventIndex: 2 });
    expect(replaySessionReducer(returned, { type: "setRevealAllHands", reveal: true }).revealAllHands).toBe(true);
  });

  const entries = [
    { id: 1, type: "dev:buy", actorId: "0", data: { cardType: "knight" } },
    { id: 2, type: "robber:steal", actorId: "0", data: { victimId: "1", resource: "Ore" } },
  ];
  it.each([null, "0", "1", "2"])("reveals log outcomes independently of seat %s", (perspectiveId) => {
    const props = buildReplayGameScreenProps({ event: { state: {}, visibleLogEntries: entries }, perspectiveId });
    expect(props.replayRevealAllHands).toBe(true);
    expect(props.replayLogEntries[0].data.cardType).toBe("knight");
    expect(props.replayLogEntries[1].data.resource).toBe("Ore");
    expect(props.playerID).toBe(perspectiveId);
  });
  it.each([[null, undefined, undefined], ["0", "knight", "Ore"], ["1", undefined, "Ore"], ["2", undefined, undefined]])(
    "restores player visibility for seat %s when reveal is off", (perspectiveId, cardType, resource) => {
      const props = buildReplayGameScreenProps({ event: { state: {}, visibleLogEntries: entries }, perspectiveId, revealAllHands: false });
      expect(props.replayRevealAllHands).toBe(false);
      expect(props.replayLogEntries[0].data.cardType).toBe(cardType);
      expect(props.replayLogEntries[1].data.resource).toBe(resource);
      expect(entries[0].data.cardType).toBe("knight");
    }
  );
});

describe("replay purchase log", () => {
  const buy = { id: 1, type: "dev:buy", actorId: "0", data: {} };
  const frame = (index, cards, logs) => ({ index, state: { G: { core: { playerStateById: { "0": { devCards: cards } } }, gameLog: logs }, ctx: { turn: 1 } } });
  it.each([false, true])("recovers a draw at its purchase and retains it in later log rows (annotated %s)", (annotated) => {
    const frames = [frame(0, ["knight"], []), frame(1, ["knight", "knight"], [buy]), frame(2, ["knight", "knight"], [buy, { id: 2, type: "turn:end", actorId: "0", data: {} }])];
    if (annotated) frames.forEach(f => { f.annotation = { label: "Position", notes: [] }; });
    const timeline = buildReplayTimeline({ frames, getVictoryPointsForState: () => 0 });
    const purchase = timeline.events.find(e => e.logEntry?.type === "dev:buy");
    expect(purchase.visibleLogEntries[0].data.cardType).toBe("knight");
    expect(timeline.events.at(-1).visibleLogEntries[0].data.cardType).toBe("knight");
    expect(frames[1].state.G.gameLog[0].data).toEqual({});
    expect(formatLogEntry(purchase.visibleLogEntries[0])).toContainEqual({ kind: "devCard", cardType: "knight", label: "Knight" });
  });
  it.each([
    [["hidden"], ["hidden", "hidden"]],
    [["knight"], ["monopoly", "victoryPoint"]],
    [[], ["knight", "monopoly"]],
  ])("keeps ambiguous or unavailable purchase identities generic", (before, after) => {
    const timeline = buildReplayTimeline({ frames: [frame(0, before, []), frame(1, after, [buy])], getVictoryPointsForState: () => 0 });
    expect(timeline.events.at(-1).visibleLogEntries[0].data.cardType).toBeUndefined();
  });
});
