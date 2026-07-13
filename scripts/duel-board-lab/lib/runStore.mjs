import { once } from "node:events";
import { createReadStream } from "node:fs";
import { mkdir, open, readFile, truncate, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { DUEL_FAIR_V1_PROFILE } from "../analysis/duelFairV1Profile.mjs";

const TAIL_BYTES = 64 * 1024;
const MANIFEST_KEYS = [
  "family",
  "generatorVersion",
  "evaluatorVersion",
  "startSeed",
  "count",
  "shortlistSize",
  "v2AuditSelections",
  "v2FeatureVersion",
  "v2PolicyVersion",
  "v2ProfileHash"
];
const MANIFEST_DEFAULTS = Object.freeze({
  v2AuditSelections: false,
  v2FeatureVersion: null,
  v2PolicyVersion: null,
  v2ProfileHash: null
});

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function manifestValue(manifest, key) {
  return manifest[key] === undefined && Object.hasOwn(MANIFEST_DEFAULTS, key)
    ? MANIFEST_DEFAULTS[key]
    : manifest[key];
}

function withManifestDefaults(manifest) {
  return {
    ...manifest,
    ...Object.fromEntries(
      Object.keys(MANIFEST_DEFAULTS).map((key) => [key, manifestValue(manifest, key)])
    )
  };
}

function assertCompatibleManifest(existing, requested) {
  for (const key of MANIFEST_KEYS) {
    const existingValue = manifestValue(existing, key);
    const requestedValue = manifestValue(requested, key);
    if (existingValue !== requestedValue) {
      throw new Error(`Run manifest mismatch for ${key}: existing=${existingValue} requested=${requestedValue}`);
    }
  }
}

export async function createRunStore({ runDir, manifest }) {
  await mkdir(join(runDir, "boards"), { recursive: true });
  const manifestPath = join(runDir, "manifest.json");
  const existing = await readJsonIfPresent(manifestPath);
  const requestedManifest = withManifestDefaults(manifest);
  if (existing) assertCompatibleManifest(existing, requestedManifest);
  const baseManifest = existing ?? { ...requestedManifest, startedAt: new Date().toISOString() };
  if (!existing) {
    await writeFile(manifestPath, `${JSON.stringify({ ...baseManifest, status: "running" }, null, 2)}\n`);
  }
  const candidatesPath = join(runDir, "candidates.jsonl");
  return {
    append: async (record) => {
      const handle = await open(candidatesPath, "a");
      try {
        await handle.write(`${JSON.stringify(record)}\n`);
      } finally {
        await handle.close();
      }
    },
    writeBoard: async (name, board) => writeFile(
      join(runDir, "boards", `${name}.json`),
      `${JSON.stringify(board, null, 2)}\n`
    ),
    complete: async (summary) => writeFile(
      manifestPath,
      `${JSON.stringify({
        ...baseManifest,
        status: "complete",
        completedAt: new Date().toISOString(),
        summary
      }, null, 2)}\n`
    )
  };
}

async function truncatePartialLine(candidatesPath) {
  let handle;
  try {
    handle = await open(candidatesPath, "r+");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  try {
    const { size } = await handle.stat();
    if (size === 0) return;
    const length = Math.min(size, TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, size - length);
    if (buffer[length - 1] === 10) return;
    const finalNewline = buffer.lastIndexOf(10);
    const truncateAt = finalNewline === -1 ? size - length : size - length + finalNewline + 1;
    await truncate(candidatesPath, truncateAt);
  } finally {
    await handle.close();
  }
}

function selectionRanks(record) {
  if (!record.metrics || !Number.isFinite(record.overallScore)) {
    return record.verdict === "invalid" ? { invalid: record.candidateIndex } : {};
  }
  const resources = Object.values(record.metrics.resourceContestability.byResource);
  const penalties = Object.values(record.componentPenalties ?? {});
  return {
    ...(record.verdict === "pass" ? { top: -record.overallScore } : {}),
    bottom: record.overallScore,
    "near-dominant-top-spot": Math.abs(
      record.metrics.competitiveSpotDepth.topSpotCliff - DUEL_FAIR_V1_PROFILE.maxTopSpotCliff
    ),
    "near-competitive-spots": Math.abs(
      record.metrics.competitiveSpotDepth.competitiveSpotCount - DUEL_FAIR_V1_PROFILE.minCompetitiveSpots
    ),
    "near-resource-monopoly": Math.abs(
      Math.min(...resources.map((metric) => metric.secondIndependentRatio))
        - DUEL_FAIR_V1_PROFILE.minSecondIndependentResourceRatio
    ),
    "near-resource-routes": Math.abs(
      Math.min(...resources.map((metric) => metric.independentViableRoutes.length))
        - DUEL_FAIR_V1_PROFILE.minIndependentResourceRoutes
    ),
    "near-opening-routes": Math.abs(
      record.metrics.openingRouteDepth.distinctCompetitiveRouteCount
        - DUEL_FAIR_V1_PROFILE.minDistinctOpeningRoutes
    ),
    "near-pick-sensitive": Math.abs(
      record.metrics.pickSensitivity.maxCollapse - DUEL_FAIR_V1_PROFILE.maxPickCollapse
    ),
    disagreement: penalties.length === 0 ? Infinity : -(Math.max(...penalties) - Math.min(...penalties)),
    ...(record.rejectionCodes.includes("adjacent-red-numbers")
      ? { "adjacent-red-example": record.candidateIndex }
      : {}),
    ...(record.rejectionCodes.includes("no-compatible-opening-routes")
      ? { "incompatible-route-example": record.candidateIndex }
      : {})
  };
}

export function createEmptySelections() {
  return {};
}

export function updateBoundedRecordSelections(selections, record, limit) {
  for (const [group, rank] of Object.entries(selectionRanks(record))) {
    const bucket = selections[group] ??= [];
    const identity = record.canonicalSymmetryHash ?? `invalid:${record.candidateIndex}`;
    if (bucket.some((entry) => entry.identity === identity)) continue;
    bucket.push({ identity, rank, record });
    bucket.sort((left, right) => (
      left.rank - right.rank || left.record.candidateIndex - right.record.candidateIndex
    ));
    if (bucket.length > limit) bucket.length = limit;
  }
}

export async function scanRun(runDir, { shortlistSize = 20 } = {}) {
  const candidatesPath = join(runDir, "candidates.jsonl");
  await truncatePartialLine(candidatesPath);
  const state = {
    nextCandidateIndex: 0,
    lastRecord: null,
    counts: { pass: 0, reject: 0, invalid: 0 },
    selections: createEmptySelections(),
    seenCanonicalHashes: new Set()
  };
  let input;
  try {
    input = createReadStream(candidatesPath, { encoding: "utf8" });
    await once(input, "open");
  } catch (error) {
    if (error.code === "ENOENT") return state;
    throw error;
  }
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line) continue;
    const record = JSON.parse(line);
    if (record.candidateIndex !== state.nextCandidateIndex) {
      throw new Error(
        `Non-contiguous candidate index: expected ${state.nextCandidateIndex}, found ${record.candidateIndex}`
      );
    }
    state.nextCandidateIndex += 1;
    state.lastRecord = record;
    state.counts[record.verdict] += 1;
    if (record.canonicalSymmetryHash) state.seenCanonicalHashes.add(record.canonicalSymmetryHash);
    updateBoundedRecordSelections(state.selections, record, shortlistSize);
  }
  return state;
}
