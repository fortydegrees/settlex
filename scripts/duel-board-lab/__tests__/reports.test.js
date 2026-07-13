import { TileTypes } from "@settlex/game-core";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import { evaluateDuelBoardV2 } from "../analysis/evaluateDuelBoardV2.mjs";
import { hashBoard } from "../analysis/symmetry.mjs";
import { BOARD_FAMILIES, generateCandidate } from "../generators/generateCandidate.mjs";
import { buildReport, inspectCandidate } from "../reports/buildReport.mjs";
import { renderBoardSvg } from "../reports/renderBoard.mjs";
import { summariseRecords } from "../reports/summary.mjs";

const paths = [];
const HEX_SIZE = 46;
const NODE_ANGLES = Object.freeze({
  NORTH: -90,
  NORTHEAST: -30,
  SOUTHEAST: 30,
  SOUTH: 90,
  SOUTHWEST: 150,
  NORTHWEST: 210
});

let cachedSeed47 = null;

function seed47Fixture() {
  if (cachedSeed47 === null) {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed: 47 });
    cachedSeed47 = {
      candidate,
      diagnosticV2: evaluateDuelBoardV2(candidate.tiles)
    };
  }
  return cachedSeed47;
}

function cubeToPixel([q, , r]) {
  return {
    x: Math.sqrt(3) * HEX_SIZE * (q + r / 2) + 250,
    y: 1.5 * HEX_SIZE * r + 210
  };
}

function expectedNodePositions(tiles) {
  const observations = new Map();
  for (const tile of tiles.filter(({ type }) => type === TileTypes.LAND)) {
    const centre = cubeToPixel(tile.coordinate);
    for (const [name, nodeId] of Object.entries(tile.tile.nodes ?? {})) {
      const radians = Math.PI / 180 * NODE_ANGLES[name];
      const points = observations.get(nodeId) ?? [];
      points.push({
        x: centre.x + HEX_SIZE * Math.cos(radians),
        y: centre.y + HEX_SIZE * Math.sin(radians)
      });
      observations.set(nodeId, points);
    }
  }
  return new Map([...observations].map(([nodeId, points]) => [nodeId, {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  }]));
}

function parseAttributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
  );
}

function elementsWithAttribute(markup, tagName, attribute) {
  const pattern = new RegExp(
    `<${tagName} ([^>]*${attribute}="[^"]*"[^>]*)>([\\s\\S]*?)<\\/${tagName}>`,
    "g"
  );
  return [...markup.matchAll(pattern)].map((match) => ({
    attributes: parseAttributes(match[1]),
    body: match[2]
  }));
}

function selfClosingTagAttributes(markup, tagName) {
  const match = markup.match(new RegExp(`<${tagName} ([^>]*)\\/>`));
  if (!match) throw new Error(`Missing ${tagName} tag`);
  return parseAttributes(match[1]);
}

function textTagContent(markup) {
  const match = markup.match(/<text [^>]*>([\s\S]*?)<\/text>/);
  if (!match) throw new Error("Missing text tag");
  return match[1];
}

function openingLine(nodeIds, firstPlayer = "P1") {
  const players = [firstPlayer, "P2", "P2", "P1"];
  return nodeIds.map((nodeId, index) => ({ player: players[index], nodeId }));
}

