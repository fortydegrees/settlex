import { resolve } from "node:path";
import { parseInspectOptions } from "./lib/cliOptions.mjs";
import { inspectCandidate } from "./reports/buildReport.mjs";

const options = parseInspectOptions(process.argv.slice(2));
const runDir = resolve("tmp", "duel-board-lab", "runs", options.runId, options.family);

console.log(await inspectCandidate({ runDir, candidateIndex: options.candidateIndex }));
