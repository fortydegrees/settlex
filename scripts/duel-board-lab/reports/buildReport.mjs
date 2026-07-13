import { createReadStream } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import { evaluateDuelBoard } from "../analysis/evaluateDuelBoard.mjs";
import { evaluateDuelBoardV2 } from "../analysis/evaluateDuelBoardV2.mjs";
import { solveOpeningDraft } from "../analysis/openingDraftSolver.mjs";
import { hashBoard } from "../analysis/symmetry.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";
import { escapeHtml, renderBoardSvg } from "./renderBoard.mjs";
import {
  addRecordToSummary,
  createEmptySummary,
  finaliseSummary
} from "./summary.mjs";

async function* readJsonLines(path) {
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (line.trim()) yield JSON.parse(line);
  }
}

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function groupSelectedBoards(boards) {
  const sections = {
    top: [],
    bottom: [],
    threshold: [],
    disagreement: [],
    outliers: []
  };
  for (const board of boards) {
    for (const group of board.selectionGroups ?? []) {
      if (group === "top" || group === "bottom" || group === "disagreement") {
        sections[group].push(board);
      } else if (group.startsWith("near-")) {
        sections.threshold.push(board);
      } else {
        sections.outliers.push(board);
      }
    }
  }
  for (const [name, entries] of Object.entries(sections)) {
    sections[name] = [...new Set(entries)];
  }
  return sections;
}

