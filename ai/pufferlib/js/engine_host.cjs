#!/usr/bin/env node

const readline = require("readline");
const {
  SettlexSelfPlayEnv,
} = require("./settlexEnv.cjs");

function parseArgv(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = next;
    i += 1;
  }
  return out;
}

function toNumber(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const str = String(value).toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(str)) return true;
  if (["0", "false", "no", "n", "off"].includes(str)) return false;
  return fallback;
}

function normalizeOptions(raw = {}) {
  return {
    numPlayers: toNumber(raw.numPlayers, 4),
    maxSteps: toNumber(raw.maxSteps, 1200),
    boardConfigId: raw.boardConfigId ?? "standard-official",
    includeActionMaskInObservation: toBoolean(
      raw.includeActionMaskInObservation,
      true
    ),
    friendlyRobber: toBoolean(raw.friendlyRobber, true),
    vpRewardScale: toNumber(raw.vpRewardScale, 0.1),
    winReward: toNumber(raw.winReward, 1.0),
    lossReward: toNumber(raw.lossReward, -1.0),
    illegalActionPenalty: toNumber(raw.illegalActionPenalty, -0.05),
    stepPenalty: toNumber(raw.stepPenalty, 0.001),
  };
}

const cliOptions = normalizeOptions(parseArgv(process.argv));
let env = new SettlexSelfPlayEnv(cliOptions);

function respond(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function respondOk(result) {
  respond({ ok: true, result });
}

function respondError(error) {
  respond({ ok: false, error: error?.message ?? String(error) });
}

function handleCommand(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid command payload");
  }

  const { cmd } = payload;

  switch (cmd) {
    case "init": {
      const options = normalizeOptions({ ...cliOptions, ...(payload.options ?? {}) });
      if (env) {
        env.close();
      }
      env = new SettlexSelfPlayEnv(options);
      return { initialized: true, options };
    }

    case "spec":
      return env.getSpec();

    case "reset":
      return env.reset(payload.seed ?? 0);

    case "step":
      return env.step(payload.action);

    case "close":
      env.close();
      return { closed: true };

    case "ping":
      return { pong: true };

    default:
      throw new Error(`Unknown command: ${cmd}`);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const payload = JSON.parse(line);
    const result = handleCommand(payload);
    respondOk(result);
    if (payload.cmd === "close") {
      rl.close();
      process.exit(0);
    }
  } catch (error) {
    respondError(error);
  }
});

rl.on("close", () => {
  try {
    if (env) env.close();
  } catch {
    // Ignore close failures during shutdown.
  }
});
