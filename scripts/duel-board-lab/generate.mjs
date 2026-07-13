import { resolve } from "node:path";
import { EVALUATOR_VERSIONS } from "./constants.mjs";
import { parseGenerateOptions } from "./lib/cliOptions.mjs";
import { runBatch } from "./lib/runBatch.mjs";
import { buildReport } from "./reports/buildReport.mjs";
import { buildRankedReport } from "./reports/buildRankedReport.mjs";

const { runId, v2AuditSelections, ...options } = parseGenerateOptions(process.argv.slice(2));
const runDir = resolve("tmp", "duel-board-lab", "runs", runId, options.family);
const summary = await runBatch({ runDir, ...options, auditSelections: true, v2AuditSelections });
const reportBuilder = options.evaluatorVersion === EVALUATOR_VERSIONS.V3
  ? buildRankedReport
  : buildReport;
const { reportPath } = await reportBuilder(runDir);

console.log(JSON.stringify({ runDir, reportPath, summary }, null, 2));
