import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateDuelBoardV3 } from "../analysis/evaluateDuelBoardV3.mjs";
import { BOARD_FAMILIES } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";
import { buildRankedReport } from "../reports/buildRankedReport.mjs";
import { inspectCandidateV3 } from "../reports/inspectCandidateV3.mjs";
import { renderBoardSvg } from "../reports/renderBoard.mjs";
import { runBatch } from "../lib/runBatch.mjs";

const paths = [];
afterEach(async () => Promise.all(paths.splice(0).map(
  (path) => rm(path, { recursive: true, force: true })
)));

async function reportFixture() {
  const runDir = await mkdtemp(join(tmpdir(), "duel-v3-report-"));
  paths.push(runDir);
  await mkdir(join(runDir, "boards"));
  const seeds = [47, 2604, 109];
  const boards = seeds.map((seed, candidateIndex) => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed });
    const diagnosticV3 = evaluateDuelBoardV3(candidate.tiles);
    const record = {
      candidateIndex,
      seed,
      generatorFamily: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      evaluatorVersion: "duel-fair-v3",
      status: "ranked",
      invalidCodes: [],
      overallScore: diagnosticV3.overallScore,
      scores: diagnosticV3.scores,
      tags: diagnosticV3.tags,
      canonicalSymmetryHash: `hash-${candidateIndex}`
    };
    return { record, diagnosticV3, tiles: candidate.tiles };
  });
  await writeFile(
    join(runDir, "candidates.jsonl"),
    `${boards.map(({ record }) => JSON.stringify(record)).join("\n")}\n`
  );
  await writeFile(join(runDir, "manifest.json"), JSON.stringify({
    status: "complete",
    summary: {
      peakRssMiB: 123.5,
      throughput: { evaluatedBoards: 3, elapsedSeconds: 0.03, boardsPerSecond: 100 }
    }
  }));
  await writeFile(join(runDir, "boards", "candidate-0.json"), JSON.stringify({
    ...boards[0],
    selectionReasons: ["overall-low", "interest-high"]
  }));
  await writeFile(join(runDir, "boards", "candidate-1.json"), JSON.stringify({
    ...boards[1],
    selectionReasons: ["overall-high", "fairness-high"]
  }));
  await writeFile(join(runDir, "boards", "candidate-1-duplicate.json"), JSON.stringify({
    ...boards[1],
    selectionReasons: ["quality-high"]
  }));
  await writeFile(join(runDir, "boards", "candidate-2.json"), JSON.stringify({
    ...boards[2],
    selectionReasons: ["quality-high"]
  }));
  return { runDir, boards };
}

describe("duel-fair-v3 ranked report", () => {
  it("renders one explicitly ordered sortable gallery with hidden placements", async () => {
    const { runDir, boards } = await reportFixture();
    const { reportPath, summary } = await buildRankedReport(runDir);
    const html = await readFile(reportPath, "utf8");
    const expected = [...boards].sort((left, right) =>
      right.record.overallScore - left.record.overallScore
        || left.record.candidateIndex - right.record.candidateIndex);

    expect(html.match(/<article class="board-card"/g)).toHaveLength(3);
    expect(html.indexOf(`data-candidate-index="${expected[0].record.candidateIndex}"`))
      .toBeLessThan(html.indexOf(`data-candidate-index="${expected[1].record.candidateIndex}"`));
    expect(html).toContain('id="sort-score"');
    expect(html).toContain('value="overall"');
    expect(html).toContain('value="fairness"');
    expect(html).toContain('value="quality"');
    expect(html).toContain('value="interest"');
    expect(html).toContain('id="sort-direction"');
    expect(html.match(/id="show-placements"/g)).toHaveLength(1);
    expect(html).toContain('.placement-overlay{display:none}');
    expect(html).toContain('body.show-placements .placement-overlay{display:inline}');
    expect(html).not.toContain("Top candidates");
    expect(html).not.toContain("Reject candidates");
    expect(summary.selectionReasons).toEqual({
      "fairness-high": 1,
      "interest-high": 1,
      "overall-high": 1,
      "overall-low": 1,
      "quality-high": 2
    });
    expect(summary.run).toEqual({
      peakRssMiB: 123.5,
      throughput: { evaluatedBoards: 3, elapsedSeconds: 0.03, boardsPerSecond: 100 }
    });
    expect(JSON.parse(await readFile(join(runDir, "summary.json"), "utf8")))
      .toEqual(summary);
  });

  it("uses stored v3 placement diagnostics without changing port rendering", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    const diagnosticV3 = evaluateDuelBoardV3(candidate.tiles);
    const svg = renderBoardSvg({
      tiles: candidate.tiles,
      record: { seed: 47, generatorFamily: "official-spiral", status: "ranked", overallScore: 40 },
      diagnosticV3
    });

    expect(svg.match(/data-port-resource=/g)).toHaveLength(9);
    expect(svg).toContain('<g class="placement-overlay" aria-hidden="true">');
    expect(svg.match(/data-placement-pick=/g)).toHaveLength(4);
  });
});

describe("duel-fair-v3 inspection", () => {
  it("returns the stored fast diagnostic without regenerating the board", async () => {
    const runDir = await mkdtemp(join(tmpdir(), "duel-v3-inspect-"));
    paths.push(runDir);
    await runBatch({
      runDir,
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      startSeed: 47,
      count: 1,
      shortlistSize: 1
    });

    const inspection = await inspectCandidateV3({ runDir, candidateIndex: 0 });

    expect(inspection.source).toBe("stored");
    expect(inspection.record.seed).toBe(47);
    expect(inspection.diagnosticV3.status).toBe("ranked");
    expect(inspection.exactV3).toBeNull();
  });

  it("runs the all-node solver only for an explicit exact inspection", async () => {
    const runDir = await mkdtemp(join(tmpdir(), "duel-v3-exact-inspect-"));
    paths.push(runDir);
    await runBatch({
      runDir,
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      startSeed: 47,
      count: 1,
      shortlistSize: 1
    });

    const inspection = await inspectCandidateV3({
      runDir,
      candidateIndex: 0,
      exact: true
    });

    expect(inspection.source).toBe("stored+exact");
    expect(inspection.exactV3.candidatePoolSize).toBe(54);
    expect(inspection.exactV3.selectedLine).toHaveLength(4);
    expect(inspection.exactV3.differences).toEqual({
      normalizedAdvantage: expect.any(Number),
      fairness: expect.any(Number)
    });
  }, 10_000);
});
