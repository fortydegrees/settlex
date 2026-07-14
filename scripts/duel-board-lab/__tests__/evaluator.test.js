import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { evaluateDuelBoard } from "../analysis/evaluateDuelBoard.mjs";
import { measureOpeningRoutes } from "../analysis/openingRoutes.mjs";

const readFixture = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), "utf8"));

const FIXTURE_FILES = [
  "scarce-but-fair.json",
  "wheat-monopoly.json",
  "dominant-settlement.json",
  "varied-openings.json",
  "first-pick-sensitive.json",
  "second-pick-sensitive.json"
];

describe("duel-fair-v1 evaluator", () => {
  it("pins reviewed scarce and monopoly boards as full payloads", () => {
    const scarce = readFixture("scarce-but-fair");
    const monopoly = readFixture("wheat-monopoly");
    expect(scarce.family).toBe("official-spiral");
    expect(scarce.seed).toBe(1503);
    expect(scarce.tiles).toHaveLength(28);
    expect(monopoly.seed).toBe(223);
    expect(monopoly.tiles).toHaveLength(28);
  });

  it("emits stable named metrics and a bounded sortable score", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const report = evaluateDuelBoard(candidate.tiles);
    expect(report.evaluatorVersion).toBe("duel-fair-v1");
    expect(report.verdict).toMatch(/pass|reject/);
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
    expect(report.metrics).toHaveProperty("competitiveSpotDepth");
    expect(report.metrics).toHaveProperty("resourceContestability");
    expect(report.metrics).toHaveProperty("openingRouteDepth");
    expect(report.metrics).toHaveProperty("pickSensitivity");
    expect(report.metrics.orderSensitivityAudit).toBeNull();
  });

  it("rejects adjacent red numbers before subjective ranking", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.FREEFORM_RANDOM, seed: 1 });
    const report = evaluateDuelBoard(candidate.tiles);
    expect(report.rejectionReasons).toContain("adjacent-red-numbers");
  });

  it("can add the diagnostic snake audit without changing the verdict", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const normal = evaluateDuelBoard(candidate.tiles);
    const audited = evaluateDuelBoard(candidate.tiles, { includeOrderAudit: true });
    expect(audited.verdict).toBe(normal.verdict);
    expect(audited.metrics.orderSensitivityAudit.picks.map((pick) => pick.player)).toEqual(["P1", "P2", "P2", "P1"]);
  });

  it("does not count many pairs through one dominant anchor as route depth", () => {
    const resourcePips = { Wood: 2, Brick: 2, Sheep: 2, Wheat: 2, Ore: 2 };
    const valuedNodes = [
      { nodeId: 1, totalPips: 10, generalScore: 12, resourcePips, blockedNodeIds: [1, 2] },
      { nodeId: 3, totalPips: 3, generalScore: 4, resourcePips, blockedNodeIds: [3] },
      { nodeId: 4, totalPips: 3, generalScore: 4, resourcePips, blockedNodeIds: [4] },
      { nodeId: 5, totalPips: 3, generalScore: 4, resourcePips, blockedNodeIds: [5] }
    ];
    const metrics = measureOpeningRoutes(
      { legalPairs: [[1, 3], [1, 4], [1, 5]] },
      valuedNodes,
      { competitivePairRatio: 0, routeSearchLimit: 32 }
    );
    expect(metrics.rawCompetitivePairCount).toBe(3);
    expect(metrics.distinctCompetitiveRouteCount).toBe(1);
    expect(metrics.hasCompatibleCompetitiveRouteSet).toBe(false);
  });

  for (const filename of FIXTURE_FILES) {
    it(`records the initial evaluator output for ${filename}`, async () => {
      const fixture = JSON.parse(await readFile(new URL(`../fixtures/${filename}`, import.meta.url), "utf8"));
      const report = evaluateDuelBoard(fixture.tiles, { includeOrderAudit: true });
      expect({
        verdict: report.verdict,
        rejectionReasons: report.rejectionReasons,
        overallScore: Number(report.overallScore.toFixed(4)),
        orderRatio: Number(report.metrics.orderSensitivityAudit.secondToFirstRatio.toFixed(4))
      }).toMatchSnapshot();
    });
  }
});
