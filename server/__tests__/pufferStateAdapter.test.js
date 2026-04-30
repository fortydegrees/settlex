import { describe, expect, it } from "vitest";
import { makeDeterministicRng } from "@settlex/game-core";
import { Catan } from "../../app/catana/Game";
import { createPufferStateAdapter } from "../bots/pufferStateAdapter";

function createRandomStub() {
  const number = makeDeterministicRng(456);
  return {
    Number: number,
    Shuffle: (items) => [...items],
    D6: (count) => Array.from({ length: count }, () => 1)
  };
}

function createBaseState({
  numPlayers = 2,
  phase = "placement",
  currentPlayer = "0",
  activePlayers = { "0": "settlement" },
  turn = 1
} = {}) {
  const setupCtx = { numPlayers, phase };
  const G = Catan.setup({ ctx: setupCtx, random: createRandomStub() }, {});
  const ctx = {
    numPlayers,
    phase,
    currentPlayer,
    activePlayers,
    turn
  };
  return { G, ctx, _stateID: 1 };
}

describe("createPufferStateAdapter", () => {
  it("builds observation + mask for the current actor", () => {
    const state = createBaseState();
    const adapter = createPufferStateAdapter(state);

    expect(adapter.actorId).toBe("0");
    expect(adapter.mode).toBe("placement_settlement");
    expect(adapter.actionMask.length).toBe(adapter.actionLabels.length);
    expect(adapter.observation.length).toBeGreaterThan(adapter.actionMask.length);
    expect(adapter.actionMask.some((v) => v === 1)).toBe(true);
  });

  it("maps monopoly dev-card actions to start+confirm move sequence", () => {
    const state = createBaseState({
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      turn: 5
    });
    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = "0";
    state.G.core.turn.phase = "postRoll";
    state.G.core.turn.hasRolled = true;
    state.G.core.playerStateById["0"].devCards.push("monopoly");
    state.G.core.playerStateById["0"].devCardsBoughtThisTurn = [];

    const adapter = createPufferStateAdapter(state);
    const monopolyActionId = adapter.actionLabels.findIndex((label, index) => {
      return label.startsWith("playDev:monopoly:") && adapter.actionMask[index] === 1;
    });

    expect(monopolyActionId).toBeGreaterThan(-1);

    const planned = adapter.mapActionToMoves(monopolyActionId);
    expect(planned).toEqual([
      { move: "playDevCardStart", args: ["monopoly"] },
      { move: "confirmDevCardPlay", args: ["Wood"] }
    ]);
  });

  it("maps road actions during road-building effect to placeRoadFromDevCard", () => {
    const state = createBaseState({
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "postRoll" },
      turn: 6
    });
    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = "0";
    state.G.core.turn.phase = "postRoll";
    state.G.core.turn.hasRolled = true;
    state.G.devCardPlay = { type: "roadBuilding", playerId: "0", pendingRoads: 1 };
    const seededEdge = [...state.G.coreTopology.edgeIds][0];
    state.G.core.roadsByEdgeId[seededEdge] = "0";
    state.G.core.playerStateById["0"].roadsRemaining -= 1;

    const adapter = createPufferStateAdapter(state);
    const roadActionId = adapter.actionLabels.findIndex((label, index) => {
      return label.startsWith("buildRoad:") && adapter.actionMask[index] === 1;
    });

    expect(adapter.mode).toBe("devRoadBuilding");
    expect(roadActionId).toBeGreaterThan(-1);

    const planned = adapter.mapActionToMoves(roadActionId);
    expect(planned).toHaveLength(1);
    expect(planned[0].move).toBe("placeRoadFromDevCard");
  });

  it("treats moveRobber stage as robberMove mode even if core turn phase is preRoll", () => {
    const state = createBaseState({
      phase: "main",
      currentPlayer: "1",
      activePlayers: { "1": "moveRobber" },
      turn: 7
    });
    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = "1";
    state.G.core.turn.phase = "preRoll";
    state.G.core.turn.hasRolled = false;
    state.G.robberReturnToStage = "preRoll";
    state.G.core.ruleset.friendlyRobber = { enabled: false, vpThreshold: 2 };

    const adapter = createPufferStateAdapter(state);
    const rollActionId = adapter.actionLabels.indexOf("roll");
    const legalRobberMoves = adapter.actionLabels.filter((label, index) => {
      return label.startsWith("moveRobber:") && adapter.actionMask[index] === 1;
    });

    expect(adapter.actorId).toBe("1");
    expect(adapter.mode).toBe("robberMove");
    expect(rollActionId).toBeGreaterThan(-1);
    expect(adapter.actionMask[rollActionId]).toBe(0);
    expect(legalRobberMoves.length).toBeGreaterThan(0);
  });

  it("keeps actor alignment on second placement even when ctx.turn is offset", () => {
    const state = createBaseState({
      phase: "placement",
      currentPlayer: "1",
      activePlayers: { "1": "settlement" },
      turn: 4
    });

    const startingSettlements = state.G.core.ruleset.pieceLimits.settlements;
    const startingRoads = state.G.core.ruleset.pieceLimits.roads;
    state.G.core.playerStateById["0"].settlementsRemaining = startingSettlements - 1;
    state.G.core.playerStateById["0"].roadsRemaining = startingRoads - 1;
    state.G.core.playerStateById["1"].settlementsRemaining = startingSettlements - 1;
    state.G.core.playerStateById["1"].roadsRemaining = startingRoads - 1;

    const adapter = createPufferStateAdapter(state);
    expect(adapter.mode).toBe("placement_settlement");
    expect(adapter.actorId).toBe("1");
  });

  it("exposes observation schema metadata for train/serve parity", () => {
    const state = createBaseState({
      phase: "main",
      currentPlayer: "0",
      activePlayers: { "0": "preRoll" },
      turn: 5
    });
    state.G.core.phase = "normal";
    state.G.core.turn.currentPlayerId = "0";
    state.G.core.turn.phase = "preRoll";
    state.G.core.turn.hasRolled = false;

    const adapter = createPufferStateAdapter(state);

    expect(adapter.spec).toBeTruthy();
    expect(adapter.spec.observationSchemaVersion).toBe("v2");
    expect(adapter.spec.observationLayout).toBeTruthy();
    expect(adapter.observation.length).toBe(adapter.spec.observationSize);
    expect(adapter.actionMask.length).toBe(adapter.spec.actionCount);
  });

  it("hydrates a mutable core clone for search simulation", () => {
    const state = createBaseState({
      phase: "placement",
      currentPlayer: "0",
      activePlayers: { "0": "settlement" },
      turn: 1
    });

    Object.freeze(state.G.core.roadsByEdgeId);
    Object.freeze(state.G.core);

    const adapter = createPufferStateAdapter(state);

    expect(adapter.env.state).not.toBe(state.G.core);
    expect(Object.isExtensible(adapter.env.state)).toBe(true);
    expect(Object.isExtensible(adapter.env.state.roadsByEdgeId)).toBe(true);
  });
});
