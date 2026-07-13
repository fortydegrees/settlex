import { parseArgs } from "node:util";
import {
  BOARD_FAMILIES,
  EVALUATOR_VERSION,
  EVALUATOR_VERSIONS
} from "../constants.mjs";

const FAMILY_VALUES = new Set(Object.values(BOARD_FAMILIES));
const RUN_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const EVALUATOR_VALUES = new Set(Object.values(EVALUATOR_VERSIONS));

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

const validEvaluator = (evaluator) => {
  if (!EVALUATOR_VALUES.has(evaluator)) {
    throw new Error("evaluator must be duel-fair-v1, duel-fair-v2, or duel-fair-v3");
  }
  return evaluator;
};

function validateAuditCombination(evaluatorVersion, v2AuditSelections) {
  if (v2AuditSelections && evaluatorVersion === EVALUATOR_VERSIONS.V3) {
    throw new Error("v2-audit-selections requires duel-fair-v1 or duel-fair-v2");
  }
}

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
      evaluator: { type: "string", default: EVALUATOR_VERSION },
      "v2-audit-selections": { type: "boolean", default: false },
    },
  });
  const evaluatorVersion = validEvaluator(values.evaluator);
  validateAuditCombination(evaluatorVersion, values["v2-audit-selections"]);
  return {
    family: validFamily(values.family),
    count: positiveInteger(values.count, "count"),
    startSeed: nonNegativeInteger(values["start-seed"], "start-seed"),
    runId: validRunId(values["run-id"]),
    shortlistSize: positiveInteger(values["shortlist-size"], "shortlist-size"),
    evaluatorVersion,
    v2AuditSelections: values["v2-audit-selections"],
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
      evaluator: { type: "string", default: EVALUATOR_VERSION },
      "v2-audit-selections": { type: "boolean", default: false },
    },
  });
  const evaluatorVersion = validEvaluator(values.evaluator);
  validateAuditCombination(evaluatorVersion, values["v2-audit-selections"]);
  return {
    count: positiveInteger(values.count, "count"),
    startSeed: nonNegativeInteger(values["start-seed"], "start-seed"),
    runId: validRunId(values["run-id"]),
    shortlistSize: positiveInteger(values["shortlist-size"], "shortlist-size"),
    evaluatorVersion,
    v2AuditSelections: values["v2-audit-selections"],
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
      evaluator: { type: "string", default: EVALUATOR_VERSION },
      "exact-v3": { type: "boolean", default: false },
    },
  });
  const evaluatorVersion = validEvaluator(values.evaluator);
  if (values["exact-v3"] && evaluatorVersion !== EVALUATOR_VERSIONS.V3) {
    throw new Error("exact-v3 requires duel-fair-v3");
  }
  return {
    runId: validRunId(values["run-id"]),
    family: validFamily(values.family),
    candidateIndex: nonNegativeInteger(values["candidate-index"], "candidate-index"),
    evaluatorVersion,
    exactV3: values["exact-v3"],
  };
}
