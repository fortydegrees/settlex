import { EventEmitter } from "node:events";
import { execFileSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { createNotationConverter, normalizeNotationOutcome } from "../archive/notation/convertNotation.js";

class FakeWorker extends EventEmitter {
  static instances = [];
  constructor(_url, options) {
    super();
    this.source = options.workerData;
    this.terminate = vi.fn(async () => 0);
    FakeWorker.instances.push(this);
  }
}

describe("notation worker scheduling", () => {
  it("runs one job, queues eight and refuses the tenth without waiting", async () => {
    FakeWorker.instances = [];
    const convert = createNotationConverter({ WorkerClass: FakeWorker, timeoutMs: 1000 });
    const jobs = Array.from({ length: 10 }, (_, i) => convert({ id: i }));
    expect(FakeWorker.instances).toHaveLength(1);
    expect(await jobs[9]).toEqual({ status: "unavailable", errorCode: "capacity" });
    for (let i = 0; i < 9; i++) {
      FakeWorker.instances[i].emit("message", { status: "unavailable", errorCode: "unsupported-source" });
      expect(await jobs[i]).toEqual({ status: "unavailable", errorCode: "unsupported-source" });
    }
    expect(FakeWorker.instances).toHaveLength(9);
    expect(FakeWorker.instances.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
  });

  it("settles error, early exit, timeout and constructor failure, then advances the queue", async () => {
    for (const [signal, code] of [["error", "worker-error"], ["exit", "worker-exit"], ["timeout", "timeout"]]) {
      FakeWorker.instances = [];
      const convert = createNotationConverter({ WorkerClass: FakeWorker, timeoutMs: 10 });
      const first = convert({ id: 1 });
      const second = convert({ id: 2 });
      if (signal === "error") FakeWorker.instances[0].emit("error", new Error("secret"));
      if (signal === "exit") FakeWorker.instances[0].emit("exit", 1);
      expect(await first).toEqual({ status: "unavailable", errorCode: code });
      expect(FakeWorker.instances).toHaveLength(2);
      FakeWorker.instances[1].emit("message", { status: "unavailable", errorCode: "unsupported-source" });
      await second;
    }
    const broken = createNotationConverter({ WorkerClass: class { constructor() { throw new Error("secret"); } } });
    expect(await broken({ id: 1 })).toEqual({ status: "unavailable", errorCode: "worker-start" });
  });

  it("classifies noncloneable source without exposing its contents", async () => {
    const convert = createNotationConverter();
    expect(await convert({ secret: () => "private hand" })).toEqual({ status: "unavailable", errorCode: "serialization" });
  });

  it("does not accept an incomplete worker response as a ready record", () => {
    expect(normalizeNotationOutcome({ status: "ready", record: {
      format: "han-prototype", version: 1, coverage: "complete", knowledge: "omniscient",
      result: { winner: "1" }, actions: [],
    } })).toEqual({ status: "unavailable", errorCode: "invalid-source" });
  });

  it("runs a file worker when the parent was started with an eval-only input-type flag", () => {
    const evalSource = 'const {convertNotation}=await import("./server/archive/notation/convertNotation.js"); const result=await convertNotation({initialState:{},log:[],finalState:{}}); console.log(result.errorCode);';
    for (const inputType of [["--input-type=module"], ["--input-type", "module"]]) {
      const output = execFileSync(process.execPath, [...inputType, "-e", evalSource], {
        cwd: process.cwd(), encoding: "utf8", timeout: 10_000,
      });
      expect(output.trim()).toBe("unsupported-source");
    }
  });

  it("absorbs an error emitted after a result while termination is pending", async () => {
    FakeWorker.instances = [];
    const convert = createNotationConverter({ WorkerClass: FakeWorker });
    const result = convert({ id: 1 });
    FakeWorker.instances[0].terminate = vi.fn(async function () {
      this.emit("error", new Error("late worker error"));
      return 0;
    });
    FakeWorker.instances[0].emit("message", { status: "unavailable", errorCode: "unsupported-source" });
    await expect(result).resolves.toEqual({ status: "unavailable", errorCode: "unsupported-source" });
  });
});
