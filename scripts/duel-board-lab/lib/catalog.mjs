import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const EXPECTED_MANIFEST = Object.freeze({
  family: "official-spiral",
  generatorVersion: "official-spiral-v1",
  evaluatorVersion: "duel-fair-v3"
});

function assertNonEmptyString(value, name) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be finite`);
  }
}

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function assertPublishableManifest(manifest) {
  if (manifest?.status !== "complete") {
    throw new Error("Source manifest must be complete");
  }
  for (const [key, expected] of Object.entries(EXPECTED_MANIFEST)) {
    if (manifest[key] !== expected) {
      throw new Error(`Source manifest ${key} must be ${expected}`);
    }
  }
  assertPositiveInteger(manifest.startSeed, "Source manifest startSeed");
  assertPositiveInteger(manifest.count, "Source manifest count");
  assertNonEmptyString(manifest.v3FeatureVersion, "Source manifest v3FeatureVersion");
  assertNonEmptyString(manifest.v3PolicyVersion, "Source manifest v3PolicyVersion");
  assertNonEmptyString(manifest.v3ProfileHash, "Source manifest v3ProfileHash");
}

function assertScores(scores) {
  if (scores == null || typeof scores !== "object") {
    throw new Error("Ranked record scores must be an object");
  }
  for (const name of ["fairness", "quality", "interest"]) {
    assertFiniteNumber(scores[name], `Ranked record scores.${name}`);
  }
}

function assertRankedRecord(record) {
  if (!Number.isInteger(record.seed) || record.seed < 0) {
    throw new Error("Ranked record seed must be a non-negative integer");
  }
  if (record.generatorFamily !== EXPECTED_MANIFEST.family) {
    throw new Error(`Ranked record generatorFamily must be ${EXPECTED_MANIFEST.family}`);
  }
  if (record.generatorVersion !== EXPECTED_MANIFEST.generatorVersion) {
    throw new Error(`Ranked record generatorVersion must be ${EXPECTED_MANIFEST.generatorVersion}`);
  }
  if (record.evaluatorVersion !== EXPECTED_MANIFEST.evaluatorVersion) {
    throw new Error(`Ranked record evaluatorVersion must be ${EXPECTED_MANIFEST.evaluatorVersion}`);
  }
  assertNonEmptyString(record.boardHash, "Ranked record boardHash");
  assertNonEmptyString(record.canonicalSymmetryHash, "Ranked record canonicalSymmetryHash");
  assertFiniteNumber(record.overallScore, "Ranked record overallScore");
  assertScores(record.scores);
  if (!Array.isArray(record.tags) || record.tags.some((tag) => typeof tag !== "string")) {
    throw new Error("Ranked record tags must be an array of strings");
  }
}

function compareRankedRecords(left, right) {
  return right.overallScore - left.overallScore || left.seed - right.seed;
}

function toEntry(record, index) {
  return {
    rank: index + 1,
    seed: record.seed,
    boardHash: record.boardHash,
    canonicalSymmetryHash: record.canonicalSymmetryHash,
    overallScore: record.overallScore,
    scores: {
      fairness: record.scores.fairness,
      quality: record.scores.quality,
      interest: record.scores.interest
    },
    tags: [...record.tags]
  };
}

export function buildCatalog({ catalogId, runId, manifest, records, size }) {
  assertNonEmptyString(catalogId, "catalogId");
  assertNonEmptyString(runId, "runId");
  assertPositiveInteger(size, "size");
  if (!Array.isArray(records)) throw new Error("records must be an array");
  assertPublishableManifest(manifest);

  const bestByCanonicalHash = new Map();
  for (const record of records) {
    if (record.status !== "ranked") continue;
    assertRankedRecord(record);
    const existing = bestByCanonicalHash.get(record.canonicalSymmetryHash);
    if (!existing || compareRankedRecords(record, existing) < 0) {
      bestByCanonicalHash.set(record.canonicalSymmetryHash, record);
    }
  }

  const selected = [...bestByCanonicalHash.values()]
    .sort(compareRankedRecords)
    .slice(0, size);
  if (selected.length !== size) {
    throw new Error(`Catalog requires ${size} distinct ranked boards; found ${selected.length}`);
  }

  return {
    id: catalogId,
    generator: {
      family: manifest.family,
      version: manifest.generatorVersion
    },
    evaluator: {
      version: manifest.evaluatorVersion,
      identity: {
        featureVersion: manifest.v3FeatureVersion,
        policyVersion: manifest.v3PolicyVersion,
        profileHash: manifest.v3ProfileHash
      }
    },
    source: {
      runId,
      startSeed: manifest.startSeed,
      count: manifest.count
    },
    selection: {
      method: "top-overall-distinct-canonical-v1",
      size
    },
    entries: selected.map(toEntry)
  };
}

const quote = (value) => JSON.stringify(value);

export function renderRuntimeCatalog(catalog) {
  const identity = catalog.evaluator.identity;
  const seeds = catalog.entries.map((entry) => entry.seed).join(", ");
  return [
    "// Generated by pnpm board:lab:catalog. Do not edit by hand.",
    "export const DUEL_FAIR_BOARD_CATALOG = Object.freeze({",
    `  id: ${quote(catalog.id)},`,
    `  generatorFamily: ${quote(catalog.generator.family)},`,
    `  generatorVersion: ${quote(catalog.generator.version)},`,
    `  evaluatorVersion: ${quote(catalog.evaluator.version)},`,
    "  evaluatorIdentity: Object.freeze({",
    `    featureVersion: ${quote(identity.featureVersion)},`,
    `    policyVersion: ${quote(identity.policyVersion)},`,
    `    profileHash: ${quote(identity.profileHash)}`,
    "  }),",
    `  seeds: Object.freeze([${seeds}])`,
    "});",
    ""
  ].join("\n");
}

function parseCandidateRecords(value) {
  return value
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function publishCatalog({
  runDir,
  catalogId,
  size,
  dataOutput,
  runtimeOutput
}) {
  const resolvedRunDir = resolve(runDir);
  const manifest = JSON.parse(await readFile(resolve(resolvedRunDir, "manifest.json"), "utf8"));
  const records = parseCandidateRecords(
    await readFile(resolve(resolvedRunDir, "candidates.jsonl"), "utf8")
  );
  const catalog = buildCatalog({
    catalogId,
    runId: basename(dirname(resolvedRunDir)),
    manifest,
    records,
    size
  });
  const resolvedDataOutput = resolve(dataOutput);
  const resolvedRuntimeOutput = resolve(runtimeOutput);
  await Promise.all([
    mkdir(dirname(resolvedDataOutput), { recursive: true }),
    mkdir(dirname(resolvedRuntimeOutput), { recursive: true })
  ]);
  await Promise.all([
    writeFile(resolvedDataOutput, `${JSON.stringify(catalog, null, 2)}\n`),
    writeFile(resolvedRuntimeOutput, renderRuntimeCatalog(catalog))
  ]);
  return {
    catalog,
    dataOutput: resolvedDataOutput,
    runtimeOutput: resolvedRuntimeOutput
  };
}
