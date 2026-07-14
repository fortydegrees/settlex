import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DUEL_FAIR_V2_PROFILE } from "../analysis/duelFairV2Profile.mjs";
import { hashOpeningProfile } from "../analysis/openingPolicy.mjs";
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
    expect(JSON.parse(await readFile(join(runDir, "manifest.json"), "utf8")))
      .toEqual(expect.objectContaining({
        v2AuditSelections: false,
        v2FeatureVersion: null,
        v2PolicyVersion: null,
        v2ProfileHash: null
      }));
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

  it("accepts historical v1 manifests without rewriting missing v2 defaults", async () => {
    const runDir = await temporaryRunDir();
    const historicalManifest = {
      ...manifest({ shortlistSize: 2 }),
      startedAt: "2026-07-11T00:00:00.000Z",
      status: "running"
    };
    const manifestPath = join(runDir, "manifest.json");
    await writeFile(manifestPath, `${JSON.stringify(historicalManifest, null, 2)}\n`);
    const before = await readFile(manifestPath, "utf8");

    await createRunStore({
      runDir,
      manifest: {
        ...manifest({ shortlistSize: 2 }),
        v2AuditSelections: false,
        v2FeatureVersion: null,
        v2PolicyVersion: null,
        v2ProfileHash: null
      }
    });

    expect(await readFile(manifestPath, "utf8")).toBe(before);
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
      evaluatorVersion: "duel-fair-v1",
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
    expect(firstManifest).toEqual(expect.objectContaining({
      v2AuditSelections: false,
      v2FeatureVersion: null,
      v2PolicyVersion: null,
      v2ProfileHash: null
    }));
    expect(firstSummary.v2Audited).toEqual({
      total: 0,
      pass: 0,
      review: 0,
      reject: 0,
      screenReject: 0
    });

    for (const record of firstRecords) {
      expect(record.metrics.orderSensitivityAudit).toBeNull();
    }
    const boardFiles = (await readdir(join(firstRunDir, "boards"))).filter((name) => name.endsWith(".json"));
    expect(boardFiles.length).toBeGreaterThan(0);
    for (const name of boardFiles) {
      const payload = JSON.parse(await readFile(join(firstRunDir, "boards", name), "utf8"));
      expect(payload.selectionGroups).toEqual([...payload.selectionGroups].sort());
      expect(payload.diagnostic.metrics.orderSensitivityAudit).not.toBeNull();
      expect(payload.diagnosticV2).toBeNull();
    }
  });

  it("audits only bounded selected boards with v2 without relabelling v1 rows", async () => {
    const v1RunDir = await temporaryRunDir();
    const v2RunDir = await temporaryRunDir();
    const options = {
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      evaluatorVersion: "duel-fair-v1",
      startSeed: 45,
      count: 4,
      shortlistSize: 1,
      auditSelections: true
    };

    const v1Summary = await runBatch({ runDir: v1RunDir, ...options });
    const summary = await runBatch({
      runDir: v2RunDir,
      ...options,
      v2AuditSelections: true
    });
    const v1Records = await readRecords(v1RunDir);
    const v2Records = await readRecords(v2RunDir);
    const boardFiles = (await readdir(join(v2RunDir, "boards")))
      .filter((name) => name.endsWith(".json"));
    const payloads = await Promise.all(boardFiles.map(async (name) => (
      JSON.parse(await readFile(join(v2RunDir, "boards", name), "utf8"))
    )));
    const manifestV2 = JSON.parse(await readFile(join(v2RunDir, "manifest.json"), "utf8"));

    expect(v2Records).toEqual(v1Records);
    expect(summary.selectedCandidates).toEqual(v1Summary.selectedCandidates);
    expect(summary.v2Audited.total).toBeGreaterThan(0);
    expect(summary.v2Audited).toEqual(expect.objectContaining({
      pass: expect.any(Number),
      review: expect.any(Number),
      reject: expect.any(Number),
      screenReject: expect.any(Number)
    }));
    expect(summary.v2Audited.total).toBe(payloads.length);
    expect(summary.v2Audited.total).toBe(
      summary.v2Audited.pass + summary.v2Audited.review + summary.v2Audited.reject
    );
    expect(summary.v2Audited.screenReject).toBeLessThanOrEqual(summary.v2Audited.reject);
    for (const payload of payloads) {
      expect(payload.record).toEqual(v1Records[payload.record.candidateIndex]);
      expect(payload.diagnosticV2.evaluatorIdentity.policyVersion).toBe("duel-fair-v2");
      if (payload.diagnosticV2.screenVerdict === "pass") {
        expect(payload.diagnosticV2.fairness.solvedLine).toHaveLength(4);
        expect(payload.diagnosticV2.fairness.diagnosticLensResults).toHaveLength(2);
      } else {
        expect(payload.diagnosticV2.fairness).toBeNull();
      }
    }
    expect(payloads.some(({ diagnosticV2 }) => diagnosticV2.fairness?.solvedLine.length === 4))
      .toBe(true);
    expect(manifestV2).toEqual(expect.objectContaining({
      v2AuditSelections: true,
      v2FeatureVersion: DUEL_FAIR_V2_PROFILE.featureVersion,
      v2PolicyVersion: DUEL_FAIR_V2_PROFILE.policyVersion,
      v2ProfileHash: hashOpeningProfile(DUEL_FAIR_V2_PROFILE)
    }));
    expect(manifestV2.v2ProfileHash).toMatch(/^[a-f0-9]{64}$/);
  }, 20_000);

  it("continues an interrupted run at the first missing candidate index", async () => {
    const sourceRunDir = await temporaryRunDir();
    const runDir = await temporaryRunDir();
    const options = {
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      evaluatorVersion: "duel-fair-v1",
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
      expect(payload.diagnosticV2).toBeNull();
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

  it("streams compact v3 records and materialises bounded v3 diagnostics", async () => {
    const runDir = await temporaryRunDir();
    const summary = await runBatch({
      runDir,
      family: BOARD_FAMILIES.OFFICIAL_SPIRAL,
      startSeed: 45,
      count: 5,
      shortlistSize: 1
    });
    const records = await readRecords(runDir);
    const manifestV3 = JSON.parse(await readFile(join(runDir, "manifest.json"), "utf8"));
    const boardFiles = (await readdir(join(runDir, "boards")))
      .filter((name) => name.endsWith(".json"));

    expect(summary.counts).toEqual(expect.objectContaining({ total: 5, ranked: 5, invalid: 0 }));
    expect(summary.throughput.boardsPerSecond).toBeGreaterThan(0);
    expect(manifestV3).toEqual(expect.objectContaining({
      evaluatorVersion: "duel-fair-v3",
      v3FeatureVersion: "duel-fair-v3-features-1",
      v3PolicyVersion: "duel-fair-v3",
      v3ProfileHash: expect.stringMatching(/^[a-f0-9]{64}$/)
    }));
    for (const record of records) {
      expect(record).toEqual(expect.objectContaining({
        status: "ranked",
        overallScore: expect.any(Number),
        scores: {
          fairness: expect.any(Number),
          quality: expect.any(Number),
          interest: expect.any(Number)
        },
        tags: expect.any(Array)
      }));
      expect(record).not.toHaveProperty("choiceDiagnostics");
      expect(record).not.toHaveProperty("selectedPortfolios");
    }
    for (const name of boardFiles) {
      const payload = JSON.parse(await readFile(join(runDir, "boards", name), "utf8"));
      expect(payload.selectionReasons).toEqual([...payload.selectionReasons].sort());
      expect(payload.diagnosticV3.status).toBe("ranked");
      expect(payload.diagnostic).toBeNull();
      expect(payload.diagnosticV2).toBeNull();
    }
  });

  it("keeps separate bounded v3 score ranks without duplicate symmetries", () => {
    const selections = {};
    const record = (candidateIndex, hash, scores) => ({
      candidateIndex,
      canonicalSymmetryHash: hash,
      status: "ranked",
      overallScore: scores.overall,
      scores: {
        fairness: scores.fairness,
        quality: scores.quality,
        interest: scores.interest
      }
    });

    updateBoundedRecordSelections(selections, record(0, "same", {
      overall: 80, fairness: 70, quality: 90, interest: 50
    }), 2);
    updateBoundedRecordSelections(selections, record(1, "same", {
      overall: 99, fairness: 99, quality: 99, interest: 99
    }), 2);
    updateBoundedRecordSelections(selections, record(2, "other", {
      overall: 85, fairness: 60, quality: 95, interest: 40
    }), 2);
    updateBoundedRecordSelections(selections, record(3, "third", {
      overall: 40, fairness: 95, quality: 30, interest: 90
    }), 2);

    expect(Object.keys(selections).sort()).toEqual([
      "fairness-high",
      "interest-high",
      "overall-high",
      "overall-low",
      "quality-high"
    ]);
    expect(selections["overall-high"].map((entry) => entry.record.candidateIndex)).toEqual([2, 0]);
    expect(selections["overall-low"].map((entry) => entry.record.candidateIndex)).toEqual([3, 0]);
    for (const bucket of Object.values(selections)) {
      expect(bucket.length).toBeLessThanOrEqual(2);
      expect(new Set(bucket.map((entry) => entry.identity)).size).toBe(bucket.length);
    }
  });
});
