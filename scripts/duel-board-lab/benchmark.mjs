import { performance } from "node:perf_hooks";
import { evaluateDuelBoard } from "./analysis/evaluateDuelBoard.mjs";
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
  for (let index = 0; index < count; index += 1) {
    work(index);
    if (index % 100 === 0) {
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }
  }
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

console.table([evaluation, full]);
console.log("Streaming calibration target: under 256 MiB RSS for 100,000 candidates");
if (evaluation.boardsPerSecond < 500 || full.boardsPerSecond < 200) {
  process.exitCode = 1;
}
