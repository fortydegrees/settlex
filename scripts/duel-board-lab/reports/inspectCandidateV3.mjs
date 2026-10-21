import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { buildBoardContextV3 } from "../analysis/boardContextV3.mjs";
import { buildBoardFacts } from "../analysis/boardFacts.mjs";
import { DUEL_FAIR_V3_PROFILE } from "../analysis/duelFairV3Profile.mjs";
import { solveOpeningDraftV3 } from "../analysis/openingDraftSolverV3.mjs";
import { buildSettlementFeaturesV3 } from "../analysis/settlementFeaturesV3.mjs";
import { hashBoard } from "../analysis/symmetry.mjs";
import { EVALUATOR_VERSIONS } from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

const round = (value) => Number(value.toFixed(DUEL_FAIR_V3_PROFILE.serializationPrecision));

function fairnessFromAdvantage(advantage) {
  return 100 * (1 - Math.min(
    Math.abs(advantage) / DUEL_FAIR_V3_PROFILE.fairnessAdvantageLimit,
    1
  ));
}

async function readCandidateRecord(runDir, candidateIndex) {
  const input = createReadStream(join(runDir, "candidates.jsonl"), { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (record.candidateIndex === candidateIndex) return record;
  }
  throw new Error(`inspection-invalid: candidate-${candidateIndex}-not-found`);
}

async function readStoredDiagnostic(runDir, candidateIndex) {
  try {
    return JSON.parse(await readFile(
      join(runDir, "boards", `candidate-${candidateIndex}.json`),
      "utf8"
    ));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`inspection-invalid: candidate-${candidateIndex}-has-no-stored-diagnostic`);
    }
    throw error;
  }
}

function exactInspection(tiles, diagnosticV3) {
  const facts = buildBoardFacts(tiles);
  const context = buildBoardContextV3(facts, DUEL_FAIR_V3_PROFILE);
  if (context.structuralErrors.length > 0) {
    throw new Error(`inspection-invalid: ${context.structuralErrors.join(",")}`);
  }
  const settlementFeatures = buildSettlementFeaturesV3(
    facts,
    context,
    DUEL_FAIR_V3_PROFILE
  );
  const featuresByNodeId = new Map(
    settlementFeatures.map((feature) => [feature.nodeId, feature])
  );
  const exact = solveOpeningDraftV3({
    facts,
    context,
    featuresByNodeId,
    profile: DUEL_FAIR_V3_PROFILE,
    candidateNodeIds: facts.nodes.map((node) => node.nodeId)
  });
  const exactFairness = fairnessFromAdvantage(exact.normalizedAdvantage);
  return Object.freeze({
    candidatePoolSize: facts.nodes.length,
    legalSequenceCount: exact.legalSequenceCount,
    normalizedAdvantage: round(exact.normalizedAdvantage),
    fairness: round(exactFairness),
    selectedLine: exact.selectedLine,
    portfolioValues: Object.freeze({
      P1: round(exact.p1.value),
      P2: round(exact.p2.value)
    }),
    differenceConvention: "exact-minus-fast",
    differences: Object.freeze({
      normalizedAdvantage: round(
        exact.normalizedAdvantage - diagnosticV3.components.normalizedAdvantage
      ),
      fairness: round(exactFairness - diagnosticV3.scores.fairness)
    })
  });
}

export async function inspectCandidateV3({ runDir, candidateIndex, exact = false }) {
  const record = await readCandidateRecord(runDir, candidateIndex);
  if (record.evaluatorVersion !== EVALUATOR_VERSIONS.V3) {
    throw new Error(`inspection-invalid: expected-duel-fair-v3-found-${record.evaluatorVersion}`);
  }
  const stored = await readStoredDiagnostic(runDir, candidateIndex);
  if (stored.record?.boardHash !== record.boardHash) {
    throw new Error("inspection-invalid: stored-record-hash-mismatch");
  }
  if (!stored.diagnosticV3) {
    throw new Error(`inspection-invalid: candidate-${candidateIndex}-has-no-stored-diagnostic`);
  }

  let exactV3 = null;
  if (exact) {
    let generated;
    try {
      generated = generateCandidate({ family: record.generatorFamily, seed: record.seed });
    } catch {
      throw new Error("inspection-invalid: regeneration-failed");
    }
    if (hashBoard(generated.tiles) !== record.boardHash) {
      throw new Error("inspection-invalid: candidate-hash-mismatch");
    }
    exactV3 = exactInspection(generated.tiles, stored.diagnosticV3);
  }

  return Object.freeze({
    source: exact ? "stored+exact" : "stored",
    record,
    diagnosticV3: stored.diagnosticV3,
    selectionReasons: stored.selectionReasons ?? stored.selectionGroups ?? [],
    exactV3
  });
}
