import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  canKeepBuildAction,
  getBuildPickupPieceType,
  shouldResetPlayerAction
} from "../utils/playerAction";

const baseCtx = {
  phase: "main",
  currentPlayer: "0",
  activePlayers: { "0": "postRoll" }
};
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadScenarioState = (name) => {
  const scenarioPath = path.resolve(
    __dirname,
    "..",
    "scenarios",
    name
  );
  const raw = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
  return raw.state ?? raw.G ?? raw;
};

describe("shouldResetPlayerAction", () => {
  it("maps explicit build actions to dock pickup piece types", () => {
    expect(getBuildPickupPieceType("placeRoad")).toBe("road");
    expect(getBuildPickupPieceType("placeSettlement")).toBe("settlement");
    expect(getBuildPickupPieceType("placeCity")).toBe("city");
    expect(getBuildPickupPieceType("moveRobber")).toBe(null);
    expect(getBuildPickupPieceType(null)).toBe(null);
  });

  it("keeps placeRoad action while player can still build", () => {
    const scenario = loadScenarioState("new_dev_game.json");
    const core = structuredClone(scenario.core);
    core.playerStateById["0"].resources = [
      ...core.playerStateById["0"].resources,
      "Wood",
      "Brick"
    ];

    expect(
      shouldResetPlayerAction({
        playerAction: "placeRoad",
        playerID: "0",
        ctx: baseCtx,
        core,
        coreTopology: scenario.coreTopology,
        corePhase: "normal",
        isGameOver: false
      })
    ).toBe(false);
  });

  it("resets placeRoad action when turn passes to another player", () => {
    expect(
      shouldResetPlayerAction({
        playerAction: "placeRoad",
        playerID: "0",
        ctx: {
          phase: "main",
          currentPlayer: "1",
          activePlayers: { "1": "preRoll" }
        },
        core: null,
        coreTopology: null,
        corePhase: "normal",
        isGameOver: false
      })
    ).toBe(true);
  });

  it("resets placeCity action when stage is no longer postRoll", () => {
    expect(
      shouldResetPlayerAction({
        playerAction: "placeCity",
        playerID: "0",
        ctx: {
          phase: "main",
          currentPlayer: "0",
          activePlayers: { "0": "preRoll" }
        },
        core: null,
        coreTopology: null,
        corePhase: "normal",
        isGameOver: false
      })
    ).toBe(true);
  });

  it("resets placeRoad action when the build stops being legal", () => {
    const scenario = loadScenarioState("new_dev_game.json");

    expect(
      canKeepBuildAction({
        playerAction: "placeRoad",
        playerID: "0",
        core: scenario.core,
        coreTopology: scenario.coreTopology
      })
    ).toBe(false);

    expect(
      shouldResetPlayerAction({
        playerAction: "placeRoad",
        playerID: "0",
        ctx: baseCtx,
        core: scenario.core,
        coreTopology: scenario.coreTopology,
        corePhase: "normal",
        isGameOver: false
      })
    ).toBe(true);
  });
});
