import { performance } from "node:perf_hooks";
import { evaluateDuelBoard } from "../analysis/evaluateDuelBoard.mjs";
import { evaluateDuelBoardV2 } from "../analysis/evaluateDuelBoardV2.mjs";
import { evaluateDuelBoardV3 } from "../analysis/evaluateDuelBoardV3.mjs";
import { canonicalBoardHash, hashBoard } from "../analysis/symmetry.mjs";
import {
  DUEL_FAIR_V2_IDENTITY,
  DUEL_FAIR_V3_IDENTITY,
  EVALUATOR_VERSION,
  EVALUATOR_VERSIONS,
  GENERATOR_VERSIONS
} from "../constants.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";
import {
  createRunStore,
  scanRun,
  updateBoundedRecordSelections
} from "./runStore.mjs";

export { updateBoundedRecordSelections };

function mergeSelectionGroups(selections) {
  const merged = new Map();
  for (const [group, bucket] of Object.entries(selections)) {
    for (const entry of bucket) {
      const selected = merged.get(entry.identity) ?? {
        identity: entry.identity,
        record: entry.record,
        selectionReasons: []
      };
      selected.selectionReasons.push(group);
      merged.set(entry.identity, selected);
    }
  }
  return [...merged.values()]
    .map((selected) => ({
      ...selected,
      selectionReasons: [...new Set(selected.selectionReasons)].sort()
    }))
    .sort((left, right) => (
      left.record.candidateIndex - right.record.candidateIndex
        || left.identity.localeCompare(right.identity)
    ));
}

function compactSelectedCandidate(selected) {
  return {
    candidateIndex: selected.record.candidateIndex,
    seed: selected.record.seed,
    canonicalSymmetryHash: selected.record.canonicalSymmetryHash,
    selectionReasons: selected.selectionReasons
  };
}

function recordCount(counts) {
  return counts.ranked + counts.pass + counts.review + counts.reject + counts.invalid;
}

function createEmptyV2AuditCounts() {
  return { total: 0, pass: 0, review: 0, reject: 0, screenReject: 0 };
}

function countV2Audit(counts, diagnostic) {
  counts.total += 1;
  if (diagnostic.screenVerdict === "reject") {
    counts.reject += 1;
    counts.screenReject += 1;
    return;
  }
  counts[diagnostic.fairness.verdict] += 1;
}

