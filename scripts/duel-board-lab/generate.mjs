import { resolve } from "node:path";
import { parseGenerateOptions } from "./lib/cliOptions.mjs";
import { runBatch } from "./lib/runBatch.mjs";
import { buildReport } from "./reports/buildReport.mjs";

const options = parseGenerateOptions(process.argv.slice(2));
const runDir = resolve("tmp", "duel-board-lab", "runs", options.runId, options.family);
const summary = await runBatch({ runDir, ...options, auditSelections: true });
const { reportPath } = await buildReport(runDir);

console.log(JSON.stringify({ runDir, reportPath, summary }, null, 2));
