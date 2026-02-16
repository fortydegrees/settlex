import { describe, expect, it } from "vitest";
import { chooseActionWithExpectimax } from "../bots/pufferSearch.js";

function createFakeEnv() {
  return {
    state: { node: "root", gameOver: null },
    placementIndex: 0,
    placementStage: "settlement",
    pendingRoadBuilding: null,
    pendingRobberReturnMode: null,
    modeOverride: null,
    done: false,
    truncated: false,
    steps: 0,
    options: {
      includeActionMaskInObservation: true,
      maxSteps: 10,
    },
    _autoAdvanceForcedPhases() {},
    _getActorId() {
      return "0";
    },
    _getMode() {
      return "postRoll";
    },
    _decodeAction(actionId) {
      return actionId === 1 ? { type: "buildRoad" } : { type: "endTurn" };
    },
    _applyAction(actionId) {
      if (actionId === 1) {
        this.state.node = "after-good";
      } else {
        this.state.node = "after-bad";
      }
      return { ok: true };
    },
    _computeActionMask() {
      if (this.state.node === "root") {
        return [1, 1];
      }
      return [1, 0];
    },
    _buildBaseObservation() {
      return [
        this.state.node === "after-good" ? 1 : 0,
        this.state.node === "after-bad" ? 1 : 0,
      ];
    },
  };
}

describe("chooseActionWithExpectimax", () => {
  it("chooses the branch with higher evaluated value and restores env state", async () => {
    const env = createFakeEnv();
    const adapter = {
      env,
      actionMask: [1, 1],
      observation: [0, 0, 1, 1],
      spec: {
        observationSchemaHash: "test-obs",
        actionSpaceHash: "test-act",
      },
    };

    const policyClient = {
      async scoreActions({ observation }) {
        const base = observation.slice(0, 2);
        if (base[0] === 1) {
          return { logits: [0.0, -1.0], value: 0.75 };
        }
        if (base[1] === 1) {
          return { logits: [0.0, -1.0], value: -0.25 };
        }
        return { logits: [0.1, 0.2], value: 0.0 };
      },
    };

    const result = await chooseActionWithExpectimax({
      adapter,
      policyClient,
      playerID: "0",
      budgetMs: 200,
      topK: 2,
      maxDepth: 1,
    });

    expect(result?.actionId).toBe(1);
    expect(env.state.node).toBe("root");
    expect(env.steps).toBe(0);
  });
});
