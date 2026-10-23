import { canPlaceRobber, getRobberVictims } from "@settlex/game-core";
import { describe, expect, it } from "vitest";
import {
  SANDBOX_PRESETS,
  buildSandboxMatchMetadata,
  coerceViewerSeat,
  getSandboxPreset
} from "../presets";

describe("Dev sandbox presets", () => {
  it("exports the approved v1 preset ids", () => {
    expect(SANDBOX_PRESETS.map((preset) => preset.id)).toEqual([
      "default",
      "pre-roll",
      "post-roll",
      "settlement-placement",
      "road-placement",
      "robber-move",
      "trade-ready",
      "dev-card-ready",
      "game-over"
    ]);
  });

  it("coerces an invalid viewer seat to the first legal seat", () => {
    expect(coerceViewerSeat({ playerIds: ["0", "1"] }, "9")).toBe("0");
  });

  it("builds stable local match metadata from the preset player ids", () => {
    const preset = getSandboxPreset("default");
    const metadata = buildSandboxMatchMetadata(preset);

    expect(metadata).toHaveLength(preset.playerIds.length);
    expect(metadata[0]).toMatchObject({
      id: preset.playerIds[0],
      name: "Visitor 1"
    });
    expect(metadata.map((player) => player.id)).toEqual(preset.playerIds);
  });
});


it("provides a legal robber target with a nonempty victim hand for feed checks", () => {
  const G = getSandboxPreset("robber-move").devScenarioState;
  const playerId = G.core.turn.currentPlayerId;
  expect(G.tiles.some(({ tile }) =>
    canPlaceRobber(G.core, G.coreTopology, tile.id) &&
    getRobberVictims(G.core, G.coreTopology, tile.id, playerId).some((victimId) =>
      G.core.playerStateById[victimId].resources.length > 0
    )
  )).toBe(true);
});
