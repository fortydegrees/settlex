import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateDuelBoardV3 } from "../analysis/evaluateDuelBoardV3.mjs";
import { transformTiles } from "../analysis/symmetry.mjs";
import { BOARD_FAMILIES } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

const officialBoard = (seed) => generateCandidate({
  family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
  seed
}).tiles;
const fixture = (name) => JSON.parse(readFileSync(
  new URL(`../fixtures/${name}.json`, import.meta.url),
  "utf8"
));

function scalarScores(report) {
  return {
    overallScore: report.overallScore,
    scores: report.scores,
    components: report.components
  };
}

describe("duel-fair-v3 evaluator", () => {
  it("gives every structurally valid board four finite scores", () => {
    const report = evaluateDuelBoardV3(officialBoard(47));

    expect(report.status).toBe("ranked");
    expect(report.evaluatorIdentity).toMatchObject({
      featureVersion: "duel-fair-v3-features-1",
      policyVersion: "duel-fair-v3",
      profileHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    });
    for (const score of [report.overallScore, ...Object.values(report.scores)]) {
      expect(Number.isFinite(score)).toBe(true);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
    expect(report.selectedLine.map(({ player }) => player)).toEqual(["P1", "P2", "P2", "P1"]);
    expect(report.choiceDiagnostics.candidatePoolSize).toBeLessThanOrEqual(20);
    expect(report.choiceDiagnostics.evaluatedSequenceCount).toBeGreaterThan(0);
  });

  it("does not mistake production depth for fairness on seed 47", () => {
    const seed47 = evaluateDuelBoardV3(officialBoard(47));
    const varied = evaluateDuelBoardV3(fixture("varied-openings").tiles);

    expect(seed47.overallScore).toBeLessThan(90);
    expect(seed47.scores.fairness).toBeLessThan(varied.scores.fairness);
  });

  it("keeps interest separate from the overall formula", () => {
    const report = evaluateDuelBoardV3(officialBoard(2604));

    expect(report.overallScore).toBeCloseTo(
      0.8 * report.scores.fairness + 0.2 * report.scores.quality,
      6
    );
  });

  it("returns null diagnostics only for structurally invalid boards", () => {
    const report = evaluateDuelBoardV3(officialBoard(47).slice(0, -1));

    expect(report.status).toBe("invalid");
    expect(report.invalidCodes.length).toBeGreaterThan(0);
    expect(report.overallScore).toBeNull();
    expect(report.scores).toBeNull();
    expect(report.selectedLine).toBeNull();
    expect(report.choiceDiagnostics).toBeNull();
  });

  it("is byte-stable for identical tiles and profile identity", () => {
    const tiles = officialBoard(2604);

    expect(JSON.stringify(evaluateDuelBoardV3(tiles)))
      .toBe(JSON.stringify(evaluateDuelBoardV3(tiles)));
  });

  it("preserves scalar scores under all board rotations and reflections", () => {
    const tiles = officialBoard(109);
    const expected = scalarScores(evaluateDuelBoardV3(tiles));

    for (let transformIndex = 0; transformIndex < 12; transformIndex += 1) {
      expect(scalarScores(evaluateDuelBoardV3(transformTiles(tiles, transformIndex))))
        .toEqual(expected);
    }
  });
});
