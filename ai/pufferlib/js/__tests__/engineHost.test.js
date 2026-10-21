import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hostPath = path.resolve(__dirname, "../engine_host.cjs");

function sendCommand(proc, payload) {
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      cleanup();
      try {
        resolve(JSON.parse(chunk.toString("utf8").trim()));
      } catch (error) {
        reject(error);
      }
    };

    const onError = (error) => {
      cleanup();
      reject(error);
    };

    const onExit = () => {
      cleanup();
      reject(new Error("Host process exited before responding"));
    };

    const cleanup = () => {
      proc.stdout.off("data", onData);
      proc.off("error", onError);
      proc.off("exit", onExit);
    };

    proc.stdout.once("data", onData);
    proc.once("error", onError);
    proc.once("exit", onExit);
    proc.stdin.write(`${JSON.stringify(payload)}\n`);
  });
}

describe("engine_host", () => {
  it("responds to spec/reset/step/close", async () => {
    const proc = spawn("node", [hostPath], { stdio: ["pipe", "pipe", "pipe"] });

    const spec = await sendCommand(proc, { cmd: "spec" });
    expect(spec.ok).toBe(true);
    expect(spec.result.actionCount).toBeGreaterThan(0);

    const reset = await sendCommand(proc, { cmd: "reset", seed: 5 });
    expect(reset.ok).toBe(true);
    expect(reset.result.mode).toBe("placement_settlement");

    const legal = reset.result.actionMask.findIndex((v) => v === 1);
    expect(legal).toBeGreaterThanOrEqual(0);

    const step = await sendCommand(proc, { cmd: "step", action: legal });
    expect(step.ok).toBe(true);
    expect(step.result.mode).toBe("placement_road");

    const close = await sendCommand(proc, { cmd: "close" });
    expect(close.ok).toBe(true);

    await new Promise((resolve) => proc.once("exit", resolve));
  });
});
