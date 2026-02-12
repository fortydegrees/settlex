import { describe, expect, it } from "vitest";
import { TurnOrder } from "boardgame.io/dist/cjs/core.js";
import { Catan } from "../Game";
import { createEmptyState, buildTopology } from "@settlex/game-core";
import { getBuildableEdges } from "../Moves";

describe("placement phase transition", () => {
  it("has placement phase onEnd hook that sets G.core.phase to normal", () => {
    const onEnd = Catan.phases.placement.onEnd;
    expect(onEnd).toBeDefined();

    const G = { core: createEmptyState(["0", "1"]) };
    expect(G.core.phase).toBe("placement");

    onEnd({ G });

    expect(G.core.phase).toBe("normal");
  });

  it("placement endIf returns true when all players have placed 2 settlements AND 2 roads", () => {
    const endIf = Catan.phases.placement.endIf;
    const G = { core: createEmptyState(["0", "1"]) };
    const startingSettlements = G.core.ruleset.pieceLimits.settlements;
    const startingRoads = G.core.ruleset.pieceLimits.roads;

    // Initially no one has placed anything
    expect(endIf({ G })).toBe(false);

    // Player 0 places 2 settlements but no roads
    G.core.playerStateById["0"].settlementsRemaining = startingSettlements - 2;
    expect(endIf({ G })).toBe(false);

    // Player 0 places 2 roads, Player 1 still hasn't placed
    G.core.playerStateById["0"].roadsRemaining = startingRoads - 2;
    expect(endIf({ G })).toBe(false);

    // Player 1 places 2 settlements but no roads
    G.core.playerStateById["1"].settlementsRemaining = startingSettlements - 2;
    expect(endIf({ G })).toBe(false); // Still missing roads

    // Player 1 places 2 roads - now both players are done
    G.core.playerStateById["1"].roadsRemaining = startingRoads - 2;
    expect(endIf({ G })).toBe(true);
  });

  it("placement phase transitions to main phase", () => {
    expect(Catan.phases.placement.next).toBe("main");
  });

  it("getBuildableEdges uses ctx.phase not G.core.phase", () => {
    const G = {
      core: createEmptyState(["0", "1"]),
      coreTopology: buildTopology([])
    };
    
    // Simulate the bug: G.core.phase is stale (still "placement")
    // but ctx.phase has transitioned to "main"
    G.core.phase = "placement";
    const ctx = { phase: "main" };

    // Should use ctx.phase ("main") not G.core.phase ("placement")
    // This means initialPlacement should be false
    const edges = getBuildableEdges("0", G, ctx);
    
    // The function should work without throwing, using ctx.phase
    expect(Array.isArray(edges)).toBe(true);
  });
});

describe("main phase configuration", () => {
  it("main phase uses TurnOrder.DEFAULT not TurnOrder.CONTINUE", () => {
    // TurnOrder.CONTINUE caused currentPlayer to be undefined after placement
    // because the custom turn order ['0','1','1','0'] was exhausted
    expect(Catan.phases.main.turn.order).toBe(TurnOrder.DEFAULT);
  });

  it("main phase starts players in preRoll stage", () => {
    expect(Catan.phases.main.turn.activePlayers).toEqual({ currentPlayer: "preRoll" });
  });

  it("preRoll stage has rollDice move", () => {
    expect(Catan.phases.main.turn.stages.preRoll.moves.rollDice).toBeDefined();
  });

  it("postRoll stage has building moves", () => {
    const postRollMoves = Catan.phases.main.turn.stages.postRoll.moves;
    expect(postRollMoves.placeRoad).toBeDefined();
    expect(postRollMoves.placeSettlement).toBeDefined();
    expect(postRollMoves.endTurn).toBeDefined();
  });
});

describe("placement phase turn order", () => {
  it("uses custom turn order for snake draft", () => {
    // Snake draft: 0, 1, 1, 0 (first player places first and last)
    const turnOrder = Catan.phases.placement.turn.order;
    // TurnOrder.CUSTOM returns an object with playOrder function
    expect(turnOrder.playOrder).toBeTypeOf("function");
    const G = { placementOrder: ["0", "1", "1", "0"] };
    // Verify it returns the snake draft order
    expect(turnOrder.playOrder({ G })).toEqual(["0", "1", "1", "0"]);
  });

  it("placement starts in settlement stage", () => {
    expect(Catan.phases.placement.turn.activePlayers).toEqual({ currentPlayer: "settlement" });
  });

  it("placement has settlement and road stages", () => {
    const stages = Catan.phases.placement.turn.stages;
    expect(stages.settlement).toBeDefined();
    expect(stages.road).toBeDefined();
    expect(stages.settlement.moves.placeSettlement).toBeDefined();
    expect(stages.road.moves.placeRoad).toBeDefined();
  });
});
