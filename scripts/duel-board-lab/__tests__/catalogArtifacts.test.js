import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalBoardHash, hashBoard } from "../analysis/symmetry.mjs";
import { generateCandidate } from "../generators/generateCandidate.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const dataPath = resolve(
  repoRoot,
  "data/board-catalogs/duel-fair-official-v1.json"
);
const runtimePath = resolve(
  repoRoot,
  "app/catana/gameSetup/catalogs/duelFairOfficialV1.generated.js"
);

describe("duel fair catalog v1 artifacts", () => {
  it("publishes 1,000 reproducible ranked official-spiral boards", async () => {
    expect(existsSync(dataPath), `${dataPath} must exist`).toBe(true);
    expect(existsSync(runtimePath), `${runtimePath} must exist`).toBe(true);

    const fullCatalog = JSON.parse(readFileSync(dataPath, "utf8"));
    const { DUEL_FAIR_BOARD_CATALOG: runtimeCatalog } = await import(
      `${pathToFileURL(runtimePath).href}?catalog-test=1`
    );

    expect(fullCatalog).toMatchObject({
      id: "duel-fair-official-v1",
      generator: {
        family: "official-spiral",
        version: "official-spiral-v1"
      },
      evaluator: {
        version: "duel-fair-v3",
        identity: {
          featureVersion: "duel-fair-v3-features-1",
          policyVersion: "duel-fair-v3",
          profileHash: expect.stringMatching(/^[a-f0-9]{64}$/)
        }
      },
      source: {
        runId: "duel-fair-official-v1-source",
        startSeed: 1,
        count: 65000
      },
      selection: {
        method: "top-overall-distinct-canonical-v1",
        size: 1000
      }
    });
    expect(fullCatalog.entries).toHaveLength(1000);
    expect(fullCatalog.generator).toMatchObject({
      boardConfigId: "standard-official-spiral",
      family: "official-spiral",
      version: "official-spiral-v1"
    });
    expect(runtimeCatalog.boardConfigId).toBe(fullCatalog.generator.boardConfigId);
    expect(runtimeCatalog).toMatchObject({
      id: fullCatalog.id,
      generatorFamily: fullCatalog.generator.family,
      generatorVersion: fullCatalog.generator.version,
      evaluatorVersion: fullCatalog.evaluator.version,
      evaluatorIdentity: fullCatalog.evaluator.identity
    });
    expect(runtimeCatalog.seeds).toEqual(
      fullCatalog.entries.map((entry) => entry.seed)
    );
    expect(new Set(fullCatalog.entries.map((entry) => entry.seed)).size).toBe(1000);
    expect(new Set(fullCatalog.entries.map((entry) => entry.boardHash)).size).toBe(1000);
    expect(
      new Set(fullCatalog.entries.map((entry) => entry.canonicalSymmetryHash)).size
    ).toBe(1000);

    for (const [index, entry] of fullCatalog.entries.entries()) {
      expect(entry.rank).toBe(index + 1);
      if (index > 0) {
        const previous = fullCatalog.entries[index - 1];
        expect(
          previous.overallScore > entry.overallScore ||
            (previous.overallScore === entry.overallScore && previous.seed < entry.seed)
        ).toBe(true);
      }
      const candidate = generateCandidate({ family: "official-spiral", seed: entry.seed });
      expect(hashBoard(candidate.tiles), `raw hash for seed ${entry.seed}`).toBe(entry.boardHash);
      expect(
        canonicalBoardHash(candidate.tiles),
        `canonical hash for seed ${entry.seed}`
      ).toBe(entry.canonicalSymmetryHash);
    }
  });
});
