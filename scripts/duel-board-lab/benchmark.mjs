import { performance } from "node:perf_hooks";
import { buildBoardFacts } from "./analysis/boardFacts.mjs";
import { evaluateDuelBoardV2 } from "./analysis/evaluateDuelBoardV2.mjs";
import { evaluateDuelBoardV3 } from "./analysis/evaluateDuelBoardV3.mjs";
import { BOARD_FAMILIES } from "./constants.mjs";
import { generateCandidate } from "./generators/generateCandidate.mjs";

const families = Object.values(BOARD_FAMILIES);
const CANDIDATE_COUNT = 1_000;
const candidates = Array.from({ length: CANDIDATE_COUNT }, (_, index) =>
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

const evaluation = timed("v3-evaluation-only", candidates.length, (index) => {
  evaluateDuelBoardV3(candidates[index].tiles);
});
const full = timed("v3-generate-and-evaluate", CANDIDATE_COUNT, (index) => {
  const candidate = generateCandidate({
    family: families[index % families.length],
    seed: Math.floor(index / families.length) + 20_001
  });
  evaluateDuelBoardV3(candidate.tiles);
});

const rows = [evaluation, full];
if (process.env.BOARD_LAB_INCLUDE_EXACT_V2 === "1") {
  const exactV2Candidates = [];
  for (let seed = 1; exactV2Candidates.length < 3; seed += 1) {
    const candidate = generateCandidate({ family: BOARD_FAMILIES.OFFICIAL_SPIRAL, seed });
    const facts = buildBoardFacts(candidate.tiles);
    if (facts.validityErrors.length === 0 && facts.redAdjacencyPairs.length === 0) {
      exactV2Candidates.push(candidate);
    }
  }
  rows.push(timed("historical-exact-v2", exactV2Candidates.length, (index) => {
    evaluateDuelBoardV2(exactV2Candidates[index].tiles, { includeDiagnosticLenses: false });
  }));
}

console.table(rows);
console.log("V3 development-machine target: at least 100 full generate-and-evaluate boards/sec");
if (full.boardsPerSecond < 100) process.exitCode = 1;
