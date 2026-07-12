import { parseArgs } from "node:util";
import { BOARD_FAMILIES } from "../constants.mjs";

const FAMILY_VALUES = new Set(Object.values(BOARD_FAMILIES));
const RUN_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

const positiveInteger = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
};

const nonNegativeInteger = (value, name) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
};

const validFamily = (family) => {
  if (!FAMILY_VALUES.has(family)) {
    throw new Error("family must be official-spiral or freeform-random");
  }
  return family;
};

const validRunId = (runId) => {
  if (!RUN_ID.test(runId ?? "")) {
    throw new Error("run-id must be 1-64 lowercase letters, numbers, or hyphens");
  }
  return runId;
};

export function parseGenerateOptions(args) {
  const { values } = parseArgs({
    args,
    strict: true,
    options: {
      family: { type: "string" },
      count: { type: "string" },
      "start-seed": { type: "string", default: "1" },
      "run-id": { type: "string" },
      "shortlist-size": { type: "string", default: "20" },
    },
  });
  return {
    family: validFamily(values.family),
    count: positiveInteger(values.count, "count"),
    startSeed: nonNegativeInteger(values["start-seed"], "start-seed"),
    runId: validRunId(values["run-id"]),
    shortlistSize: positiveInteger(values["shortlist-size"], "shortlist-size"),
  };
}

export function parseCompareOptions(args) {
  const { values } = parseArgs({
    args,
    strict: true,
    options: {
      count: { type: "string" },
      "start-seed": { type: "string", default: "1" },
      "run-id": { type: "string" },
      "shortlist-size": { type: "string", default: "20" },
    },
  });
  return {
    count: positiveInteger(values.count, "count"),
    startSeed: nonNegativeInteger(values["start-seed"], "start-seed"),
    runId: validRunId(values["run-id"]),
    shortlistSize: positiveInteger(values["shortlist-size"], "shortlist-size"),
  };
}

export function parseInspectOptions(args) {
  const { values } = parseArgs({
    args,
    strict: true,
    options: {
      family: { type: "string" },
      "run-id": { type: "string" },
      "candidate-index": { type: "string" },
    },
  });
  return {
    runId: validRunId(values["run-id"]),
    family: validFamily(values.family),
    candidateIndex: nonNegativeInteger(values["candidate-index"], "candidate-index"),
  };
}
