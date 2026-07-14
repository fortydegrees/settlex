import { performance } from "node:perf_hooks";
import { buildBoardContextV3 } from "./analysis/boardContextV3.mjs";
import { buildBoardFacts } from "./analysis/boardFacts.mjs";
import { selectCandidatePoolV3 } from "./analysis/candidatePoolV3.mjs";
import { DUEL_FAIR_V3_PROFILE } from "./analysis/duelFairV3Profile.mjs";
import { solveOpeningDraftV3 } from "./analysis/openingDraftSolverV3.mjs";
import {
  compareFastAndExactV3,
  passesV3Calibration
} from "./analysis/oracleCalibrationV3.mjs";
import { buildSettlementFeaturesV3 } from "./analysis/settlementFeaturesV3.mjs";
import { BOARD_FAMILIES } from "./constants.mjs";
import { generateCandidate } from "./generators/generateCandidate.mjs";

export const V3_ORACLE_SEEDS = Object.freeze([
  1, 47, 109, 248, 310, 409, 548, 651, 725, 820, 907, 2604
]);

const fairnessFromAdvantage = (advantage) => 100 * (1 - Math.min(
  Math.abs(advantage) / DUEL_FAIR_V3_PROFILE.fairnessAdvantageLimit,
  1
));

const rows = [];
for (const seed of V3_ORACLE_SEEDS) {
  const candidate = generateCandidate({
    family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
    seed
  });
  const facts = buildBoardFacts(candidate.tiles);
  const context = buildBoardContextV3(facts, DUEL_FAIR_V3_PROFILE);
  const settlementFeatures = buildSettlementFeaturesV3(
    facts,
    context,
    DUEL_FAIR_V3_PROFILE
  );
  const featuresByNodeId = new Map(
    settlementFeatures.map((feature) => [feature.nodeId, feature])
  );
  const candidatePool = selectCandidatePoolV3({
    facts,
    settlementFeatures,
    profile: DUEL_FAIR_V3_PROFILE
  });
  const fastStarted = performance.now();
  const fast = solveOpeningDraftV3({
    facts,
    context,
    featuresByNodeId,
    profile: DUEL_FAIR_V3_PROFILE,
    candidateNodeIds: candidatePool.nodeIds
  });
  const fastMilliseconds = performance.now() - fastStarted;
  const exactStarted = performance.now();
  const exact = solveOpeningDraftV3({
    facts,
    context,
    featuresByNodeId,
    profile: DUEL_FAIR_V3_PROFILE,
    candidateNodeIds: facts.nodes.map((node) => node.nodeId)
  });
  const exactMilliseconds = performance.now() - exactStarted;
  rows.push({
    seed,
    fastAdvantage: fast.normalizedAdvantage,
    exactAdvantage: exact.normalizedAdvantage,
    fastFairness: fairnessFromAdvantage(fast.normalizedAdvantage),
    exactFairness: fairnessFromAdvantage(exact.normalizedAdvantage),
    fastPoolSize: candidatePool.nodeIds.length,
    fastMilliseconds,
    exactMilliseconds
  });
  console.log(
    `seed ${seed}: fast ${fast.normalizedAdvantage.toFixed(4)} `
      + `exact ${exact.normalizedAdvantage.toFixed(4)} `
      + `(${fastMilliseconds.toFixed(1)}ms / ${exactMilliseconds.toFixed(1)}ms)`
  );
}

const metrics = compareFastAndExactV3(rows);
console.table({
  signAgreement: `${metrics.signAgreement}/${rows.length}`,
  medianAbsoluteAdvantageError: metrics.medianAbsoluteAdvantageError.toFixed(6),
  fairnessSpearman: metrics.fairnessSpearman.toFixed(6)
});
if (!passesV3Calibration(metrics)) process.exitCode = 1;