export async function runBatch({
  runDir,
  family,
  startSeed,
  count,
  shortlistSize = 20,
  evaluatorVersion = EVALUATOR_VERSION,
  auditSelections = true,
  v2AuditSelections = false
}) {
  const v2Identity = v2AuditSelections || evaluatorVersion === EVALUATOR_VERSIONS.V2
    ? DUEL_FAIR_V2_IDENTITY
    : null;
  const v3Identity = evaluatorVersion === EVALUATOR_VERSIONS.V3
    ? DUEL_FAIR_V3_IDENTITY
    : null;
  const manifest = {
    family,
    generatorVersion: GENERATOR_VERSIONS[family],
    evaluatorVersion,
    startSeed,
    count,
    shortlistSize,
    v2AuditSelections,
    v2FeatureVersion: v2Identity?.featureVersion ?? null,
    v2PolicyVersion: v2Identity?.policyVersion ?? null,
    v2ProfileHash: v2Identity?.profileHash ?? null,
    v3FeatureVersion: v3Identity?.featureVersion ?? null,
    v3PolicyVersion: v3Identity?.policyVersion ?? null,
    v3ProfileHash: v3Identity?.profileHash ?? null
  };
  const store = await createRunStore({ runDir, manifest });
  const resume = await scanRun(runDir, { shortlistSize });
  const selections = resume.selections;
  const counts = { ...resume.counts };
  let peakRss = process.memoryUsage().rss;
  const started = performance.now();
  const startingCandidateIndex = resume.nextCandidateIndex;

  for (let offset = resume.nextCandidateIndex; offset < count; offset += 1) {
    const seed = startSeed + offset;
    let record;
    try {
      const candidate = generateCandidate({ family, seed });
      const identity = {
        candidateIndex: offset,
        seed,
        generatorFamily: family,
        generatorVersion: candidate.generatorVersion,
        evaluatorVersion,
        boardHash: hashBoard(candidate.tiles),
        canonicalSymmetryHash: canonicalBoardHash(candidate.tiles)
      };
      if (evaluatorVersion === EVALUATOR_VERSIONS.V3) {
        const report = evaluateDuelBoardV3(candidate.tiles);
        record = {
          ...identity,
          status: report.status,
          invalidCodes: report.invalidCodes,
          overallScore: report.overallScore,
          scores: report.scores,
          tags: report.tags
        };
      } else if (evaluatorVersion === EVALUATOR_VERSIONS.V2) {
        const report = evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: false });
        record = {
          ...identity,
          verdict: report.screenVerdict === "reject" ? "reject" : report.fairness.verdict,
          rejectionCodes: report.screenRejectionCodes,
          overallScore: report.overallScore,
          diagnosticV2Summary: {
            screenVerdict: report.screenVerdict,
            fairnessVerdict: report.fairness?.verdict ?? null,
            tags: report.tags
          }
        };
      } else {
        const report = evaluateDuelBoard(candidate.tiles);
        record = {
          ...identity,
          evaluatorVersion: report.evaluatorVersion,
          verdict: report.verdict,
          rejectionCodes: report.rejectionReasons,
          overallScore: report.overallScore,
          componentPenalties: report.componentPenalties,
          metrics: report.metrics
        };
      }
    } catch (error) {
      record = {
        candidateIndex: offset,
        seed,
        generatorFamily: family,
        generatorVersion: GENERATOR_VERSIONS[family],
        evaluatorVersion,
        boardHash: null,
        canonicalSymmetryHash: null,
        ...(evaluatorVersion === EVALUATOR_VERSIONS.V3
          ? { status: "invalid", invalidCodes: ["invalid-board"], scores: null, tags: [] }
          : { verdict: "invalid", rejectionCodes: ["invalid-board"] }),
        error: error instanceof Error ? error.message : String(error),
        overallScore: null,
        componentPenalties: null,
        metrics: null
      };
    }
    await store.append(record);
    const countKey = record.status ?? record.verdict;
    counts[countKey] = (counts[countKey] ?? 0) + 1;
    updateBoundedRecordSelections(selections, record, shortlistSize);
    if (offset % 100 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }

  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const selected = mergeSelectionGroups(selections);
  const v2Audited = createEmptyV2AuditCounts();
  for (const selectedCandidate of selected) {
    if (selectedCandidate.record.boardHash == null) continue;
    const candidate = generateCandidate({ family, seed: selectedCandidate.record.seed });
    if (hashBoard(candidate.tiles) !== selectedCandidate.record.boardHash) {
      throw new Error(`Candidate hash mismatch for index ${selectedCandidate.record.candidateIndex}`);
    }
    const diagnosticV3 = evaluatorVersion === EVALUATOR_VERSIONS.V3
      ? evaluateDuelBoardV3(candidate.tiles)
      : null;
    const diagnostic = evaluatorVersion === EVALUATOR_VERSIONS.V1 && auditSelections
      ? evaluateDuelBoard(candidate.tiles, { includeOrderAudit: true })
      : null;
    const diagnosticV2 = v2AuditSelections || evaluatorVersion === EVALUATOR_VERSIONS.V2
      ? evaluateDuelBoardV2(candidate.tiles, { includeDiagnosticLenses: true })
      : null;
    if (diagnosticV2) countV2Audit(v2Audited, diagnosticV2);
    await store.writeBoard(`candidate-${selectedCandidate.record.candidateIndex}`, {
      selectionReasons: selectedCandidate.selectionReasons,
      selectionGroups: selectedCandidate.selectionReasons,
      record: selectedCandidate.record,
      diagnostic,
      diagnosticV2,
      diagnosticV3,
      tiles: candidate.tiles
    });
  }

  const summary = {
    counts: {
      total: recordCount(counts),
      ...counts
    },
    selectedCandidates: selected.map(compactSelectedCandidate),
    v2Audited,
    peakRssMiB: peakRss / 1024 / 1024,
    throughput: {
      evaluatedBoards: count - startingCandidateIndex,
      elapsedSeconds: (performance.now() - started) / 1000,
      boardsPerSecond: (count - startingCandidateIndex)
        / Math.max((performance.now() - started) / 1000, Number.EPSILON)
    }
  };
  await store.complete(summary);
  return summary;
}
