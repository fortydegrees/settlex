import { evaluateDuelBoard } from "../analysis/evaluateDuelBoard.mjs";
import { canonicalBoardHash, hashBoard } from "../analysis/symmetry.mjs";
import { EVALUATOR_VERSION, GENERATOR_VERSIONS } from "../constants.mjs";
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
        selectionGroups: []
      };
      selected.selectionGroups.push(group);
      merged.set(entry.identity, selected);
    }
  }
  return [...merged.values()]
    .map((selected) => ({
      ...selected,
      selectionGroups: [...new Set(selected.selectionGroups)].sort()
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
    selectionGroups: selected.selectionGroups
  };
}

function recordCount(counts) {
  return counts.pass + counts.reject + counts.invalid;
}

export async function runBatch({
  runDir,
  family,
  startSeed,
  count,
  shortlistSize = 20,
  auditSelections = true
}) {
  const manifest = {
    family,
    generatorVersion: GENERATOR_VERSIONS[family],
    evaluatorVersion: EVALUATOR_VERSION,
    startSeed,
    count,
    shortlistSize
  };
  const store = await createRunStore({ runDir, manifest });
  const resume = await scanRun(runDir, { shortlistSize });
  const selections = resume.selections;
  const counts = { ...resume.counts };
  let peakRss = process.memoryUsage().rss;

  for (let offset = resume.nextCandidateIndex; offset < count; offset += 1) {
    const seed = startSeed + offset;
    let record;
    try {
      const candidate = generateCandidate({ family, seed });
      const report = evaluateDuelBoard(candidate.tiles);
      record = {
        candidateIndex: offset,
        seed,
        generatorFamily: family,
        generatorVersion: candidate.generatorVersion,
        evaluatorVersion: report.evaluatorVersion,
        boardHash: hashBoard(candidate.tiles),
        canonicalSymmetryHash: canonicalBoardHash(candidate.tiles),
        verdict: report.verdict,
        rejectionCodes: report.rejectionReasons,
        overallScore: report.overallScore,
        componentPenalties: report.componentPenalties,
        metrics: report.metrics
      };
    } catch (error) {
      record = {
        candidateIndex: offset,
        seed,
        generatorFamily: family,
        generatorVersion: GENERATOR_VERSIONS[family],
        evaluatorVersion: EVALUATOR_VERSION,
        boardHash: null,
        canonicalSymmetryHash: null,
        verdict: "invalid",
        rejectionCodes: ["invalid-board"],
        error: error instanceof Error ? error.message : String(error),
        overallScore: null,
        componentPenalties: null,
        metrics: null
      };
    }
    await store.append(record);
    counts[record.verdict] += 1;
    updateBoundedRecordSelections(selections, record, shortlistSize);
    if (offset % 100 === 0) peakRss = Math.max(peakRss, process.memoryUsage().rss);
  }

  peakRss = Math.max(peakRss, process.memoryUsage().rss);
  const selected = mergeSelectionGroups(selections);
  for (const selectedCandidate of selected) {
    if (selectedCandidate.record.boardHash == null) continue;
    const candidate = generateCandidate({ family, seed: selectedCandidate.record.seed });
    if (hashBoard(candidate.tiles) !== selectedCandidate.record.boardHash) {
      throw new Error(`Candidate hash mismatch for index ${selectedCandidate.record.candidateIndex}`);
    }
    const diagnostic = auditSelections
      ? evaluateDuelBoard(candidate.tiles, { includeOrderAudit: true })
      : null;
    await store.writeBoard(`candidate-${selectedCandidate.record.candidateIndex}`, {
      selectionGroups: selectedCandidate.selectionGroups,
      record: selectedCandidate.record,
      diagnostic,
      tiles: candidate.tiles
    });
  }

  const summary = {
    counts: {
      total: recordCount(counts),
      ...counts
    },
    selectedCandidates: selected.map(compactSelectedCandidate),
    peakRssMiB: peakRss / 1024 / 1024
  };
  await store.complete(summary);
  return summary;
}
