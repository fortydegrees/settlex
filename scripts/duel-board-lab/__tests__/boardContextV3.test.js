import { ResourceType } from "@settlex/game-core";
import { describe, expect, it } from "vitest";
import { buildBoardContextV3, validateDuelBoardStructureV3 } from "../analysis/boardContextV3.mjs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { DUEL_FAIR_V3_PROFILE } from "../analysis/duelFairV3Profile.mjs";
import { BOARD_FAMILIES, DUEL_FAIR_V3_IDENTITY, EVALUATOR_VERSION } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

const officialBoard = (seed) => generateCandidate({
  family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
  seed
}).tiles;

describe("duel-fair-v3 board context", () => {
  it("makes scarce resources more valuable without exceeding the configured clamp", () => {
    const context = buildBoardContextV3(
      buildBoardFacts(officialBoard(47)),
      DUEL_FAIR_V3_PROFILE
    );
    const values = Object.values(context.byResource).map((entry) => entry.scarcityMultiplier);

    expect(Math.min(...values)).toBeGreaterThanOrEqual(0.8);
    expect(Math.max(...values)).toBeLessThanOrEqual(1.25);
    expect(context.byResource[ResourceType.ORE].tilePips).toBeGreaterThan(0);
  });

  it("records independent access, concentration, and port geography", () => {
    const context = buildBoardContextV3(
      buildBoardFacts(officialBoard(2604)),
      DUEL_FAIR_V3_PROFILE
    );

    for (const resource of Object.values(ResourceType).filter((value) => value !== ResourceType.ANY)) {
      const entry = context.byResource[resource];
      if (!entry) continue;
      expect(entry.concentration).toBeGreaterThanOrEqual(0);
      expect(entry.concentration).toBeLessThanOrEqual(1);
      expect(entry.accessRegionCount).toBeGreaterThan(0);
      expect(entry.matchingPortNodeIds).toHaveLength(2);
      expect(entry.genericPortNodeIds.length).toBeGreaterThan(0);
      if (entry.secondIndependentNodeId !== null) {
        expect(entry.independentAccessDistance).toBeGreaterThan(2);
      }
    }
  });

  it("reports structural failures but does not reject strategically unusual valid boards", () => {
    const facts = buildBoardFacts(officialBoard(47));

    expect(validateDuelBoardStructureV3(facts)).toEqual([]);
    expect(validateDuelBoardStructureV3({ ...facts, legalPairs: [] }))
      .toContain("no-legal-opening-draft");
  });

  it("uses the hashed v3 profile as the default evaluator identity", () => {
    expect(EVALUATOR_VERSION).toBe("duel-fair-v3");
    expect(DUEL_FAIR_V3_IDENTITY).toMatchObject({
      featureVersion: "duel-fair-v3-features-1",
      policyVersion: "duel-fair-v3"
    });
    expect(DUEL_FAIR_V3_IDENTITY.profileHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
