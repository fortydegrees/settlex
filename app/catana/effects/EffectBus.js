export function createEffectBus({ dedupeWindowMs = 500 } = {}) {
  const handlers = new Map();
  const recent = new Map();

  const on = (type, handler) => {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type).add(handler);
    return () => handlers.get(type)?.delete(handler);
  };

  const emit = (event) => {
    const { type, effectId } = event;
    if (effectId) {
      const now = Date.now();
      const last = recent.get(effectId) ?? 0;
      if (now - last < dedupeWindowMs) return;
      recent.set(effectId, now);
    }
    handlers.get(type)?.forEach((fn) => fn(event));
  };

  return { on, emit };
}
