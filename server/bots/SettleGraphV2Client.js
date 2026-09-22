import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export const SETTLEGRAPH_V2_MODEL_SHA256 =
  "072906d17077f1ed3fa4e9254999a8920ec243bdda3ab42575258492b58465c8";
export const SETTLEGRAPH_005_MODEL_SHA256 =
  "382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca";
export const SETTLEGRAPH_V2_CONTRACT_SHA256 =
  "a64b9d0daaa3bb6f60f0c0c42bfc52b53ba4a4672263b85d899805323bc97e55";

const EXPECTED_CONTRACT = Object.freeze({
  model_kind: "SettleGraph/CTNN-v2",
  observation_version: 2,
  observation_dim: 1445,
  codec_version: 1,
  action_count: 299,
  contract_sha256: SETTLEGRAPH_V2_CONTRACT_SHA256
});

const INCUMBENT_005_CONTRACT = Object.freeze({
  ...EXPECTED_CONTRACT,
  model_kind: "SettleGraph/CTNN-v3",
  observation_version: 3,
  observation_dim: 1464
});

export class SettleGraphV2Client {
  constructor({
    workerPath,
    modelPath,
    workerCwd,
    timeoutMs = 3000,
    spawnImpl = spawn,
    logger = console
  }) {
    this.workerPath = workerPath;
    this.modelPath = modelPath;
    this.workerCwd = workerCwd;
    this.timeoutMs = Math.max(1, Number(timeoutMs) || 3000);
    this.spawnImpl = spawnImpl;
    this.logger = logger;

    this.proc = null;
    this.stdoutReader = null;
    this.pending = new Map();
    this.nextRequestId = 1;
    this.readyPromise = null;
    this.modelSha256 = null;
  }

  start() {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = this.startAndPreflight().catch((error) => {
      this.terminateWorker(error);
      throw error;
    });
    return this.readyPromise;
  }

  async startAndPreflight() {
    if (!this.workerPath) {
      throw new Error("workerPath is required to start SettleGraph V2.");
    }
    if (!this.modelPath) {
      throw new Error("modelPath is required to start SettleGraph V2.");
    }

    const proc = this.spawnImpl(
      this.workerPath,
      ["--model", this.modelPath],
      {
        cwd: this.workerCwd,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env }
      }
    );
    this.proc = proc;
    this.stdoutReader = createInterface({ input: proc.stdout });
    this.stdoutReader.on("line", (line) => this.handleStdoutLine(line));
    proc.stderr.on("data", (chunk) => {
      const text = chunk?.toString?.().trimEnd();
      if (text) this.logger.info?.(`[settlegraph-v2] ${text}`);
    });
    proc.on("error", (error) => this.handleWorkerFailure(proc, error));
    proc.on("exit", (code, signal) => {
      this.handleWorkerFailure(
        proc,
        new Error(
          `SettleGraph V2 worker exited (code=${code}, signal=${signal ?? "none"}).`
        )
      );
    });

    const health = await this.sendRequest({ mode: "health" });
    this.validateHealth(health);
    return health;
  }

  validateHealth(health) {
    const expectedContract = health?.modelSha256 === SETTLEGRAPH_V2_MODEL_SHA256
      ? EXPECTED_CONTRACT
      : health?.modelSha256 === SETTLEGRAPH_005_MODEL_SHA256
        ? INCUMBENT_005_CONTRACT
        : null;
    if (!expectedContract || (this.modelSha256 && health.modelSha256 !== this.modelSha256)) {
      throw new Error(
        `SettleGraph V2 model SHA-256 mismatch: expected ${this.modelSha256 ?? "approved V2 or 005"}, received ${health?.modelSha256 ?? "missing"}.`
      );
    }
    for (const [key, expected] of Object.entries(expectedContract)) {
      if (health?.contract?.[key] !== expected) {
        throw new Error(
          `SettleGraph V2 contract mismatch for ${key}: expected ${expected}, received ${health?.contract?.[key] ?? "missing"}.`
        );
      }
    }
    this.modelSha256 = health.modelSha256;
  }

  async decide({ playerId, state }) {
    await this.start();
    const response = await this.sendRequest({
      mode: "decide",
      playerId: String(playerId),
      state
    });
    if (response?.modelSha256 !== this.modelSha256) {
      throw new Error("SettleGraph V2 decision returned an unexpected model identity.");
    }
    if (response?.stateId !== state?._stateID) {
      throw new Error(
        `SettleGraph V2 returned stale state ${response?.stateId}; expected ${state?._stateID}.`
      );
    }
    if (!Array.isArray(response?.plannedMoves) || response.plannedMoves.length === 0) {
      throw new Error("SettleGraph V2 returned no planned moves.");
    }
    return response;
  }

  sendRequest(payload) {
    const proc = this.proc;
    if (!proc?.stdin?.writable) {
      return Promise.reject(new Error("SettleGraph V2 worker is not writable."));
    }

    const requestId = String(this.nextRequestId++);
    const request = { id: requestId, ...payload };
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(requestId);
        const error = new Error(
          `SettleGraph V2 ${payload.mode} request timed out after ${this.timeoutMs}ms.`
        );
        reject(error);
        this.terminateWorker(error);
      }, this.timeoutMs);
      this.pending.set(requestId, { resolve, reject, timeoutId });
      proc.stdin.write(`${JSON.stringify(request)}\n`, (error) => {
        if (!error) return;
        clearTimeout(timeoutId);
        this.pending.delete(requestId);
        reject(error);
        this.terminateWorker(error);
      });
    });
  }

  handleStdoutLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.logger.warn?.(`[settlegraph-v2] invalid JSON response: ${line}`);
      return;
    }
    const requestId = message?.id == null ? null : String(message.id);
    const entry = requestId == null ? null : this.pending.get(requestId);
    if (!entry) return;
    clearTimeout(entry.timeoutId);
    this.pending.delete(requestId);
    if (message.ok !== true || message.error) {
      entry.reject(new Error(String(message.error ?? "SettleGraph V2 worker request failed.")));
      return;
    }
    entry.resolve(message);
  }

  handleWorkerFailure(proc, error) {
    if (this.proc !== proc) return;
    this.terminateWorker(error, { kill: false });
  }

  terminateWorker(error, { kill = true } = {}) {
    const proc = this.proc;
    this.proc = null;
    this.readyPromise = null;
    this.stdoutReader?.close();
    this.stdoutReader = null;
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    }
    this.pending.clear();
    if (kill && proc) proc.kill();
  }

  close() {
    this.terminateWorker(new Error("SettleGraph V2 worker closed."));
  }
}
