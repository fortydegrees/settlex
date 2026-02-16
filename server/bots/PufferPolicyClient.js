import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

export class PufferPolicyClient {
  constructor({
    checkpointPath,
    pythonExecutable = "python3",
    pythonCwd,
    stochastic = false
  }) {
    this.checkpointPath = checkpointPath;
    this.pythonExecutable = pythonExecutable;
    this.pythonCwd = pythonCwd;
    this.stochastic = stochastic;

    this.proc = null;
    this.stdoutReader = null;
    this.pending = new Map();
    this.nextRequestId = 1;
  }

  start() {
    if (this.proc) return;
    if (!this.checkpointPath) {
      throw new Error("checkpointPath is required to start PufferPolicyClient.");
    }

    const args = [
      "-m",
      "settlex_puffer.infer_server",
      "--checkpoint",
      this.checkpointPath
    ];
    if (this.stochastic) {
      args.push("--stochastic");
    }

    this.proc = spawn(this.pythonExecutable, args, {
      cwd: this.pythonCwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1"
      }
    });

    this.stdoutReader = createInterface({ input: this.proc.stdout });
    this.stdoutReader.on("line", (line) => this.handleStdoutLine(line));

    this.proc.stderr.on("data", (chunk) => {
      const text = chunk?.toString?.() ?? "";
      if (text.trim().length > 0) {
        // Keep this visible in server logs for debugging model/venv issues.
        console.warn(`[puffer-policy] ${text.trimEnd()}`);
      }
    });

    this.proc.on("exit", (code, signal) => {
      const error = new Error(
        `Puffer policy worker exited (code=${code}, signal=${signal ?? "none"}).`
      );
      for (const { reject } of this.pending.values()) {
        reject(error);
      }
      this.pending.clear();
      this.stdoutReader?.close();
      this.stdoutReader = null;
      this.proc = null;
    });
  }

  handleStdoutLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch (error) {
      console.warn(`[puffer-policy] invalid JSON line: ${line}`);
      return;
    }

    const requestId = message?.id;
    if (requestId == null) {
      return;
    }
    const entry = this.pending.get(String(requestId));
    if (!entry) {
      return;
    }
    this.pending.delete(String(requestId));

    if (message.error) {
      entry.reject(new Error(String(message.error)));
      return;
    }
    try {
      entry.resolve(entry.parse(message));
    } catch (error) {
      entry.reject(error);
    }
  }

  infer({ observation, actionMask, stochastic = this.stochastic, spec = null }) {
    this.start();
    if (!this.proc || !this.proc.stdin.writable) {
      return Promise.reject(new Error("Puffer policy worker is not writable."));
    }

    const requestId = String(this.nextRequestId++);
    const payload = {
      id: requestId,
      observation,
      action_mask: actionMask,
      stochastic: Boolean(stochastic),
      spec: spec ?? undefined
    };

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, {
        resolve,
        reject,
        parse: (message) => Number(message.action)
      });
      this.proc.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) return;
        this.pending.delete(requestId);
        reject(error);
      });
    });
  }

  evalBatch({ observations, actionMasks, spec = null }) {
    this.start();
    if (!this.proc || !this.proc.stdin.writable) {
      return Promise.reject(new Error("Puffer policy worker is not writable."));
    }

    const requestId = String(this.nextRequestId++);
    const payload = {
      id: requestId,
      mode: "eval_batch",
      observations,
      action_masks: actionMasks,
      spec: spec ?? undefined
    };

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, {
        resolve,
        reject,
        parse: (message) => {
          const values = Array.isArray(message.values)
            ? message.values.map((v) => Number(v))
            : [];
          return { values };
        }
      });
      this.proc.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) return;
        this.pending.delete(requestId);
        reject(error);
      });
    });
  }

  scoreActions({ observation, actionMask, spec = null }) {
    this.start();
    if (!this.proc || !this.proc.stdin.writable) {
      return Promise.reject(new Error("Puffer policy worker is not writable."));
    }

    const requestId = String(this.nextRequestId++);
    const payload = {
      id: requestId,
      mode: "score_actions",
      observation,
      action_mask: actionMask,
      spec: spec ?? undefined
    };

    return new Promise((resolve, reject) => {
      this.pending.set(requestId, {
        resolve,
        reject,
        parse: (message) => {
          const logits = Array.isArray(message.logits)
            ? message.logits.map((v) => Number(v))
            : [];
          const value = Number(message.value ?? 0);
          return { logits, value };
        }
      });
      this.proc.stdin.write(`${JSON.stringify(payload)}\n`, (error) => {
        if (!error) return;
        this.pending.delete(requestId);
        reject(error);
      });
    });
  }

  close() {
    if (this.stdoutReader) {
      this.stdoutReader.close();
      this.stdoutReader = null;
    }
    if (this.proc) {
      this.proc.kill();
      this.proc = null;
    }
    for (const { reject } of this.pending.values()) {
      reject(new Error("Puffer policy worker closed."));
    }
    this.pending.clear();
  }
}