function formatMetric(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

function formatValue(value) {
  if (value == null || value === "") return "None";
  if (typeof value === "number") return formatMetric(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatList(values) {
  return values?.length > 0 ? values.join(" · ") : "None";
}

function formatLine(line) {
  return line?.length > 0
    ? line.map(({ player, nodeId }) => `${player} ${nodeId}`).join(" → ")
    : "None";
}

function formatNumberEntries(entries) {
  return Object.entries(entries ?? {})
    .map(([key, value]) => `${key}: ${formatMetric(value)}`)
    .join(" · ") || "None";
}

function formatMultiset(values) {
  const counts = new Map();
  for (const value of values ?? []) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([value, count]) => `${value} ×${count}`).join(" · ") || "None";
}

function formatReadiness(readiness) {
  return Object.entries(readiness ?? {}).map(([recipe, result]) => {
    if (result.canBuyNow) return `${recipe}: ready`;
    return `${recipe}: missing ${result.missingCardCount} (${formatList(result.missingResources)})`;
  }).join(" · ") || "None";
}

function formatSeatLists(values) {
  return ["P1", "P2"]
    .map((seat) => `${seat}: ${formatList(values?.[seat])}`)
    .join(" · ");
}

function renderComparisonTable(caption, rows) {
  const body = rows.map(([label, p1, p2]) => (
    `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(p1)}</td><td>${escapeHtml(p2)}</td></tr>`
  )).join("");
  return `<table class="diagnostic-table"><caption>${escapeHtml(caption)}</caption>`
    + '<thead><tr><th scope="col">Measure</th><th scope="col">P1</th><th scope="col">P2</th></tr></thead>'
    + `<tbody>${body}</tbody></table>`;
}

function renderValueTable(caption, rows) {
  const body = rows.map(([label, value]) => (
    `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  )).join("");
  return `<table class="diagnostic-table"><caption>${escapeHtml(caption)}</caption>`
    + '<thead><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead>'
    + `<tbody>${body}</tbody></table>`;
}

function compareNodeIdSequences(left, right) {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return left.length - right.length;
}

function materialAlternatives(tiles, diagnosticV2) {
  const fairness = diagnosticV2?.fairness;
  if (!fairness) return [];

  let rootOptions = fairness.rootOptions;
  let responseOptions = fairness.responseOptions;
  if (!Array.isArray(rootOptions) || !Array.isArray(responseOptions)) {
    const solved = solveOpeningDraft(buildBoardFacts(tiles), {
      policy: DUEL_FAIR_V2_PROFILE.officialPolicy,
      precision: DUEL_FAIR_V2_PROFILE.tradePrecision
    });
    rootOptions = solved.rootOptions;
    responseOptions = solved.responseOptions;
  }

  const alternativesByLine = new Map();
  const collect = (kind, options) => {
    for (const option of options ?? []) {
      const nodeIds = option.line?.map(({ nodeId }) => nodeId) ?? [];
      const outcomeChange = Math.abs(
        option.normalisedSeatAdvantage - fairness.normalisedSeatAdvantage
      );
      if (
        nodeIds.length !== 4
        || !Number.isFinite(outcomeChange)
        || outcomeChange < DUEL_FAIR_V2_PROFILE.meaningfulLineTolerance
      ) continue;
      const key = nodeIds.join(",");
      if (!alternativesByLine.has(key)) {
        alternativesByLine.set(key, {
          kind,
          line: option.line,
          nodeIds,
          normalisedSeatAdvantage: option.normalisedSeatAdvantage,
          outcomeChange
        });
      }
    }
  };
  collect("root", rootOptions);
  collect("response", responseOptions);

  return [...alternativesByLine.values()]
    .sort((left, right) => (
      right.outcomeChange - left.outcomeChange
        || compareNodeIdSequences(left.nodeIds, right.nodeIds)
    ))
    .slice(0, 8);
}

function renderDiagnosticLenses(lenses) {
  const rows = lenses?.length > 0
    ? lenses.map((lens) => (
      `<tr><th scope="row">${escapeHtml(lens.name)}</th>`
        + `<td>${escapeHtml(formatMetric(lens.normalisedSeatAdvantage))}</td>`
        + `<td>${escapeHtml(formatLine(lens.solvedLine))}</td></tr>`
    )).join("")
    : '<tr><td colspan="3">None requested</td></tr>';
  return '<table class="diagnostic-table"><caption>Diagnostic lenses</caption>'
    + '<thead><tr><th scope="col">Lens</th><th scope="col">Normalised advantage</th><th scope="col">Solved line</th></tr></thead>'
    + `<tbody>${rows}</tbody></table>`;
}

function renderMaterialAlternatives(alternatives) {
  const rows = alternatives.length > 0
    ? alternatives.map((alternative) => (
      `<tr data-alternative-line="${escapeHtml(alternative.kind)}" data-outcome-change="${escapeHtml(alternative.outcomeChange)}" data-node-ids="${escapeHtml(alternative.nodeIds.join(","))}">`
        + `<th scope="row">${escapeHtml(alternative.kind)}</th>`
        + `<td>${escapeHtml(formatLine(alternative.line))}</td>`
        + `<td>${escapeHtml(formatMetric(alternative.normalisedSeatAdvantage))}</td>`
        + `<td>${escapeHtml(formatMetric(alternative.outcomeChange))}</td></tr>`
    )).join("")
    : '<tr><td colspan="4">No alternatives at the configured tolerance.</td></tr>';
  return '<table class="diagnostic-table"><caption>Material alternative lines</caption>'
    + '<thead><tr><th scope="col">Branch</th><th scope="col">Ordered line</th><th scope="col">Normalised advantage</th><th scope="col">Absolute outcome change</th></tr></thead>'
    + `<tbody>${rows}</tbody></table>`;
}

function renderV2Diagnostic(diagnosticV2, alternatives) {
  if (!diagnosticV2) return "";
  const fairness = diagnosticV2.fairness;
  const overview = renderValueTable("V2 audit", [
    ["Structural screen", formatValue(diagnosticV2.screenVerdict)],
    ["Fairness verdict", formatValue(fairness?.verdict)],
    ["Favoured seat", formatValue(fairness?.favouredSeat)],
    ["Official seat advantage", formatValue(fairness?.seatAdvantage)],
    ["Official normalised advantage", formatValue(fairness?.normalisedSeatAdvantage)],
    ["Rejection codes", formatList(fairness?.rejectionCodes)],
    ["Review codes", formatList(fairness?.reviewCodes)],
    ["Tags", formatList(diagnosticV2.tags)]
  ]);
  const fullDiagnostic = '<details class="diagnostic-json"><summary>Full v2 diagnostic</summary>'
    + `<pre>${escapeHtml(JSON.stringify(diagnosticV2, null, 2))}</pre></details>`;
  if (!fairness) {
    return '<section class="v2-audit"><h4>V2 opening audit</h4>'
      + overview
      + renderValueTable("Structural rejections", [
        ["Screen rejection codes", formatList(diagnosticV2.screenRejectionCodes)]
      ])
      + fullDiagnostic
      + "</section>";
  }

  const p1 = fairness.portfolios.P1;
  const p2 = fairness.portfolios.P2;
  const portfolios = renderComparisonTable("Solved opening portfolios", [
    ["Ordered node IDs", formatList(p1.settlementNodeIds), formatList(p2.settlementNodeIds)],
    ["Full production vector", formatNumberEntries(p1.productionPips), formatNumberEntries(p2.productionPips)],
    ["Starting hand", formatMultiset(p1.startingCards), formatMultiset(p2.startingCards)],
    ["Owned ports", formatList(p1.ownedPorts), formatList(p2.ownedPorts)],
    ["Direct recipe capacity", formatNumberEntries(p1.directRecipeCapacity), formatNumberEntries(p2.directRecipeCapacity)],
    ["Trade-adjusted capacity", formatNumberEntries(p1.tradeAdjustedRecipeCapacity), formatNumberEntries(p2.tradeAdjustedRecipeCapacity)],
    ["Immediate recipe readiness", formatReadiness(p1.startingReadiness), formatReadiness(p2.startingReadiness)]
  ]);
  const quality = diagnosticV2.quality;
  const qualityTable = renderValueTable("Quality values", [
    ["Weaker seat", formatValue(quality?.weakerSeat)],
    ["Weaker portfolio value", formatValue(quality?.weakerPortfolioValue)],
    ["Viable recipe counts", formatNumberEntries(quality?.viableRecipeCounts)],
    ["Trade-adjusted viable recipe counts", formatNumberEntries(quality?.tradeAdjustedViableRecipeCounts)],
    ["No credible recipes", formatSeatLists(quality?.noCredibleRecipes)],
    ["Port dependence", formatNumberEntries(quality?.portDependence)]
  ]);
  const depth = diagnosticV2.placementDepth;
  const depthTable = renderValueTable("Placement depth", [
    ["Greedy line", formatLine(depth?.greedyLine)],
    ["Greedy seat advantage", formatValue(depth?.greedySeatAdvantage)],
    ["Greedy normalised advantage", formatValue(depth?.greedyNormalisedSeatAdvantage)],
    ["Greedy regret", formatValue(depth?.greedyRegret)],
    ["Meaningful first picks", formatValue(depth?.meaningfulFirstPickCount)],
    ["Meaningful responses", formatValue(depth?.meaningfulResponseCount)],
    ["Forced defence", formatValue(depth?.forcedDefence)],
    ["Line sensitivity", formatValue(depth?.lineSensitivity)]
  ]);

  return '<section class="v2-audit"><h4>V2 opening audit</h4>'
    + overview
    + portfolios
    + renderDiagnosticLenses(fairness.diagnosticLensResults)
    + qualityTable
    + depthTable
    + renderMaterialAlternatives(alternatives)
    + fullDiagnostic
    + "</section>";
}

function renderSummary(summary) {
  const rejectionRows = Object.entries(summary.rejectionCodes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => `<tr><th scope="row">${escapeHtml(code)}</th><td>${escapeHtml(count)}</td></tr>`)
    .join("");
  const rows = rejectionRows || '<tr><td colspan="2">None</td></tr>';
  return `<section aria-labelledby="run-summary"><h2 id="run-summary">Run summary</h2>`
    + '<dl class="counts">'
    + `<div><dt>Total</dt><dd>${escapeHtml(summary.count)}</dd></div>`
    + `<div><dt>Pass</dt><dd>${escapeHtml(summary.verdicts.pass)}</dd></div>`
    + `<div><dt>Reject</dt><dd>${escapeHtml(summary.verdicts.reject)}</dd></div>`
    + `<div><dt>Invalid</dt><dd>${escapeHtml(summary.verdicts.invalid)}</dd></div>`
    + "</dl>"
    + `<p>Score min / mean / max: ${escapeHtml(formatMetric(summary.score.min))} / ${escapeHtml(formatMetric(summary.score.mean))} / ${escapeHtml(formatMetric(summary.score.max))}</p>`
    + `<table><caption>Rejection codes</caption><thead><tr><th scope="col">Code</th><th scope="col">Count</th></tr></thead><tbody>${rows}</tbody></table>`
    + "</section>";
}

function renderV2AuditSummary(v2Audited) {
  const count = (value) => Number.isInteger(value) && value >= 0 ? String(value) : "None";
  const body = v2Audited === null
    ? "<p>Not recorded for this run.</p>"
    : '<dl class="counts">'
      + `<div><dt>Total</dt><dd>${escapeHtml(count(v2Audited.total))}</dd></div>`
      + `<div><dt>Pass</dt><dd>${escapeHtml(count(v2Audited.pass))}</dd></div>`
      + `<div><dt>Review</dt><dd>${escapeHtml(count(v2Audited.review))}</dd></div>`
      + `<div><dt>Reject</dt><dd>${escapeHtml(count(v2Audited.reject))}</dd></div>`
      + `<div><dt>Screen reject</dt><dd>${escapeHtml(count(v2Audited.screenReject))}</dd></div>`
      + "</dl>";
  return '<section aria-labelledby="v2-audit-summary">'
    + '<h2 id="v2-audit-summary">Exact v2 selected-board audits</h2>'
    + body
    + "</section>";
}

function renderBoardCard(board) {
  const { record, tiles, diagnosticV2 } = board;
  const reasons = record.rejectionCodes?.length > 0
    ? record.rejectionCodes.map(escapeHtml).join(", ")
    : "None";
  const groups = (board.selectionGroups ?? []).map(escapeHtml).join(", ") || "None";
  const v2AuditVerdict = diagnosticV2?.fairness?.verdict ?? diagnosticV2?.screenVerdict;
  const alternatives = diagnosticV2?.fairness
    ? materialAlternatives(tiles, diagnosticV2)
    : [];
  return '<article class="board-card">'
    + `<h3>Seed ${escapeHtml(record.seed)}</h3>`
    + renderBoardSvg({ tiles, record, diagnosticV2 })
    + '<dl class="metadata">'
    + `<div><dt>Family</dt><dd>${escapeHtml(record.generatorFamily ?? record.family ?? "candidate")}</dd></div>`
    + `<div><dt>V1 screen score</dt><dd>${escapeHtml(formatMetric(record.overallScore))}</dd></div>`
    + `<div><dt>V1 screen verdict</dt><dd>${escapeHtml(record.verdict)}</dd></div>`
    + `<div><dt>V1 screen reasons</dt><dd>${reasons}</dd></div>`
    + `<div><dt>V2 audit score</dt><dd>${escapeHtml(formatMetric(diagnosticV2?.overallScore))}</dd></div>`
    + `<div><dt>V2 audit verdict</dt><dd>${escapeHtml(formatValue(v2AuditVerdict))}</dd></div>`
    + `<div><dt>Selection groups</dt><dd>${groups}</dd></div>`
    + "</dl>"
    + renderV2Diagnostic(diagnosticV2, alternatives)
    + "</article>";
}

function renderSection(id, title, boards, cardByBoard) {
  const cards = boards.length > 0
    ? boards.map((board) => cardByBoard.get(board)).join("")
    : '<p class="empty">No selected boards.</p>';
  const escapedId = escapeHtml(id);
  return `<section aria-labelledby="${escapedId}"><h2 id="${escapedId}">${escapeHtml(title)}</h2><div class="board-grid">${cards}</div></section>`;
}

function renderDocument({ title, body }) {
  return "<!doctype html>"
    + '<html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + `<title>${escapeHtml(title)}</title>`
    + "<style>"
    + ":root{color-scheme:light;font-family:Outfit,system-ui,sans-serif;background:#bfdbfe;color:#1e293b}"
    + "body{max-width:1400px;margin:0 auto;padding:24px}h1,h2,h3,h4{line-height:1.2}h1{margin-bottom:28px}h2{margin-top:32px}"
    + ".counts{display:flex;flex-wrap:wrap;gap:12px}.counts div{background:#ffffffb3;padding:8px 12px;border-radius:10px;box-shadow:0 8px 24px #1e3a8a12}"
    + ".metadata{display:flex;flex-wrap:wrap;gap:8px 16px;margin:10px 0 0;padding-top:10px;border-top:1px solid #cbd5e1;color:#475569}.metadata div{min-width:110px}"
    + "dt{font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b}dd{margin:2px 0 0;font-size:.8rem}"
    + "table{width:100%;border-collapse:separate;border-spacing:0;background:#ffffffb8;border:1px solid #dbeafe;border-radius:10px;overflow:hidden}caption{padding:16px 10px 8px;text-align:left;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#475569}th,td{padding:8px 10px;border-top:1px solid #e2e8f0;text-align:left;vertical-align:top;font-size:.78rem}thead th{border-top:0;background:#eff6ff;color:#475569}tbody th{width:22%;color:#334155}"
    + ".board-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,560px),1fr));gap:18px}"
    + ".board-card{background:#ffffffc7;border:1px solid #ffffff;border-radius:16px;padding:16px;box-shadow:0 14px 38px #1e3a8a1a;backdrop-filter:blur(6px)}.board-card h3{margin:0 0 6px}"
    + ".board-card svg{display:block;width:100%;height:auto;border-radius:12px}.v2-audit{margin-top:18px}.v2-audit h4{margin:0 0 2px}.diagnostic-table+.diagnostic-table{margin-top:10px}.empty{color:#64748b}"
    + "details{margin-top:12px;color:#475569}summary{cursor:pointer;font-size:.78rem;font-weight:700}pre{overflow:auto;background:#eff6ff;padding:14px;border-radius:10px;font-size:.72rem}"
    + "@media(max-width:620px){body{padding:14px}.board-card{padding:10px}th,td{padding:6px;font-size:.7rem}}"
    + "</style></head><body>"
    + body
    + "</body></html>";
}

function renderReportDocument({ summary, sections }) {
  const cardByBoard = new Map();
  for (const boards of Object.values(sections)) {
    for (const board of boards) {
      if (!cardByBoard.has(board)) cardByBoard.set(board, renderBoardCard(board));
    }
  }
  return renderDocument({
    title: "Duel board run report",
    body: "<h1>Duel board run report</h1>"
      + renderSummary(summary)
      + renderV2AuditSummary(summary.v2Audited)
      + renderSection("top-candidates", "Top candidates", sections.top, cardByBoard)
      + renderSection("bottom-candidates", "Bottom candidates", sections.bottom, cardByBoard)
      + renderSection("threshold-candidates", "Threshold candidates", sections.threshold, cardByBoard)
      + renderSection("disagreement-candidates", "Disagreement candidates", sections.disagreement, cardByBoard)
      + renderSection("outliers", "Outliers", sections.outliers, cardByBoard)
  });
}

function renderInspectionDocument({ record, diagnostic, diagnosticV2, tiles }) {
  const orderAudit = diagnostic.metrics.orderSensitivityAudit;
  return renderDocument({
    title: `Candidate ${record.candidateIndex} inspection`,
    body: "<h1>Candidate inspection</h1>"
      + renderBoardCard({ selectionGroups: ["inspection"], record, diagnostic, diagnosticV2, tiles })
      + "<h2>Order sensitivity audit</h2>"
      + `<pre>${escapeHtml(JSON.stringify(orderAudit, null, 2))}</pre>`
      + "<h2>Full diagnostic</h2>"
      + `<pre>${escapeHtml(JSON.stringify(diagnostic, null, 2))}</pre>`
  });
}

export async function buildReport(runDir) {
  const summary = createEmptySummary();
  for await (const record of readJsonLines(join(runDir, "candidates.jsonl"))) {
    addRecordToSummary(summary, record);
  }
  finaliseSummary(summary);
  const manifest = await readJsonIfPresent(join(runDir, "manifest.json"));
  summary.v2Audited = manifest?.status === "complete"
    && typeof manifest.summary?.v2Audited === "object"
    && manifest.summary.v2Audited !== null
    ? manifest.summary.v2Audited
    : null;
  await writeFile(join(runDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  const boardFiles = (await readdir(join(runDir, "boards")))
    .filter((name) => name.endsWith(".json"))
    .sort();
  const boards = await Promise.all(boardFiles.map(async (name) => (
    JSON.parse(await readFile(join(runDir, "boards", name), "utf8"))
  )));
  const sections = groupSelectedBoards(boards);
  const html = renderReportDocument({ summary, sections });
  const reportPath = join(runDir, "report.html");
  await writeFile(reportPath, html);
  return { reportPath, summary };
}

export async function inspectCandidate({ runDir, candidateIndex }) {
  let record = null;
  for await (const candidate of readJsonLines(join(runDir, "candidates.jsonl"))) {
    if (candidate.candidateIndex === candidateIndex) {
      record = candidate;
      break;
    }
  }
  if (!record) throw new Error(`Candidate index ${candidateIndex} not found`);

  const generated = generateCandidate({ family: record.generatorFamily, seed: record.seed });
  if (hashBoard(generated.tiles) !== record.boardHash) {
    throw new Error(`Candidate hash mismatch for index ${candidateIndex}`);
  }
  const diagnostic = evaluateDuelBoard(generated.tiles, { includeOrderAudit: true });
  const diagnosticV2 = evaluateDuelBoardV2(generated.tiles, { includeDiagnosticLenses: true });
  const outputPath = join(runDir, "boards", `inspect-${candidateIndex}.html`);
  await writeFile(outputPath, renderInspectionDocument({
    record,
    diagnostic,
    diagnosticV2,
    tiles: generated.tiles
  }));
  return outputPath;
}
