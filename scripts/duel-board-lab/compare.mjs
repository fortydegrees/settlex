import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { BOARD_FAMILIES, EVALUATOR_VERSIONS } from "./constants.mjs";
import { parseCompareOptions } from "./lib/cliOptions.mjs";
import { runBatch } from "./lib/runBatch.mjs";
import { buildReport } from "./reports/buildReport.mjs";
import { buildRankedReport } from "./reports/buildRankedReport.mjs";
import { escapeHtml } from "./reports/renderBoard.mjs";

function formatMetric(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

function renderComparisonHtml(comparison) {
  const firstResult = Object.values(comparison)[0];
  const isV3 = firstResult?.evaluatorVersion === EVALUATOR_VERSIONS.V3;
  const rateLabel = isV3 ? "Ranked rate" : "Pass rate";
  const middleLabel = isV3 ? "Median score" : "Mean score";
  const rows = Object.entries(comparison).map(([family, result]) => {
    const reportHref = `${encodeURIComponent(family)}/report.html`;
    return "<tr>"
      + `<th scope="row"><a href="${escapeHtml(reportHref)}">${escapeHtml(family)}</a></th>`
      + `<td>${escapeHtml(result.counts.total)}</td>`
      + `<td>${escapeHtml(`${(result.rate * 100).toFixed(2)}%`)}</td>`
      + `<td>${escapeHtml(formatMetric(result.score.min))}</td>`
      + `<td>${escapeHtml(formatMetric(result.score.middle))}</td>`
      + `<td>${escapeHtml(formatMetric(result.score.max))}</td>`
      + `<td>${escapeHtml(formatMetric(result.peakRssMiB))}</td>`
      + "</tr>";
  }).join("");

  return "<!doctype html>"
    + '<html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + "<title>Duel board family comparison</title>"
    + "<style>body{max-width:1000px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;color:#20242b;background:#ebe7dc}"
    + "table{width:100%;border-collapse:collapse;background:#fff}th,td{padding:10px 12px;border:1px solid #ccc;text-align:right}th:first-child{text-align:left}</style>"
    + "</head><body><h1>Duel board family comparison</h1>"
    + `<table><thead><tr><th scope="col">Family</th><th scope="col">Total</th><th scope="col">${rateLabel}</th>`
    + `<th scope="col">Min score</th><th scope="col">${middleLabel}</th><th scope="col">Max score</th><th scope="col">Peak RSS MiB</th>`
    + `</tr></thead><tbody>${rows}</tbody></table></body></html>`;
}

const { runId, v2AuditSelections, ...options } = parseCompareOptions(process.argv.slice(2));
const rootDir = resolve("tmp", "duel-board-lab", "runs", runId);
await mkdir(rootDir, { recursive: true });

const comparison = {};
for (const family of Object.values(BOARD_FAMILIES)) {
  const runDir = join(rootDir, family);
  const summary = await runBatch({
    runDir,
    family,
    ...options,
    auditSelections: true,
    v2AuditSelections
  });
  const reportBuilder = options.evaluatorVersion === EVALUATOR_VERSIONS.V3
    ? buildRankedReport
    : buildReport;
  const { reportPath, summary: reportSummary } = await reportBuilder(runDir);
  const isV3 = options.evaluatorVersion === EVALUATOR_VERSIONS.V3;
  const rate = isV3
    ? summary.counts.ranked / summary.counts.total
    : summary.counts.pass / summary.counts.total;
  const score = isV3
    ? {
      min: reportSummary.scores.overall.min,
      middle: reportSummary.scores.overall.median,
      max: reportSummary.scores.overall.max
    }
    : {
      min: reportSummary.score.min,
      middle: reportSummary.score.mean,
      max: reportSummary.score.max
    };
  comparison[family] = {
    ...summary,
    evaluatorVersion: options.evaluatorVersion,
    reportPath,
    rate,
    ...(isV3 ? { rankedRate: rate } : { passRate: rate }),
    score
  };
}

await writeFile(join(rootDir, "comparison.json"), `${JSON.stringify(comparison, null, 2)}\n`);
await writeFile(join(rootDir, "comparison.html"), renderComparisonHtml(comparison));
console.log(JSON.stringify({ rootDir, comparison }, null, 2));