afterEach(async () => Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

async function temporaryRunDir() {
  const runDir = await mkdtemp(join(tmpdir(), "duel-board-report-"));
  paths.push(runDir);
  await mkdir(join(runDir, "boards"), { recursive: true });
  return runDir;
}

async function buildSingleBoardReport({ tiles, diagnosticV2, selectionGroups = ["top"] }) {
  const runDir = await temporaryRunDir();
  const record = {
    candidateIndex: 0,
    seed: 47,
    generatorFamily: BOARD_FAMILIES.OFFICIAL_SPIRAL,
    verdict: "pass",
    rejectionCodes: [],
    overallScore: 80,
    boardHash: hashBoard(tiles)
  };
  await writeFile(join(runDir, "candidates.jsonl"), `${JSON.stringify(record)}\n`);
  await writeFile(join(runDir, "boards", "selected.json"), JSON.stringify({
    selectionGroups,
    record,
    diagnosticV2,
    tiles
  }));
  const { reportPath } = await buildReport(runDir);
  return {
    html: await readFile(reportPath, "utf8"),
    reportPath,
    runDir
  };
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

  it("renders every port and solved placement at independently derived node coordinates", () => {
    const { candidate, diagnosticV2 } = seed47Fixture();
    const svg = renderBoardSvg({
      tiles: candidate.tiles,
      record: { seed: 47, generatorFamily: "official-spiral", overallScore: 80, verdict: "pass" },
      diagnosticV2
    });
    const nodePositions = expectedNodePositions(candidate.tiles);
    const expectedPorts = candidate.tiles.filter(({ type }) => type === TileTypes.PORT);
    const renderedPorts = elementsWithAttribute(svg, "g", "data-port-resource");
    const renderedPortsByNodeIds = new Map(renderedPorts.map((port) => [
      port.attributes["data-port-node-ids"],
      port
    ]));

    expect(renderedPorts).toHaveLength(9);
    expect(renderedPortsByNodeIds.size).toBe(9);
    for (const port of expectedPorts) {
      const nodeIds = Object.values(port.tile.nodes);
      const key = nodeIds.join(",");
      const rendered = renderedPortsByNodeIds.get(key);
      expect(rendered, `missing port ${key}`).toBeDefined();
      expect(rendered.attributes["data-port-resource"]).toBe(port.tile.resource);

      const [left, right] = nodeIds.map((nodeId) => nodePositions.get(nodeId));
      const midpoint = {
        x: (left.x + right.x) / 2,
        y: (left.y + right.y) / 2
      };
      const portCentre = cubeToPixel(port.coordinate);
      const expectedMarker = {
        x: midpoint.x + (portCentre.x - midpoint.x) * 0.55,
        y: midpoint.y + (portCentre.y - midpoint.y) * 0.55
      };
      const line = selfClosingTagAttributes(rendered.body, "line");
      const marker = selfClosingTagAttributes(rendered.body, "circle");
      expect(Number(line.x1)).toBeCloseTo(midpoint.x, 10);
      expect(Number(line.y1)).toBeCloseTo(midpoint.y, 10);
      expect(Number(line.x2)).toBeCloseTo(expectedMarker.x, 10);
      expect(Number(line.y2)).toBeCloseTo(expectedMarker.y, 10);
      expect(Number(marker.cx)).toBeCloseTo(expectedMarker.x, 10);
      expect(Number(marker.cy)).toBeCloseTo(expectedMarker.y, 10);
    }

    const renderedPlacements = elementsWithAttribute(svg, "g", "data-placement-pick")
      .sort((left, right) => (
        Number(left.attributes["data-placement-pick"])
          - Number(right.attributes["data-placement-pick"])
      ));
    expect(diagnosticV2.fairness.solvedLine.map(({ nodeId }) => nodeId)).toEqual([0, 6, 14, 44]);
    expect(diagnosticV2.fairness.solvedLine.map(({ player }) => player))
      .toEqual(["P1", "P2", "P2", "P1"]);
    expect(renderedPlacements).toHaveLength(4);
    for (const [index, rendered] of renderedPlacements.entries()) {
      const expectedPick = diagnosticV2.fairness.solvedLine[index];
      const expectedPoint = nodePositions.get(expectedPick.nodeId);
      const marker = selfClosingTagAttributes(rendered.body, "circle");
      expect(rendered.attributes["data-placement-pick"]).toBe(String(index + 1));
      expect(rendered.attributes["data-player"]).toBe(expectedPick.player);
      expect(Number(marker.cx)).toBeCloseTo(expectedPoint.x, 10);
      expect(Number(marker.cy)).toBeCloseTo(expectedPoint.y, 10);
      expect(textTagContent(rendered.body)).toBe(`${expectedPick.player} · ${index + 1}`);
    }

    expect(svg).not.toContain("Ports:");
  });

  it("escapes adversarial port resources and placement players in SVG attributes and text", () => {
    const { candidate, diagnosticV2 } = seed47Fixture();
    const portResource = '<port&">';
    const placementPlayer = '<player&">';
    let replacedPort = false;
    const tiles = candidate.tiles.map((tile) => {
      if (replacedPort || tile.type !== TileTypes.PORT) return tile;
      replacedPort = true;
      return { ...tile, tile: { ...tile.tile, resource: portResource } };
    });
    const adversarialDiagnostic = {
      ...diagnosticV2,
      fairness: {
        ...diagnosticV2.fairness,
        solvedLine: diagnosticV2.fairness.solvedLine.map((pick, index) => (
          index === 0 ? { ...pick, player: placementPlayer } : pick
        ))
      }
    };

    const svg = renderBoardSvg({
      tiles,
      record: { seed: 47, generatorFamily: "official-spiral", overallScore: 80, verdict: "pass" },
      diagnosticV2: adversarialDiagnostic
    });
    const escapedPort = "&lt;port&amp;&quot;&gt;";
    const escapedPlayer = "&lt;player&amp;&quot;&gt;";
    const renderedPort = elementsWithAttribute(svg, "g", "data-port-resource")[0];
    const renderedPlacement = elementsWithAttribute(svg, "g", "data-placement-pick")[0];

    expect(renderedPort.attributes["data-port-resource"]).toBe(escapedPort);
    expect(textTagContent(renderedPort.body)).toBe(escapedPort);
    expect(renderedPlacement.attributes["data-player"]).toBe(escapedPlayer);
    expect(textTagContent(renderedPlacement.body)).toBe(`${escapedPlayer} · 1`);
    expect(svg).not.toContain(portResource);
    expect(svg).not.toContain(placementPlayer);
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
    expect(summary.v2Audited).toBeNull();
    expect(html).toContain("Exact v2 selected-board audits");
    expect(html).toContain("Not recorded for this run.");
    expect(html).toContain("Top candidates");
    expect(html).toContain("Bottom candidates");
    expect(html).toContain("Threshold candidates");
    expect(html).toContain("Disagreement candidates");
    expect(html).toContain("Outliers");
    for (const sectionId of [
      "top-candidates",
      "bottom-candidates",
      "threshold-candidates",
      "disagreement-candidates",
      "outliers"
    ]) {
      const section = html.match(new RegExp(
        `<section aria-labelledby="${sectionId}">([\\s\\S]*?)<\\/section>`
      ))?.[1];
      expect(section, `missing ${sectionId}`).toBeDefined();
      expect(section.match(/<article class="board-card">/g)).toHaveLength(1);
      expect(section).toContain("Seed 1");
      expect(section).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    }
    expect(html).toContain("Seed 1");
    expect(html).not.toContain("UNSELECTED-SECRET");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("reason&lt;&amp;&quot;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("persists and separately renders completed-manifest v2 audit counts", async () => {
    const runDir = await temporaryRunDir();
    const v2Audited = {
      total: 7,
      pass: 2,
      review: 1,
      reject: 4,
      screenReject: 3
    };
    await writeFile(join(runDir, "candidates.jsonl"), `${JSON.stringify({
      candidateIndex: 0,
      verdict: "pass",
      rejectionCodes: [],
      overallScore: 80
    })}\n`);
    await writeFile(join(runDir, "manifest.json"), JSON.stringify({
      status: "complete",
      summary: { counts: { total: 1, pass: 1, reject: 0, invalid: 0 }, v2Audited }
    }));

    const { reportPath, summary } = await buildReport(runDir);
    const html = await readFile(reportPath, "utf8");
    const persistedSummary = JSON.parse(await readFile(join(runDir, "summary.json"), "utf8"));

    expect(summary).toEqual(persistedSummary);
    expect(summary.verdicts).toEqual({ pass: 1, reject: 0, invalid: 0 });
    expect(summary.v2Audited).toEqual(v2Audited);
    const v2Block = html.match(
      /<section aria-labelledby="v2-audit-summary">([\s\S]*?)<\/section>/
    )?.[1];
    expect(v2Block).toContain("Exact v2 selected-board audits");
    expect(v2Block).toContain("<dt>Total</dt><dd>7</dd>");
    expect(v2Block).toContain("<dt>Pass</dt><dd>2</dd>");
    expect(v2Block).toContain("<dt>Review</dt><dd>1</dd>");
    expect(v2Block).toContain("<dt>Reject</dt><dd>4</dd>");
    expect(v2Block).toContain("<dt>Screen reject</dt><dd>3</dd>");
  });

  it("renders escaped structured v2 explanations and bounded material alternatives", async () => {
    const { candidate, diagnosticV2: evaluated } = seed47Fixture();
    const diagnosticV2 = {
      ...evaluated,
      fairness: {
        ...evaluated.fairness,
        diagnosticLensResults: [{
          name: '<lens&">',
          normalisedSeatAdvantage: evaluated.fairness.normalisedSeatAdvantage,
          solvedLine: evaluated.fairness.solvedLine
        }]
      },
      tags: [...evaluated.tags, '<tag&">']
    };
    const { html } = await buildSingleBoardReport({
      tiles: candidate.tiles,
      diagnosticV2
    });

    expect(html).toContain("V1 screen verdict");
    expect(html).toContain("V2 audit verdict");
    expect(html).toContain("Starting hand");
    expect(html).toContain("Direct recipe capacity");
    expect(html).toContain("Trade-adjusted capacity");
    expect(html).toContain("Immediate recipe readiness");
    expect(html).toContain("Placement depth");
    expect(html).toContain("Official seat advantage");
    expect(html).toContain("Diagnostic lenses");
    expect(html).toContain("Material alternative lines");
    expect(html).toContain("Full v2 diagnostic");
    expect(html).toContain("&lt;lens&amp;&quot;&gt;");
    expect(html).toContain("&lt;tag&amp;&quot;&gt;");
    expect(html).not.toContain('<lens&">');
    expect(html).not.toContain('<tag&">');

    const alternatives = [...html.matchAll(
      /data-alternative-line="[^"]+" data-outcome-change="([^"]+)" data-node-ids="([^"]+)"/g
    )].map((match) => ({
      outcomeChange: Number(match[1]),
      nodeIds: match[2].split(",").map(Number)
    }));
    const compareNodeIds = (left, right) => {
      for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
        if (left[index] !== right[index]) return left[index] - right[index];
      }
      return left.length - right.length;
    };
    const expectedOrder = [...alternatives].sort((left, right) => (
      right.outcomeChange - left.outcomeChange
        || compareNodeIds(left.nodeIds, right.nodeIds)
    ));

    expect(alternatives).toHaveLength(8);
    expect(alternatives.every(({ outcomeChange }) => (
      outcomeChange >= DUEL_FAIR_V2_PROFILE.meaningfulLineTolerance
    ))).toBe(true);
    expect(alternatives).toEqual(expectedOrder);
  });

  it("deduplicates, filters, sorts, caps, escapes, and deterministically renders embedded alternatives", async () => {
    const { candidate, diagnosticV2: evaluated } = seed47Fixture();
    const alternative = (nodeIds, normalisedSeatAdvantage, firstPlayer = "P1") => ({
      normalisedSeatAdvantage,
      line: openingLine(nodeIds, firstPlayer)
    });
    const diagnosticV2 = {
      ...evaluated,
      fairness: {
        ...evaluated.fairness,
        normalisedSeatAdvantage: 0,
        rootOptions: [
          alternative([12, 30, 31, 32], 0.3),
          alternative([5, 50, 51, 52], 0.05),
          alternative([9, 40, 41, 42], 0.4),
          alternative([7, 6, 5, 4], 0.25),
          alternative([3, 50, 51, 52], 0.05, '<alt&">'),
          alternative([99, 50, 51, 52], 0.049999),
          alternative([4, 50, 51, 52], -0.05),
          alternative([2, 30, 31, 32], -0.3),
          alternative([6, 50, 51, 52], 0.050001),
          alternative([8, 50, 51, 52], 0.05)
        ],
        responseOptions: [
          alternative([11, 50, 51, 52], -0.05),
          alternative([7, 6, 5, 4], 0.49),
          alternative([1, 20, 21, 22], 0.35),
          alternative([98, 50, 51, 52], -0.049999)
        ]
      }
    };
    const { html, reportPath, runDir } = await buildSingleBoardReport({
      tiles: candidate.tiles,
      diagnosticV2
    });
    const rendered = elementsWithAttribute(html, "tr", "data-alternative-line").map((row) => ({
      kind: row.attributes["data-alternative-line"],
      outcomeChange: Number(row.attributes["data-outcome-change"]),
      nodeIds: row.attributes["data-node-ids"].split(",").map(Number)
    }));

    expect(rendered).toEqual([
      { kind: "root", outcomeChange: 0.4, nodeIds: [9, 40, 41, 42] },
      { kind: "response", outcomeChange: 0.35, nodeIds: [1, 20, 21, 22] },
      { kind: "root", outcomeChange: 0.3, nodeIds: [2, 30, 31, 32] },
      { kind: "root", outcomeChange: 0.3, nodeIds: [12, 30, 31, 32] },
      { kind: "root", outcomeChange: 0.25, nodeIds: [7, 6, 5, 4] },
      { kind: "root", outcomeChange: 0.050001, nodeIds: [6, 50, 51, 52] },
      { kind: "root", outcomeChange: 0.05, nodeIds: [3, 50, 51, 52] },
      { kind: "root", outcomeChange: 0.05, nodeIds: [4, 50, 51, 52] },
    ]);
    expect(html).toContain("&lt;alt&amp;&quot;&gt; 3");
    expect(html).not.toContain('<alt&">');
    expect(html).not.toContain('data-node-ids="99,50,51,52"');
    expect(html).not.toContain('data-node-ids="5,50,51,52"');

    await buildReport(runDir);
    expect(await readFile(reportPath, "utf8")).toBe(html);
  });

  it("renders a real structural v2 rejection without portfolio tables or expanded raw JSON", async () => {
    const { candidate } = seed47Fixture();
    const tiles = candidate.tiles.slice(0, -1);
    const diagnosticV2 = evaluateDuelBoardV2(tiles);

    expect(diagnosticV2.screenVerdict).toBe("reject");
    expect(diagnosticV2.screenRejectionCodes.length).toBeGreaterThan(0);
    expect(diagnosticV2.fairness).toBeNull();

    const { html } = await buildSingleBoardReport({ tiles, diagnosticV2 });

    expect(html).toContain("Structural rejections");
    for (const code of diagnosticV2.screenRejectionCodes) expect(html).toContain(code);
    expect(html).toContain('<details class="diagnostic-json"><summary>Full v2 diagnostic</summary>');
    expect(html).not.toContain('<details class="diagnostic-json" open>');
    expect(html).toContain("&quot;fairness&quot;: null");
    expect(html).not.toContain('"fairness": null');
    expect(html).not.toContain("Solved opening portfolios");
    expect(html).not.toContain("Material alternative lines");
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
    expect(html).toContain("V2 opening audit");
    expect(html).toContain("Diagnostic lenses");
    expect(html).toContain("duel-fair-v2");
    expect(html).toContain("Seed 3");
  }, 10_000);
});
