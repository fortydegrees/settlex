import { describe, it, expect } from "vitest";
import envModule from "../settlexEnv.cjs";

const { SettlexSelfPlayEnv } = envModule;

function findActionByLabel(env, label) {
  const spec = env.getSpec();
  const index = spec.actionLabels.indexOf(label);
  if (index === -1) {
    throw new Error(`Missing action label: ${label}`);
  }
  return index;
}

function findFirstRoadAction(state) {
  const index = state.actionMask.findIndex((value, i) => value === 1 && state.info?.actionLabelByIndex?.[i]?.startsWith("buildRoad:"));
  return index;
}

describe("SettlexSelfPlayEnv dev card actions", () => {
  it("exposes explicit dev-card action labels", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    const labels = env.getSpec().actionLabels;

    expect(labels).toContain("playDev:knight");
    expect(labels).toContain("playDev:roadBuilding");
    expect(labels).toContain("playDev:monopoly:Wood");
    expect(labels).toContain("playDev:yearOfPlenty:Wood+Brick");

    env.close();
  });

  it("plays knight then returns to preRoll after robber move", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    env.reset(31);

    const actorId = env.state.turn.currentPlayerId;
    env.state.phase = "normal";
    env.state.turn.phase = "preRoll";
    env.state.turn.hasRolled = false;
    env.state.playerStateById[actorId].devCards = ["knight"];
    env.state.playerStateById[actorId].devCardsBoughtThisTurn = [];

    const knightAction = findActionByLabel(env, "playDev:knight");
    const afterKnight = env.step(knightAction);

    expect(afterKnight.mode).toBe("robberMove");

    const robberAction = afterKnight.actionMask.findIndex((value) => value === 1);
    expect(robberAction).toBeGreaterThanOrEqual(0);

    const afterRobber = env.step(robberAction);
    expect(afterRobber.mode).toBe("preRoll");

    env.close();
  });

  it("plays year of plenty and grants resources", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    env.reset(41);

    const actorId = env.state.turn.currentPlayerId;
    env.state.phase = "normal";
    env.state.turn.phase = "postRoll";
    env.state.turn.hasRolled = true;
    env.state.playerStateById[actorId].devCards = ["yearOfPlenty"];
    env.state.playerStateById[actorId].devCardsBoughtThisTurn = [];

    const before = env.state.playerStateById[actorId].resources.length;
    const yopAction = findActionByLabel(env, "playDev:yearOfPlenty:Wood+Brick");
    const out = env.step(yopAction);

    const after = env.state.playerStateById[actorId].resources.length;
    expect(after).toBe(before + 2);
    expect(out.mode).toBe("postRoll");

    env.close();
  });

  it("plays road building and places free roads", () => {
    const env = new SettlexSelfPlayEnv({ numPlayers: 4, maxSteps: 800 });
    env.reset(51);

    const actorId = env.state.turn.currentPlayerId;
    env.state.phase = "normal";
    env.state.turn.phase = "postRoll";
    env.state.turn.hasRolled = true;
    env.state.playerStateById[actorId].resources = [];
    env.state.playerStateById[actorId].devCards = ["roadBuilding"];
    env.state.playerStateById[actorId].devCardsBoughtThisTurn = [];

    const nodeId = env.nodeIds[0];
    env.state.buildingsByNodeId[nodeId] = { ownerId: actorId, type: "settlement" };

    const rbAction = findActionByLabel(env, "playDev:roadBuilding");
    const afterStart = env.step(rbAction);
    expect(afterStart.mode).toBe("devRoadBuilding");

    const roadAction = afterStart.actionMask.findIndex((value, i) => {
      if (value !== 1) return false;
      const label = env.getSpec().actionLabels[i];
      return label.startsWith("buildRoad:");
    });
    expect(roadAction).toBeGreaterThanOrEqual(0);

    const beforeResources = env.state.playerStateById[actorId].resources.length;
    env.step(roadAction);
    const afterResources = env.state.playerStateById[actorId].resources.length;

    expect(afterResources).toBe(beforeResources);

    env.close();
  });
});
