const DEFAULT_ROLL_MS = 1000;
const DEFAULT_SLOWDOWN_START_MS = 400;
const DEFAULT_ROLL_VARIANT = 0;

const toDurationMs = (value, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};

const normalizeRollRequest = (request) => {
  if (typeof request === "number") {
    return {
      face: request,
      rollMs: DEFAULT_ROLL_MS,
      slowdownStartMs: DEFAULT_SLOWDOWN_START_MS,
      rollVariant: DEFAULT_ROLL_VARIANT
    };
  }

  const rollMs = toDurationMs(request?.rollMs, DEFAULT_ROLL_MS);

  return {
    face: request?.face ?? 1,
    rollMs,
    slowdownStartMs: Math.min(
      Math.max(0, toDurationMs(request?.slowdownStartMs, DEFAULT_SLOWDOWN_START_MS)),
      rollMs
    ),
    rollVariant: Number.isInteger(request?.rollVariant)
      ? Math.max(0, request.rollVariant)
      : DEFAULT_ROLL_VARIANT
  };
};

export function buildDieRollPlan({ request }) {
  const next = normalizeRollRequest(request);

  return {
    face: next.face,
    rollMs: next.rollMs,
    slowdownStartMs: next.slowdownStartMs,
    rollVariant: next.rollVariant
  };
}
