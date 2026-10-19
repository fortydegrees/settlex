import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CreateGameReducer, getFilterPlayerView } from "boardgame.io/dist/cjs/internal.js";
import { createCatanGame } from "../../Game.js";
import placementReplay from "../../../../lib/server/__tests__/fixtures/placementReplay.json";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("placePiece wiring", () => {
  it("queues the real placement duration for every viewer", () => {
    const game = createCatanGame({ includeDebugMoves: false, includeEffects: true });
    const reducer = CreateGameReducer({ game, isClient: false });
    const filter = getFilterPlayerView(game);
    let state = structuredClone(placementReplay.initialState);
    const actions = placementReplay.log.filter(entry => entry.action.type === "MAKE_MOVE");
    for (const entry of actions.slice(0, 3)) state = reducer(state, entry.action);
    const event = state.plugins.effects.data.queue.find(event => event.type === "placePiece");
    expect(event).toEqual({
      t: 0, endT: 0.6399999999999999, type: "placePiece",
      payload: { pieceType: "settlement", id: 0, playerId: "0", initialPlacement: true }
    });
    for (const playerID of ["0", "1", null]) {
      const visible = filter(playerID, { type: "update", args: ["timing-match", state] }).args[1];
      expect(visible.plugins.effects.data.queue).toContainEqual(event);
    }
  });

  it("uses a board placement layer for placement effects", () => {
    const screen = read("../../GameScreen.js");
    const board = read("../../Board.js");
    expect(screen).toContain("placementLayerRef");
    expect(board).toContain("placementLayerRef");
  });

  it("wraps animated road so drop translates wrapper, not rotated element", () => {
    const source = read("../../effects/placePiece.js");
    expect(source).toContain("createRoadWrapper");
    expect(source).toContain("roadInnerEl");
  });

  it("keeps placed pieces visible during a tiny post-hold", () => {
    const source = read("../../effects/placePiece.js");
    expect(source).toContain("postHoldDuration");
  });

  it("emits piece-specific placement audio cues", () => {
    const source = read("../../effects/placePiece.js");
    expect(source).toContain("build:settlement");
    expect(source).toContain("build:road");
    expect(source).toContain("build:city");
  });

  it("supports optional viewport-top placement starts without changing the default drop", () => {
    const source = read("../../effects/placePiece.js");

    expect(source).toContain("function getPlacementStartYOffset");
    expect(source).toContain('payload?.startFrom === "viewport-top"');
    expect(source).toContain("layerEl.getBoundingClientRect?.()");
    expect(source).toContain("Math.min(-dropPx,");
    expect(source).toContain("const startYOffset = getPlacementStartYOffset({");
    expect(source).toContain("startYOffset");
    expect(source).toContain("y: startYOffset");
  });

  it("uses a remote-only lift/drop animation for city upgrades", () => {
    const source = read("../../effects/placePiece.js");
    const screen = read("../../GameScreen.js");

    expect(screen).toContain("getViewerPlayerId: () => playerID");
    expect(source).toContain("runCityUpgradeAnimation");
    expect(source).toContain("isRemoteCityUpgrade");
    expect(source).toContain('createSettlementEl({');
    expect(source).toContain("upgradeLiftDuration");
  });

  it("does not keep raster-specific settlement placement logic", () => {
    const source = read("../../effects/placePiece.js");
    expect(source).not.toContain("isRasterAssetPath");
    expect(source).not.toContain("RASTER_SETTLEMENT_SCALE");
    expect(source).not.toContain("RASTER_SETTLEMENT_Y_LIFT_PX");
  });
});
