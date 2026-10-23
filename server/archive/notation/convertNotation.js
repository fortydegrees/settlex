import { Worker } from "node:worker_threads";
import { validateHANSyntax } from "@settlehex/game-core";

const unavailable = (errorCode) => ({ status: "unavailable", errorCode });
const validCodes = new Set(["unsupported-source", "invalid-source", "serialization", "worker-error", "worker-exit", "worker-start", "timeout", "capacity"]);
const fileWorkerExecArgv = () => {
  const args = [];
  for (let i = 0; i < process.execArgv.length; i += 1) {
    const arg = process.execArgv[i];
    if (arg === "--input-type") { i += 1; continue; }
    if (arg.startsWith("--input-type=")) continue;
    args.push(arg);
  }
  return args;
};

export const normalizeNotationOutcome = (value) => {
  if (value?.status === "ready") {
    let serializedRecord;
    let record;
    try {
      serializedRecord = JSON.stringify(value.record);
      record = JSON.parse(serializedRecord);
    } catch {
      return unavailable("serialization");
    }
    try {
      validateHANSyntax(record);
      if (record.coverage !== "complete" || record.actions.length === 0) return unavailable("invalid-source");
    } catch {
      return unavailable("invalid-source");
    }
    return { status: "ready", record, serializedRecord };
  }
  if (value?.status === "unavailable" && validCodes.has(value.errorCode)) return unavailable(value.errorCode);
  return unavailable("invalid-source");
};

export const createNotationConverter = ({
  WorkerClass = Worker,
  timeoutMs = 30_000,
  maxPending = 8,
} = {}) => {
  const pending = [];
  let running = false;

  const schedule = () => {
    if (running || pending.length === 0) return;
    running = true;
    const { source, resolve } = pending.shift();
    let worker;
    let timer;
    let settled = false;
    const finish = async (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.removeAllListeners("message");
      worker?.removeAllListeners("exit");
      try {
        await worker?.terminate();
        worker?.removeAllListeners("error");
      } catch { /* Keep the error guard if termination did not complete. */ }
      resolve(normalizeNotationOutcome(value));
      running = false;
      schedule();
    };
    try {
      worker = new WorkerClass(new URL("./worker.js", import.meta.url), { workerData: source, stdout: true, stderr: true, execArgv: fileWorkerExecArgv() });
      worker.stdout?.resume();
      worker.stderr?.resume();
      worker.on("error", () => {});
      worker.once("message", (message) => { void finish(message); });
      worker.once("error", () => { void finish(unavailable("worker-error")); });
      worker.once("exit", () => { void finish(unavailable("worker-exit")); });
      timer = setTimeout(() => { void finish(unavailable("timeout")); }, timeoutMs);
    } catch (error) {
      void finish(unavailable(error?.name === "DataCloneError" ? "serialization" : "worker-start"));
    }
  };

  return (source) => new Promise((resolve) => {
    if (running && pending.length >= maxPending) {
      resolve(unavailable("capacity"));
      return;
    }
    pending.push({ source, resolve });
    schedule();
  });
};

export const convertNotation = createNotationConverter();
