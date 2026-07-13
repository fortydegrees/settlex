import { performance } from "node:perf_hooks";
import { buildBoardFacts } from "./analysis/boardFacts.mjs";
import { evaluateDuelBoard } from "./analysis/evaluateDuelBoard.mjs";
import { evaluateDuelBoardV2 } from "./analysis/evaluateDuelBoardV2.mjs";
import { BOARD_FAMILIES } from "./constants.mjs";
import { generateCandidate } from "./generators/generateCandidate.mjs";

const families = Object.values(BOARD_FAMILIES);
const candidates = Array.from({ length: 10_000 }, (_, index) =>
  generateCandidate({
    family: families[index % families.length],
    seed: Math.floor(index / families.length) + 1
  }));

function timed(label, count, work) {
  let peakRss = process.memoryUsage().rss;
  const started = performance.now();
  const sampleEvery = Math.max(1, Math.floor(count / 100));
  for (let index = 0; index < count; index += 1) {
    work(index);
    if (index % sampleEvery === 0) {
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }
  }
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const seconds = (performance.now() - started) / 1000;
  return {
    label,
    boardsPerSecond: count / seconds,
    peakRssMiB: peakRss / 1024 / 1024
  };
}

const evaluation = timed("evaluation-only", candidates.length, (index) => {
  evaluateDuelBoard(candidates[index].tiles);
});
const full = timed("generate-and-evaluate", 10_000, (index) => {
  const candidate = generateCandidate({
    family: families[index % families.length],
    seed: Math.floor(index / families.length) + 20_001
  });
  evaluateDuelBoard(candidate.tiles);
});

const exactV2Candidates = [];
for (let seed = 1; exactV2Candidates.length < 100; seed += 1) {
  const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed });
  const facts = buildBoardFacts(candidate.tiles);
  if (facts.validityErrors.length === 0 && facts.redAdjacencyPairs.length === 0) {
    exactV2Candidates.push(candidate);
  }
}

const exactV2 = timed("exact-v2-audit", exactV2Candidates.length, (index) => {
  evaluateDuelBoardV2(exactV2Candidates[index].tiles, { includeDiagnosticLenses: true });
});

console.table([evaluation, full, exactV2]);
console.log("Streaming calibration target: under 256 MiB RSS for 100,000 candidates");
if (evaluation.boardsPerSecond < 500 || full.boardsPerSecond < 200) {
  process.exitCode = 1;
}
