import { describe, expect, it, vi } from "vitest";
import { ResourceType } from "@settlex/game-core";
import {
  buildKnightPlayPayload,
  buildMonopolyTransfers,
  emitPendingDevCardPlayResolved,
  hasMaskedOpponentResources,
  storePendingKnightPlayAnimation
} from "../moves/devCardPresentation.js";

describe("dev-card presentation helpers", () => {
  it("builds knight payloads with deterministic effect ids and award snapshots", () => {
    const payload = buildKnightPlayPayload({
      G: {
        core: {
          awards: { largestArmyOwnerId: "1" },
          playerStateById: {
            "0": { knightsPlayed: 3 }
          }
        }
      },
      ctx: { turn: 7 },
      playerId: "0",
      phase: "resolve",
      startedFromStage: "preRoll",
      previousKnightsPlayed: 2,
      previousLargestArmyOwnerId: null
    });

    expect(payload).toMatchObject({
      effectId: "devcard:knight:0:turn-7",
      playerId: "0",
      cardType: "knight",
      phase: "resolve",
      startedFromStage: "preRoll",
      previousKnightsPlayed: 2,
      nextKnightsPlayed: 3,
      previousLargestArmyOwnerId: null,
      nextLargestArmyOwnerId: "1"
    });
  });

  it("summarizes known monopoly transfers and detects masked opponent resources", () => {
    const core = {
      playerStateById: {
        "0": { resources: [] },
        "1": { resources: [ResourceType.WOOD, ResourceType.WOOD] },
        "2": { resources: [ResourceType.BRICK] },
        "3": { resources: ["hidden"] }
      }
    };

    expect(
      buildMonopolyTransfers(core, "0", ResourceType.WOOD)
    ).toEqual([
      {
        fromPlayerId: "1",
        toPlayerId: "0",
        resource: ResourceType.WOOD,
        count: 2
      }
    ]);
    expect(hasMaskedOpponentResources(core, "0")).toBe(true);
    expect(hasMaskedOpponentResources(core, "3")).toBe(false);
  });

  it("stores and resolves pending knight animation payloads", () => {
    const G = {
      core: {
        awards: { largestArmyOwnerId: "0" },
        playerStateById: {
          "0": { knightsPlayed: 3 }
        }
      }
    };
    const startPayload = {
      effectId: "devcard:knight:0:turn-3",
      playerId: "0",
      cardType: "knight",
      phase: "start",
      startedFromStage: "postRoll",
      previousKnightsPlayed: 2,
      previousLargestArmyOwnerId: "1"
    };
    const effects = { devCardPlayResolved: vi.fn() };

    storePendingKnightPlayAnimation(G, startPayload);
    expect(G.pendingDevCardPlayAnimation).toMatchObject({
      ...startPayload,
      phase: "pending"
    });

    emitPendingDevCardPlayResolved({
      G,
      ctx: { turn: 3 },
      effects
    });

    expect(effects.devCardPlayResolved).toHaveBeenCalledWith(
      expect.objectContaining({
        effectId: "devcard:knight:0:turn-3",
        phase: "resolve",
        nextKnightsPlayed: 3,
        previousLargestArmyOwnerId: "1",
        nextLargestArmyOwnerId: "0"
      })
    );
    expect(G.pendingDevCardPlayAnimation).toBe(null);
  });
});
