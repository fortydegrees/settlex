import { describe, expect, it } from "vitest";
import {
  buildSandboxAwardClaimPayload,
  buildSandboxDevCardPlayPayload,
  buildSandboxRobberMovePayload
} from "../dev/sandbox/effectPayloads";

describe("dev sandbox effect payloads", () => {
  it("builds road-building resolve payloads from sandbox details", () => {
    const payload = buildSandboxDevCardPlayPayload({
      playerId: "2",
      cardType: "roadBuilding",
      phase: "resolve",
      playerViewMap: {
        2: { roadsRemaining: 9 }
      }
    });

    expect(payload).toEqual({
      effectId: "dev-sandbox:roadBuilding:2",
      playerId: "2",
      cardType: "roadBuilding",
      phase: "resolve",
      startedFromStage: "postRoll",
      pendingRoads: 0,
      previousRoadsRemaining: 9,
      nextRoadsRemaining: 9
    });
  });

  it("builds monopoly transfer payloads from the viewer to the actor", () => {
    const payload = buildSandboxDevCardPlayPayload({
      playerId: "3",
      cardType: "monopoly",
      viewerPlayerId: "0"
    });

    expect(payload).toMatchObject({
      effectId: "dev-sandbox:monopoly:3",
      playerId: "3",
      cardType: "monopoly",
      phase: "start",
      resource: "Wood",
      totalTransferred: 2
    });
    expect(payload.transfers).toEqual([
      {
        fromPlayerId: "0",
        toPlayerId: "3",
        resource: "Wood",
        count: 2
      }
    ]);
  });

  it("falls back to knight payloads with award snapshots", () => {
    const payload = buildSandboxDevCardPlayPayload({
      fallbackPlayerId: "1",
      cardType: "unknown",
      playerViewMap: {
        1: { knightsPlayed: 2 }
      },
      largestArmyOwnerId: "0"
    });

    expect(payload).toEqual({
      effectId: "dev-sandbox:knight:1",
      playerId: "1",
      cardType: "knight",
      phase: "start",
      startedFromStage: "postRoll",
      previousKnightsPlayed: 2,
      nextKnightsPlayed: 3,
      previousLargestArmyOwnerId: "0",
      nextLargestArmyOwnerId: "0"
    });
  });

  it("builds robber move payloads with sandbox defaults", () => {
    expect(
      buildSandboxRobberMovePayload({
        detail: { fromTileId: 4, toTileId: 9 },
        fallbackActorId: "2"
      })
    ).toEqual({
      effectId: "dev-sandbox:robber-move:4:9",
      actorId: "2",
      fromTileId: 4,
      toTileId: 9,
      debugReplay: true,
      forced: true,
      hideSourceTile: true,
      hideDestinationTile: false
    });
  });

  it("builds award claim payloads with resolved player colors", () => {
    expect(
      buildSandboxAwardClaimPayload({
        detail: {
          awardType: "largestArmy",
          playerId: "1",
          previousOwnerId: "0"
        },
        effectiveColorByPlayerId: {
          1: "royal"
        }
      })
    ).toEqual({
      effectId: "dev-sandbox:award:largestArmy:1",
      awardType: "largestArmy",
      playerId: "1",
      previousOwnerId: "0",
      playerColorId: "royal",
      roadIds: [],
      debugReplay: true
    });
  });
});
