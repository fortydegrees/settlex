import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDecisionReviewHandler } from "../api/dev/decision-review/handler.js";
import { createLocalReplayGetHandler } from "../api/dev/local-replays/handler.js";

const directories = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true })));
});
const request = path => new Request(`http://localhost:3117/api/dev/${path}`);

for (const tool of [
  { name: "DECISION_REVIEW", path: "decision-review", create: createDecisionReviewHandler },
  { name: "LOCAL_REPLAY", path: "local-replays", create: createLocalReplayGetHandler },
]) {
  describe(`${tool.path} environment compatibility`, () => {
    async function setup() {
      const directory = await mkdtemp(join(tmpdir(), "settlehex-dev-env-"));
      directories.push(directory);
      await writeFile(join(directory, "index.json"), JSON.stringify({ format: "settlex-decision-review-index", schemaVersion: 1, cases: [] }));
      vi.stubEnv(`SETTLEHEX_${tool.name}_DIR`, "");
      delete process.env[`SETTLEHEX_${tool.name}_DIR`];
      vi.stubEnv(`SETTLEX_${tool.name}_DIR`, directory);
      return directory;
    }
    it("reads the legacy directory only when the canonical setting is absent", async () => {
      await setup();
      const response = await tool.create({ mode: "development" })(request(tool.path));
      expect(response.status).toBe(200);
    });
    it("uses the canonical directory before a conflicting legacy value", async () => {
      const directory = await setup();
      vi.stubEnv(`SETTLEHEX_${tool.name}_DIR`, directory);
      vi.stubEnv(`SETTLEX_${tool.name}_DIR`, `${directory}/missing`);
      expect((await tool.create({ mode: "development" })(request(tool.path))).status).toBe(200);
    });
    it("treats an empty canonical directory as disabled despite a valid legacy directory", async () => {
      await setup();
      vi.stubEnv(`SETTLEHEX_${tool.name}_DIR`, "");
      expect((await tool.create({ mode: "development" })(request(tool.path))).status).toBe(503);
    });
  });
}

describe("external recording adapter environment compatibility", () => {
  it.each([undefined, ""])("uses absent-only adapter fallback (canonical %s)", async canonical => {
    const directory = await mkdtemp(join(tmpdir(), "settlehex-adapter-env-"));
    directories.push(directory);
    const adapter = join(directory, "adapter.mjs");
    await writeFile(adapter, 'export const summarize = () => ({ players: ["A", "B"], eventCount: 1, isComplete: false });');
    await writeFile(join(directory, "synthetic.jsonl"), "synthetic recording\n");
    vi.stubEnv("SETTLEHEX_LOCAL_REPLAY_ADAPTER", canonical ?? "");
    if (canonical === undefined) delete process.env.SETTLEHEX_LOCAL_REPLAY_ADAPTER;
    vi.stubEnv("SETTLEX_LOCAL_REPLAY_ADAPTER", adapter);
    const response = await createLocalReplayGetHandler({ directory, mode: "development" })(request("local-replays"));
    expect(response.status).toBe(200);
    expect((await response.json()).total).toBe(canonical === undefined ? 1 : 0);
  });
  it("prefers the canonical adapter over a conflicting legacy path", async () => {
    const directory = await mkdtemp(join(tmpdir(), "settlehex-adapter-env-"));
    directories.push(directory);
    const adapter = join(directory, "adapter.mjs");
    await writeFile(adapter, 'export const summarize = () => ({ players: ["A", "B"], eventCount: 1, isComplete: false });');
    await writeFile(join(directory, "synthetic.jsonl"), "synthetic recording\n");
    vi.stubEnv("SETTLEHEX_LOCAL_REPLAY_ADAPTER", adapter);
    vi.stubEnv("SETTLEX_LOCAL_REPLAY_ADAPTER", `${directory}/missing.mjs`);
    const response = await createLocalReplayGetHandler({ directory, mode: "development" })(request("local-replays"));
    expect(response.status).toBe(200);
    expect((await response.json()).total).toBe(1);
  });
});
