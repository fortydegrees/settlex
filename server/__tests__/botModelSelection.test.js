import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readBotModelSelection } from "../../lib/server/bots/modelSelection.js";

const roots = [];
const selection = {
  checkpoint: "009", displayName: "SettleGraph 009", sha256: "a".repeat(64),
  observationVersion: 3, observationDim: 1464, actionCount: 299,
  relativePath: "models/009/model.ctnn", mode: "direct"
};
function store(overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bot-selection-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "models/009"), { recursive: true });
  fs.writeFileSync(path.join(root, "models/009/model.ctnn"), "fixture bytes");
  fs.writeFileSync(path.join(root, "current.json"), JSON.stringify({ ...selection, ...overrides }));
  return root;
}
afterEach(() => {
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
  vi.unstubAllEnvs();
  vi.resetModules();
});
describe("bot model selection", () => {
  it("derives the match opponent name from the selected future checkpoint", async () => {
    const root = store();
    vi.stubEnv("SETTLEHEX_BOT_MODEL_MANIFEST", path.join(root, "current.json"));
    vi.resetModules();
    const { resolveBotDescriptor } = await import("../../lib/server/matches/botMatch.js");
    expect(() => resolveBotDescriptor("puffer")).toThrow("Unknown bot");
    expect(resolveBotDescriptor("settlegraph-v2").displayName).toBe("SettleGraph 009");
  });
  it("selects an external checkpoint with its path, hash and display name", () => {
    const root = store();
    expect(readBotModelSelection({ env: { SETTLEHEX_BOT_MODEL_MANIFEST: path.join(root, "current.json") } }))
      .toMatchObject({ ...selection, modelPath: path.join(root, "models/009/model.ctnn") });
  });
  it("fails closed when an explicitly selected manifest is missing", () => {
    expect(() => readBotModelSelection({ env: { SETTLEHEX_BOT_MODEL_MANIFEST: "/missing/current.json" } }))
      .toThrow("manifest");
  });
  it.each([
    [{ sha256: "not-a-hash" }, "SHA-256"],
    [{ observationDim: 1445 }, "contract"],
    [{ actionCount: 300 }, "contract"],
    [{ mode: "search" }, "direct"],
    [{ displayName: "" }, "displayName"],
    [{ relativePath: "../outside.ctnn" }, "inside"],
    [{ relativePath: "/outside.ctnn" }, "relative"],
  ])("rejects invalid selection %j", (override, error) => {
    const root = store(override);
    expect(() => readBotModelSelection({ manifestPath: path.join(root, "current.json"), env: {} })).toThrow(error);
  });
  it("rejects a model symlink escaping the selection directory", () => {
    const root = store();
    fs.unlinkSync(path.join(root, "models/009/model.ctnn"));
    fs.symlinkSync(path.join(root, "current.json"), path.join(root, "models/009/model.ctnn"));
    // A symlink inside the store is allowed; escaping the store is not.
    const outside = store();
    fs.unlinkSync(path.join(root, "models/009/model.ctnn"));
    fs.symlinkSync(path.join(outside, "current.json"), path.join(root, "models/009/model.ctnn"));
    expect(() => readBotModelSelection({ manifestPath: path.join(root, "current.json"), env: {} })).toThrow("inside");
  });
});
