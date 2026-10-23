const DEFAULT_ROLL_MS = 1000;
const DEFAULT_SLOWDOWN_START_MS = 400;
const MIN_SETTLE_TAIL_MS = 60;
const SETTLE_TAIL_JITTER_RANGE_MS = 20;
const ROLL_VARIANT_COUNT = 3;

const toDurationMs = (value, fallback = 0) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};

const pickRollVariant = ({ excludedVariant = null, random = Math.random } = {}) => {
  const nextVariant = Math.floor(random() * ROLL_VARIANT_COUNT);
  if (excludedVariant == null || ROLL_VARIANT_COUNT < 2 || nextVariant !== excludedVariant) {
    return nextVariant;
  }
  return (nextVariant + 1) % ROLL_VARIANT_COUNT;
};

export function buildDiceAnimationRequest({
  face,
  timeline = {},
  layerTiming = null,
  rollVariant = pickRollVariant(),
  random = Math.random
}) {
  if (layerTiming?.rollMs != null) {
    const rollMs = toDurationMs(layerTiming.rollMs, DEFAULT_ROLL_MS);
    return {
      face,
      rollMs,
      slowdownStartMs: Math.min(
        toDurationMs(layerTiming.slowdownStartMs, DEFAULT_SLOWDOWN_START_MS),
        rollMs
      ),
      rollVariant
    };
  }

  const rollMs = toDurationMs(timeline?.rollMs, DEFAULT_ROLL_MS);
  const slowdownStartMs = Math.min(
    toDurationMs(timeline?.slowdownStartMs, DEFAULT_SLOWDOWN_START_MS),
    rollMs
  );
  const baseSettleTailMs = Math.max(0, rollMs - slowdownStartMs);
  const settleTailJitterMs = Math.round(
    (random() - 0.5) * SETTLE_TAIL_JITTER_RANGE_MS * 2
  );

  return {
    face,
    rollMs: slowdownStartMs + Math.max(
      MIN_SETTLE_TAIL_MS,
      baseSettleTailMs + settleTailJitterMs
    ),
    slowdownStartMs,
    rollVariant
  };
}

export function buildDiceAnimationPair({
  dice = [],
  timeline = {},
  random = Math.random
}) {
  const firstVariant = pickRollVariant({ random });
  const secondVariant = pickRollVariant({
    excludedVariant: firstVariant,
    random
  });

  return dice.slice(0, 2).map((face, index) =>
    buildDiceAnimationRequest({
      face,
      timeline,
      layerTiming: timeline?.layerTimings?.[index] ?? null,
      random,
      rollVariant: index === 0 ? firstVariant : secondVariant
    })
  );
}
