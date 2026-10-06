import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { promoteBotModel, rollbackBotModel } from "../../scripts/bots/promote.mjs";

const roots = [];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function fixture(bytes = "candidate A") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bot-promotion-")); roots.push(root);
  const modelPath = path.join(root, "source.ctnn"); fs.writeFileSync(modelPath, bytes);
  return { modelPath, directory: path.join(root, "store"), checkpoint: "008", sha256: hash(bytes), workerPath: "/fixture/worker" };
}
const health = (sha256, overrides = {}) => ({ modelSha256: sha256, contract: {
  model_kind: "SettleGraph/CTNN-v3", observation_version: 3, observation_dim: 1464,
  codec_version: 1, action_count: 299,
  contract_sha256: "a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55", ...overrides
} });
const transport = (result) => () => ({ start: async () => result, close() {} });
afterEach(() => roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true })));
describe("bot promotion", () => {
  it("restores the previous selection through a verified rollback command", async () => {
    const options = fixture();
    await promoteBotModel({ ...options, checkpoint: "007", createClient: transport(health(options.sha256)) });
    await promoteBotModel({ ...options, createClient: transport(health(options.sha256)) });
    await rollbackBotModel({ directory: options.directory, workerPath: options.workerPath, createClient: transport(health(options.sha256)) });
    expect(JSON.parse(fs.readFileSync(path.join(options.directory, "current.json"))).checkpoint).toBe("007");
    expect(JSON.parse(fs.readFileSync(path.join(options.directory, "previous.json"))).checkpoint).toBe("008");
  });
  it("installs immutable bytes and selects them after native health succeeds", async () => {
    const options = fixture();
    await promoteBotModel({ ...options, createClient: transport(health(options.sha256)) });
    const selection = JSON.parse(fs.readFileSync(path.join(options.directory, "current.json")));
    expect(selection).toMatchObject({ checkpoint: "008", displayName: "SettleGraph 008", sha256: options.sha256, relativePath: "models/008/model.ctnn" });
    expect(fs.readFileSync(path.join(options.directory, selection.relativePath), "utf8")).toBe("candidate A");
  });
  it("does not replace an existing model version with different bytes", async () => {
    const options = fixture();
    await promoteBotModel({ ...options, createClient: transport(health(options.sha256)) });
    const original = fs.readFileSync(path.join(options.directory, "current.json"), "utf8");
    fs.writeFileSync(options.modelPath, "candidate B");
    await expect(promoteBotModel({ ...options, sha256: hash("candidate B"), createClient: transport(health(hash("candidate B"))) })).rejects.toThrow("immutable");
    expect(fs.readFileSync(path.join(options.directory, "current.json"), "utf8")).toBe(original);
    expect(fs.readFileSync(path.join(options.directory, "models/008/model.ctnn"), "utf8")).toBe("candidate A");
  });
  it("preserves selection when native startup fails", async () => {
    const options = fixture();
    await promoteBotModel({ ...options, createClient: transport(health(options.sha256)) });
    const original = fs.readFileSync(path.join(options.directory, "current.json"), "utf8");
    await expect(promoteBotModel({ ...options, checkpoint: "009", createClient: () => ({ start: async () => { throw new Error("bad embedded probe"); }, close() {} }) })).rejects.toThrow("bad embedded probe");
    expect(fs.readFileSync(path.join(options.directory, "current.json"), "utf8")).toBe(original);
  });
  it("rejects tampered bytes before changing the selection", async () => {
    const options = fixture();
    await expect(promoteBotModel({ ...options, sha256: "a".repeat(64) })).rejects.toThrow("SHA-256 mismatch");
    expect(fs.existsSync(path.join(options.directory, "current.json"))).toBe(false);
  });
  it.each([null, health("a".repeat(64)), health(hash("candidate A"), { observation_dim: 1445 })])("rejects invalid native health %j before activation", async (result) => {
    const options = fixture();
    await expect(promoteBotModel({ ...options, createClient: transport(result) })).rejects.toThrow();
    expect(fs.existsSync(path.join(options.directory, "current.json"))).toBe(false);
  });
  it("rolls back by selecting retained bytes through the same verified path", async () => {
    const options = fixture();
    for (const checkpoint of ["007", "008", "007"]) {
      await promoteBotModel({ ...options, checkpoint, createClient: transport(health(options.sha256)) });
    }
    expect(JSON.parse(fs.readFileSync(path.join(options.directory, "current.json"))).checkpoint).toBe("007");
    expect(fs.readFileSync(path.join(options.directory, "models/008/model.ctnn"), "utf8")).toBe("candidate A");
  });
  it("rejects an escaping model-store symlink before writing outside the store", async () => {
    const options = fixture(); const outside = path.join(path.dirname(options.modelPath), "outside");
    fs.mkdirSync(outside); fs.mkdirSync(options.directory);
    fs.symlinkSync(outside, path.join(options.directory, "models"));
    await expect(promoteBotModel({ ...options, createClient: transport(health(options.sha256)) })).rejects.toThrow("inside");
    expect(fs.readdirSync(outside)).toEqual([]);
  });
});
