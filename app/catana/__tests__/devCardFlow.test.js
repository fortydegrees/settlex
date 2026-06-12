import { describe, expect, it } from "vitest";
import { ResourceType } from "@settlex/game-core";
import {
  DEV_CARD_CHOICE_STAGE,
  buildAutoYearOfPlentyPayload,
  getDevCardReturnStage,
  isChoiceDevCardType
} from "../moves/devCardFlow.js";

describe("dev-card flow helpers", () => {
  it("identifies forced choice cards and their return stage", () => {
    expect(DEV_CARD_CHOICE_STAGE).toBe("devCardChoice");
    expect(isChoiceDevCardType("yearOfPlenty")).toBe(true);
    expect(isChoiceDevCardType("monopoly")).toBe(true);
    expect(isChoiceDevCardType("roadBuilding")).toBe(false);
    expect(getDevCardReturnStage({ startedFromStage: "preRoll" })).toBe("preRoll");
    expect(getDevCardReturnStage({ startedFromStage: "postRoll" })).toBe(
      "postRoll"
    );
    expect(getDevCardReturnStage(null)).toBe("postRoll");
  });

  it("builds deterministic auto Year of Plenty payloads from finite bank resources", () => {
    const payload = buildAutoYearOfPlentyPayload(
      {
        ruleset: { bank: { finite: true } },
        bank: {
          resources: [
            ResourceType.WOOD,
            ResourceType.WOOD,
            ResourceType.BRICK,
            ResourceType.ORE
          ]
        }
      },
      { Shuffle: (items) => [...items].reverse() }
    );

    expect(payload).toEqual([ResourceType.ORE, ResourceType.BRICK]);
  });
});
