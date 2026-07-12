import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BOARD_FAMILIES } from "../generators/generateCandidate.mjs";
import { runBatch, updateBoundedRecordSelections } from "../lib/runBatch.mjs";
import { createRunStore, scanRun } from "../lib/runStore.mjs";

const paths = [];

afterEach(async () => Promise.all(paths.splice(0).map((path) => rm(path, { recursive: true, force: true }))));

const manifest = (overrides = {}) => ({
  family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
  generatorVersion: "official-spiral-v1",
  evaluatorVersion: "duel-fair-v1",
  startSeed: 10,
  count: 2,
  ...overrides
});

async function temporaryRunDir() {
  const runDir = await mkdtemp(join(tmpdir(), "duel-board-run-"));
  paths.push(runDir);
  return runDir;
}

async function readRecords(runDir) {
  return (await readFile(join(runDir, "candidates.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe("duel board run store", () => {
  it("appends complete JSONL records and resumes at the next index", async () => {
    const runDir = await temporaryRunDir();
    const store = await createRunStore({ runDir, manifest: manifest() });
    await store.append({ candidateIndex: 0, seed: 10, verdict: "pass", rejectionCodes: [], overallScore: 80 });
    await store.append({ candidateIndex: 1, seed: 11, verdict: "reject", rejectionCodes: ["resource-monopoly"], overallScore: 40 });

    const scanned = await scanRun(runDir);

    expect(scanned.nextCandidateIndex).toBe(2);
    expect(scanned.lastRecord.seed).toBe(11);
    expect(await readFile(join(runDir, "candidates.jsonl"), "utf8")).toMatch(/\n$/);
  });

  it("truncates a partial final JSON line before resuming", async () => {
    const runDir = await temporaryRunDir();
    await writeFile(join(runDir, "manifest.json"), JSON.stringify(manifest()));
    await writeFile(join(runDir, "candidates.jsonl"), '{"candidateIndex":0,"seed":10,"verdict":"pass","rejectionCodes":[],"overallScore":80}\n{"candidateIndex":1');

    const scanned = await scanRun(runDir);

    expect(scanned.nextCandidateIndex).toBe(1);
    expect(await readFile(join(runDir, "candidates.jsonl"), "utf8")).toBe('{"candidateIndex":0,"seed":10,"verdict":"pass","rejectionCodes":[],"overallScore":80}\n');
  });

  it("rejects a request that is incompatible with the existing manifest", async () => {
    const runDir = await temporaryRunDir();
    await createRunStore({ runDir, manifest: manifest({ shortlistSize: 2 }) });

    await expect(createRunStore({ runDir, manifest: manifest({ count: 3, shortlistSize: 2 }) }))
      .rejects.toThrow("Run manifest mismatch for count: existing=2 requested=3");
  });

  it("rejects non-contiguous persisted candidate indices", async () => {
    const runDir = await temporaryRunDir();
    await writeFile(join(runDir, "candidates.jsonl"), '{"candidateIndex":1,"verdict":"invalid"}\n');

    await expect(scanRun(runDir)).rejects.toThrow("Non-contiguous candidate index: expected 0, found 1");
  });
});

describe("duel board batch runner", () => {
  it("writes one record per candidate and reruns without duplicate records", async () => {
    const firstRunDir = await temporaryRunDir();
    const secondRunDir = await temporaryRunDir();
    const options = {
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      startSeed: 20,
      count: 5,
      shortlistSize: 2,
      auditSelections: true
    };

    const firstSummary = await runBatch({ runDir: firstRunDir, ...options });
    const firstRecords = await readRecords(firstRunDir);
    await runBatch({ runDir: firstRunDir, ...options });
    const resumedRecords = await readRecords(firstRunDir);
    await runBatch({
      runDir: secondRunDir,
      ...options,
      family: BOARD_FAMILIES.FREEFORM_RANDOM
    });
    const firstManifest = JSON.parse(await readFile(join(firstRunDir, "manifest.json"), "utf8"));
    const secondManifest = JSON.parse(await readFile(join(secondRunDir, "manifest.json"), "utf8"));

    expect(firstRecords).toHaveLength(5);
    expect(resumedRecords).toEqual(firstRecords);
    expect(resumedRecords.map((record) => record.candidateIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(firstSummary.counts).toEqual(expect.objectContaining({ total: 5 }));
    expect(firstSummary.selectedCandidates.length).toBeLessThanOrEqual(22);
    expect(firstSummary.peakRssMiB).toEqual(expect.any(Number));
    expect([
      {
        family: firstManifest.family,
        generatorVersion: firstManifest.generatorVersion,
        evaluatorVersion: firstManifest.evaluatorVersion
      },
      {
        family: secondManifest.family,
        generatorVersion: secondManifest.generatorVersion,
        evaluatorVersion: secondManifest.evaluatorVersion
      }
    ]).toEqual([
      {
        family: "official-spiral",
        generatorVersion: "official-spiral-v1",
        evaluatorVersion: "duel-fair-v1"
      },
      {
        family: "freeform-random",
        generatorVersion: "freeform-random-v1",
        evaluatorVersion: "duel-fair-v1"
      }
    ]);
    expect(firstManifest.status).toBe("complete");
    expect(firstManifest.summary.peakRssMiB).toEqual(expect.any(Number));

    for (const record of firstRecords) {
      expect(record.metrics.orderSensitivityAudit).toBeNull();
    }
    const boardFiles = (await readdir(join(firstRunDir, "boards"))).filter((name) => name.endsWith(".json"));
    expect(boardFiles.length).toBeGreaterThan(0);
    for (const name of boardFiles) {
      const payload = JSON.parse(await readFile(join(firstRunDir, "boards", name), "utf8"));
      expect(payload.selectionGroups).toEqual([...payload.selectionGroups].sort());
      expect(payload.diagnostic.metrics.orderSensitivityAudit).not.toBeNull();
    }
  });

  it("continues an interrupted run at the first missing candidate index", async () => {
    const sourceRunDir = await temporaryRunDir();
    const runDir = await temporaryRunDir();
    const options = {
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      startSeed: 30,
      count: 5,
      shortlistSize: 1,
      auditSelections: false
    };
    const uninterruptedSummary = await runBatch({ runDir: sourceRunDir, ...options });
    const initialRecords = await readRecords(sourceRunDir);
    const interruptedStore = await createRunStore({
      runDir,
      manifest: manifest({ startSeed: 30, count: 5, shortlistSize: 1 })
    });
    await interruptedStore.append(initialRecords[0]);
    await interruptedStore.append(initialRecords[1]);

    const resumedSummary = await runBatch({ runDir, ...options });
    const records = await readRecords(runDir);

    expect(records.map((record) => record.candidateIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(records.slice(0, 2)).toEqual(initialRecords.slice(0, 2));
    expect(resumedSummary.selectedCandidates).toEqual(uninterruptedSummary.selectedCandidates);
    const boardFiles = (await readdir(join(runDir, "boards"))).filter((name) => name.endsWith(".json"));
    for (const name of boardFiles) {
      const payload = JSON.parse(await readFile(join(runDir, "boards", name), "utf8"));
      expect(payload.diagnostic).toBeNull();
    }
  });

  it("keeps each selection bucket bounded and symmetry-deduplicated", () => {
    const selections = {};
    const baseRecord = {
      verdict: "pass",
      rejectionCodes: [],
      componentPenalties: { one: 0.1, two: 0.2 },
      metrics: {
        competitiveSpotDepth: { topSpotCliff: 0.1, competitiveSpotCount: 8 },
        resourceContestability: {
          byResource: {
            Wood: { secondIndependentRatio: 0.5, independentViableRoutes: [1, 2] }
          }
        },
        openingRouteDepth: { distinctCompetitiveRouteCount: 8 },
        pickSensitivity: { maxCollapse: 0.5 }
      }
    };

    updateBoundedRecordSelections(selections, { ...baseRecord, candidateIndex: 0, canonicalSymmetryHash: "same", overallScore: 70 }, 2);
    updateBoundedRecordSelections(selections, { ...baseRecord, candidateIndex: 1, canonicalSymmetryHash: "same", overallScore: 90 }, 2);
    updateBoundedRecordSelections(selections, { ...baseRecord, candidateIndex: 2, canonicalSymmetryHash: "other", overallScore: 80 }, 2);
    updateBoundedRecordSelections(selections, { ...baseRecord, candidateIndex: 3, canonicalSymmetryHash: "third", overallScore: 60 }, 2);

    for (const bucket of Object.values(selections)) {
      expect(bucket.length).toBeLessThanOrEqual(2);
      expect(new Set(bucket.map((entry) => entry.identity)).size).toBe(bucket.length);
    }
    expect(selections.top.map((entry) => entry.record.candidateIndex)).toEqual([2, 0]);
  });
});
