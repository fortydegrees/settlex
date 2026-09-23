import { describe, expect, it, vi } from "vitest";
import { checkProductionBot } from "../../scripts/bots/check-production-bot.mjs";

const MODEL_005 = "382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca";
const enabledEnv = {
  SETTLEX_SETTLEGRAPH_V2_ENABLED: "1",
  SETTLEX_SETTLEGRAPH_V2_MODEL: "/models/incumbent-005/model.ctnn",
  SETTLEX_SETTLEGRAPH_V2_WORKER: "/usr/local/bin/settlegraph-v2-worker",
};

describe("production bot preflight", () => {
  it("does not start a worker when the native bot is disabled", async () => {
    const createClient = vi.fn();
    await expect(checkProductionBot({ env: {}, createClient })).resolves.toEqual({ enabled: false });
    expect(createClient).not.toHaveBeenCalled();
  });

  it.each(["SETTLEX_SETTLEGRAPH_V2_MODEL", "SETTLEX_SETTLEGRAPH_V2_WORKER"])(
    "rejects enabled deployment without %s", async (key) => {
      await expect(checkProductionBot({ env: { ...enabledEnv, [key]: "" } })).rejects.toThrow(key);
    }
  );

  it("requires the exact production checkpoint and closes the preflight worker", async () => {
    const health = { modelSha256: MODEL_005 };
    const client = { start: vi.fn().mockResolvedValue(health), close: vi.fn() };
    const createClient = vi.fn(() => client);
    await expect(checkProductionBot({ env: enabledEnv, createClient })).resolves.toEqual({ enabled: true, modelSha256: MODEL_005 });
    expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
      modelPath: enabledEnv.SETTLEX_SETTLEGRAPH_V2_MODEL,
      workerPath: enabledEnv.SETTLEX_SETTLEGRAPH_V2_WORKER,
    }));
    expect(client.close).toHaveBeenCalledOnce();
  });

  it("rejects a valid older model instead of silently serving it as 005", async () => {
    const client = { start: vi.fn().mockResolvedValue({ modelSha256: "072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8" }), close: vi.fn() };
    await expect(checkProductionBot({ env: enabledEnv, createClient: () => client })).rejects.toThrow("checkpoint 005");
    expect(client.close).toHaveBeenCalledOnce();
  });

  it("propagates native startup failure and always closes the worker", async () => {
    const client = { start: vi.fn().mockRejectedValue(new Error("worker contract mismatch")), close: vi.fn() };
    await expect(checkProductionBot({ env: enabledEnv, createClient: () => client })).rejects.toThrow("worker contract mismatch");
    expect(client.close).toHaveBeenCalledOnce();
  });
});
