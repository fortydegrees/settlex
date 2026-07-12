import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hashBoard } from "../analysis/symmetry.mjs";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { buildReport, inspectCandidate } from "../reports/buildReport.mjs";
import { renderBoardSvg } from "../reports/renderBoard.mjs";
import { summariseRecords } from "../reports/summary.mjs";

const paths = [];

afterEach(async () => Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

async function temporaryRunDir() {
  const runDir = await mkdtemp(join(tmpdir(), "duel-board-report-"));
  paths.push(runDir);
  await mkdir(join(runDir, "boards"), { recursive: true });
  return runDir;
}

describe("duel board reports", () => {
  it("summarises verdicts and rejection codes", () => {
    const summary = summariseRecords([
      { verdict: "pass", rejectionCodes: [], overallScore: 88 },
      { verdict: "reject", rejectionCodes: ["resource-monopoly"], overallScore: 41 },
      { verdict: "reject", rejectionCodes: ["resource-monopoly", "pick-sensitive"], overallScore: 27 }
    ]);

    expect(summary).toEqual({
      count: 3,
      verdicts: { pass: 1, reject: 2, invalid: 0 },
      rejectionCodes: { "resource-monopoly": 2, "pick-sensitive": 1 },
      score: { min: 27, max: 88, mean: 52 }
    });
  });

  it("renders a self-contained accessible SVG for one candidate", () => {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const svg = renderBoardSvg({
      tiles: candidate.tiles,
      record: { seed: 1, generatorFamily: "<official>", overallScore: 88, verdict: "pass" }
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain('role="img"');
    expect(svg).toContain("Seed 1");
    expect(svg).toContain("&lt;official&gt;");
    expect(svg).not.toContain("<official>");
    expect(svg.match(/<polygon/g)).toHaveLength(19);
  });

  it("builds grouped selected-board HTML without rendering unselected records", async () => {
    const runDir = await temporaryRunDir();
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 1 });
    const selectedRecord = {
      candidateIndex: 0,
      seed: 1,
      generatorFamily: "<script>alert(1)</script>",
      verdict: "pass",
      rejectionCodes: ["reason<&\""],
      overallScore: 80,
      boardHash: "altered"
    };
    const unselectedRecord = {
      candidateIndex: 1,
      seed: "UNSELECTED-SECRET",
      generatorFamily: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      verdict: "invalid",
      rejectionCodes: ["invalid-board"],
      overallScore: null,
      boardHash: null
    };
    await writeFile(
      join(runDir, "candidates.jsonl"),
      `${JSON.stringify(selectedRecord)}\n${JSON.stringify(unselectedRecord)}\n`
    );
    await writeFile(join(runDir, "boards", "selected.json"), JSON.stringify({
      selectionGroups: [
        "top",
        "bottom",
        "near-resource-monopoly",
        "disagreement",
        "adjacent-red-example"
      ],
      record: selectedRecord,
      diagnostic: null,
      tiles: candidate.tiles
    }));

    const { reportPath, summary } = await buildReport(runDir);
    const html = await readFile(reportPath, "utf8");
    const persistedSummary = JSON.parse(await readFile(join(runDir, "summary.json"), "utf8"));

    expect(summary).toEqual(persistedSummary);
    expect(summary.verdicts).toEqual({ pass: 1, reject: 0, invalid: 1 });
    expect(html).toContain("Top candidates");
    expect(html).toContain("Bottom candidates");
    expect(html).toContain("Threshold candidates");
    expect(html).toContain("Disagreement candidates");
    expect(html).toContain("Outliers");
    expect(html).toContain("Seed 1");
    expect(html).not.toContain("UNSELECTED-SECRET");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("reason&lt;&amp;&quot;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("rejects inspection hash drift before writing an inspection", async () => {
    const runDir = await temporaryRunDir();
    const record = {
      candidateIndex: 0,
      seed: 1,
      generatorFamily: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      verdict: "pass",
      rejectionCodes: [],
      overallScore: 80,
      boardHash: "altered"
    };
    await writeFile(join(runDir, "candidates.jsonl"), `${JSON.stringify(record)}\n`);

    await expect(inspectCandidate({ runDir, candidateIndex: 0 }))
      .rejects.toThrow("Candidate hash mismatch for index 0");
    await expect(readFile(join(runDir, "boards", "inspect-0.html"), "utf8"))
      .rejects.toMatchObject({ code: "ENOENT" });
  });

  it("regenerates and audits a matching candidate for inspection", async () => {
    const runDir = await temporaryRunDir();
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 3 });
    const record = {
      candidateIndex: 4,
      seed: 3,
      generatorFamily: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      verdict: "pass",
      rejectionCodes: [],
      overallScore: 80,
      boardHash: hashBoard(candidate.tiles)
    };
    await writeFile(join(runDir, "candidates.jsonl"), `${JSON.stringify(record)}\n`);

    const outputPath = await inspectCandidate({ runDir, candidateIndex: 4 });
    const html = await readFile(outputPath, "utf8");

    expect(outputPath).toBe(join(runDir, "boards", "inspect-4.html"));
    expect(html).toContain("Candidate inspection");
    expect(html).toContain("Order sensitivity audit");
    expect(html).toContain("Seed 3");
  });
});
