import { resolve } from "node:path";
import { EVALUATOR_VERSIONS } from "./constants.mjs";
import { parseInspectOptions } from "./lib/cliOptions.mjs";
import { inspectCandidate } from "./reports/buildReport.mjs";
import { inspectCandidateV3 } from "./reports/inspectCandidateV3.mjs";

const options = parseInspectOptions(process.argv.slice(2));
const runDir = resolve("tmp", "duel-board-lab", "runs", options.runId, options.family);

if (options.evaluatorVersion === EVALUATOR_VERSIONS.V3) {
  const inspection = await inspectCandidateV3({
    runDir,
    candidateIndex: options.candidateIndex,
    exact: options.exactV3
  });
  console.log(JSON.stringify(inspection, null, 2));
} else {
  console.log(await inspectCandidate({ runDir, candidateIndex: options.candidateIndex }));
}
