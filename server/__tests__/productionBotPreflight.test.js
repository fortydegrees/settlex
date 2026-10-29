import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { checkProductionBot } from "../../scripts/bots/check-production-bot.mjs";

const MODEL_009 = "d87d121a332766667fb65481593472ba937c35386c2cc3478a654127115ecccf";
const enabledEnv = {
  SETTLEHEX_SETTLEGRAPH_V2_ENABLED: "1",
  SETTLEHEX_BOT_MODEL_MANIFEST: path.resolve("lib/server/bots/bot-model.json"),
  SETTLEHEX_SETTLEGRAPH_V2_MODEL: "/models/incumbent-009/model.ctnn",
  SETTLEHEX_SETTLEGRAPH_V2_WORKER: "/usr/local/bin/settlegraph-v2-worker",
};

describe("production bot preflight", () => {
  it("rejects disabled serving when activation explicitly requires an enabled bot", async () => {
    await expect(checkProductionBot({ env: {}, requireEnabled: true })).rejects.toThrow("enabled");
  });
  it("does not start a worker when the native bot is disabled", async () => {
    const createClient = vi.fn();
    await expect(checkProductionBot({ env: {}, createClient })).resolves.toEqual({ enabled: false });
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each(["SETTLEHEX_SETTLEGRAPH_V2_WORKER"])(
    "rejects enabled deployment without %s", async (key) => {
      await expect(checkProductionBot({ env: { ...enabledEnv, [key]: "" } })).rejects.toThrow(key);
    }
  );

  it("requires the exact production checkpoint and closes the preflight worker", async () => {
    const health = { modelSha256: MODEL_009 };
    const client = { start: vi.fn().mockResolvedValue(health), close: vi.fn() };
    const createClient = vi.fn(() => client);
    await expect(checkProductionBot({ env: enabledEnv, createClient })).resolves.toEqual({ enabled: true, modelSha256: MODEL_009 });
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
      modelPath: enabledEnv.SETTLEHEX_SETTLEGRAPH_V2_MODEL,
      workerPath: enabledEnv.SETTLEHEX_SETTLEGRAPH_V2_WORKER,
    }));
    expect(client.close).toHaveBeenCalledOnce();
  });

  it.each([
    "072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8",
    "382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca",
    "299c23241e1ca32c4b9203206a9b2c17fc7f6246d4adff0f6d3a9ad6404b736b",
    "88ef6db4c7cf1958774e8e0bcbda0eeb49ac683f50b960bd2cdb67a381e2df79",
    "d3896b710bd8d90ad98838ca89aa298800039c73efaff0fbb5a2435ac21f7e35",
  ])("rejects older model %s instead of silently serving it as 009", async (modelSha256) => {
    const client = { start: vi.fn().mockResolvedValue({ modelSha256 }), close: vi.fn() };
    await expect(checkProductionBot({ env: enabledEnv, createClient: () => client })).rejects.toThrow("checkpoint 009");
    expect(client.close).toHaveBeenCalledOnce();
  });

  it("propagates native startup failure and always closes the worker", async () => {
    const client = { start: vi.fn().mockRejectedValue(new Error("worker contract mismatch")), close: vi.fn() };
    await expect(checkProductionBot({ env: enabledEnv, createClient: () => client })).rejects.toThrow("worker contract mismatch");
    expect(client.close).toHaveBeenCalledOnce();
  });
});
