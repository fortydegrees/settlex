export function createEffectBus({ dedupeWindowMs = 500 } = {}) {
  const handlers = new Map();
  const recent = new Map();

  const pruneRecent = (now) => {
    recent.forEach((seenAt, effectId) => {
      if (now - seenAt >= dedupeWindowMs) {
        recent.delete(effectId);
      }
    });
  };

  const on = (type, handler) => {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(handler);
    return () => handlers.get(type)?.delete(handler);
  };

  const emit = (event) => {
    const { type, effectId } = event;
    if (effectId) {
      const now = Date.now();
      pruneRecent(now);
      const last = recent.get(effectId);
      if (last != null && now - last < dedupeWindowMs) return;
      recent.set(effectId, now);
    }
    handlers.get(type)?.forEach((fn) => fn(event));
  };

  return { on, emit, _debugRecentSize: () => recent.size };
}
