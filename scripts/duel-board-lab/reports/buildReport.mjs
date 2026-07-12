import { createReadStream } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { evaluateDuelBoard } from "../analysis/evaluateDuelBoard.mjs";
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

function renderSummary(summary) {
  const rejectionRows = Object.entries(summary.rejectionCodes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([code, count]) => `<tr><th scope="row">${escapeHtml(code)}</th><td>${escapeHtml(count)}</td></tr>`)
    .join("");
  const rows = rejectionRows || '<tr><td colspan="2">None</td></tr>';
  return `<section aria-labelledby="run-summary"><h2 id="run-summary">Run summary</h2>`
    + '<dl class="counts">'
    + `<div><dt>Total</dt><dd>${summary.count}</dd></div>`
    + `<div><dt>Pass</dt><dd>${summary.verdicts.pass}</dd></div>`
    + `<div><dt>Reject</dt><dd>${summary.verdicts.reject}</dd></div>`
    + `<div><dt>Invalid</dt><dd>${summary.verdicts.invalid}</dd></div>`
    + "</dl>"
    + `<p>Score min / mean / max: ${formatMetric(summary.score.min)} / ${formatMetric(summary.score.mean)} / ${formatMetric(summary.score.max)}</p>`
    + `<table><caption>Rejection codes</caption><thead><tr><th scope="col">Code</th><th scope="col">Count</th></tr></thead><tbody>${rows}</tbody></table>`
    + "</section>";
}

function renderBoardCard(board) {
  const { record, tiles } = board;
  const reasons = record.rejectionCodes?.length > 0
    ? record.rejectionCodes.map(escapeHtml).join(", ")
    : "None";
  const groups = (board.selectionGroups ?? []).map(escapeHtml).join(", ") || "None";
  return '<article class="board-card">'
    + `<h3>Seed ${escapeHtml(record.seed)}</h3>`
    + '<dl class="metadata">'
    + `<div><dt>Family</dt><dd>${escapeHtml(record.generatorFamily ?? record.family ?? "candidate")}</dd></div>`
    + `<div><dt>Score</dt><dd>${escapeHtml(formatMetric(record.overallScore))}</dd></div>`
    + `<div><dt>Verdict</dt><dd>${escapeHtml(record.verdict)}</dd></div>`
    + `<div><dt>Reasons</dt><dd>${reasons}</dd></div>`
    + `<div><dt>Selection groups</dt><dd>${groups}</dd></div>`
    + "</dl>"
    + renderBoardSvg({ tiles, record })
    + "</article>";
}

function renderSection(id, title, boards) {
  const cards = boards.length > 0
    ? boards.map(renderBoardCard).join("")
    : '<p class="empty">No selected boards.</p>';
  return `<section aria-labelledby="${id}"><h2 id="${id}">${title}</h2><div class="board-grid">${cards}</div></section>`;
}

function renderDocument({ title, body }) {
  return "<!doctype html>"
    + '<html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + `<title>${escapeHtml(title)}</title>`
    + "<style>"
    + ":root{color-scheme:light;font-family:system-ui,sans-serif;background:#ebe7dc;color:#20242b}"
    + "body{max-width:1200px;margin:0 auto;padding:24px}h1,h2,h3{line-height:1.2}"
    + ".counts,.metadata{display:flex;flex-wrap:wrap;gap:12px}.counts div,.metadata div{background:#fff;padding:8px 12px;border-radius:8px}"
    + "dt{font-size:.75rem;font-weight:700;text-transform:uppercase;color:#555}dd{margin:2px 0 0}"
    + "table{border-collapse:collapse;background:#fff}th,td{padding:8px 12px;border:1px solid #ccc;text-align:left}"
    + ".board-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,460px),1fr));gap:18px}"
    + ".board-card{background:#fff;border:1px solid #d2ccbf;border-radius:12px;padding:16px;box-shadow:0 2px 8px #0001}"
    + ".board-card svg{display:block;width:100%;height:auto;margin-top:12px}.empty{color:#666}pre{overflow:auto;background:#fff;padding:16px;border-radius:8px}"
    + "</style></head><body>"
    + body
    + "</body></html>";
}

function renderReportDocument({ summary, sections }) {
  return renderDocument({
    title: "Duel board run report",
    body: "<h1>Duel board run report</h1>"
      + renderSummary(summary)
      + renderSection("top-candidates", "Top candidates", sections.top)
      + renderSection("bottom-candidates", "Bottom candidates", sections.bottom)
      + renderSection("threshold-candidates", "Threshold candidates", sections.threshold)
      + renderSection("disagreement-candidates", "Disagreement candidates", sections.disagreement)
      + renderSection("outliers", "Outliers", sections.outliers)
  });
}

function renderInspectionDocument({ record, diagnostic, tiles }) {
  const orderAudit = diagnostic.metrics.orderSensitivityAudit;
  return renderDocument({
    title: `Candidate ${record.candidateIndex} inspection`,
    body: "<h1>Candidate inspection</h1>"
      + renderBoardCard({ selectionGroups: ["inspection"], record, diagnostic, tiles })
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
  const outputPath = join(runDir, "boards", `inspect-${candidateIndex}.html`);
  await writeFile(outputPath, renderInspectionDocument({ record, diagnostic, tiles: generated.tiles }));
  return outputPath;
}
