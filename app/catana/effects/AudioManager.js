import { Howl } from "howler";
import { DEFAULT_THEME } from "./soundThemes";
import { isDocumentHidden } from "../utils/visibility";

export function createAudioManager({ bus, theme = DEFAULT_THEME, settings = {} } = {}) {
  const variantHowls = new Map();
  const variantState = new Map();
  const pendingTimeouts = new Set();
  let unlocked = false;
  let lastPlay = null;
  let destroyed = false;

  const getVariantHowl = (src, entry) => {
    if (!src) return null;
    if (!variantHowls.has(src)) {
      variantHowls.set(
        src,
        new Howl({
          src: [src],
          volume: entry.volume ?? 1,
          format: entry.format
        })
      );
    }
    return variantHowls.get(src);
  };

  const shuffleIndices = (indices) => {
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  };

  const drawVariantIndex = (cueName, entry) => {
    const variants = entry.variants ?? [];
    if (!variants.length) return null;

    let state = variantState.get(cueName);
    if (!state || state.bag.length === 0) {
      const bag = variants.map((_, index) => index);
      if (entry.shuffle) shuffleIndices(bag);
      if (state?.lastIndex != null && bag.length > 1 && bag[0] === state.lastIndex) {
        [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      }
      state = { bag, lastIndex: state?.lastIndex ?? null };
      variantState.set(cueName, state);
    }

    const nextIndex = state.bag.shift();
    state.lastIndex = nextIndex;
    return nextIndex;
  };

  const drawVariantIndices = (cueName, entry) => {
    const variants = entry.variants ?? [];
    if (!variants.length) return [];

    const requestedLayers = Number(entry.layers) || 1;
    const layerCount = Math.max(1, Math.min(variants.length, requestedLayers));
    const indices = [];

    while (indices.length < layerCount) {
      const nextIndex = drawVariantIndex(cueName, entry);
      if (nextIndex == null || indices.includes(nextIndex)) continue;
      indices.push(nextIndex);
    }

    return indices;
  };

  const resolveRandomize = (entry) => {
    const randomize = entry.randomize;
    const resolved = {
      rate: 1,
      volume: entry.volume ?? 1,
      hasRate: false,
      hasVolume: false
    };
    if (!randomize) return resolved;

    if (Array.isArray(randomize.rate) && randomize.rate.length === 2) {
      const [minRate, maxRate] = randomize.rate;
      const rate = minRate + Math.random() * (maxRate - minRate);
      resolved.rate = rate;
      resolved.hasRate = true;
    }

    if (Array.isArray(randomize.volume) && randomize.volume.length === 2) {
      const [minVolume, maxVolume] = randomize.volume;
      const multiplier = minVolume + Math.random() * (maxVolume - minVolume);
      const baseVolume = entry.volume ?? 1;
      resolved.volume = baseVolume * multiplier;
      resolved.hasVolume = true;
    }

    return resolved;
  };

  const applyResolvedRandomize = (howl, soundId, resolved) => {
    if (!howl || soundId == null || !resolved) return;
    if (resolved.hasRate) {
      howl.rate(resolved.rate, soundId);
    }
    if (resolved.hasVolume) {
      howl.volume(resolved.volume, soundId);
    }
  };

  const getLayerDelayMs = (entry, layerIndex) => {
    if (layerIndex === 0) return 0;

    const layerDelayMs = entry.layerDelayMs;
    if (typeof layerDelayMs === "number") {
      return Math.max(0, layerDelayMs);
    }

    if (Array.isArray(layerDelayMs) && layerDelayMs.length === 2) {
      const [minDelay, maxDelay] = layerDelayMs;
      const delay = minDelay + Math.random() * (maxDelay - minDelay);
      return Math.max(0, Math.round(delay));
    }

    return 0;
  };

  const getDurationMs = (entry, src, resolvedRandomize) => {
    if (!src) return null;
    const durationMs = entry.durationMsBySrc?.[src] ?? null;
    if (durationMs == null) return null;
    const playbackRate = resolvedRandomize?.rate || 1;
    return Math.max(0, Math.round(durationMs / playbackRate));
  };

  const createPlannedLayer = ({ src, entry, delayMs = 0 }) => {
    const randomize = resolveRandomize(entry);
    const durationMs = getDurationMs(entry, src, randomize);
    const startDelayPortion = Number(entry.startDelayPortion);
    const startDelayMs =
      Number.isFinite(startDelayPortion) && durationMs != null
        ? Math.max(0, Math.round(durationMs * startDelayPortion))
        : 0;
    const timelineDelayMs = delayMs + startDelayMs;
    const impactLeadPortion = Number(entry.impactLeadPortion);
    const impactLeadMs =
      Number.isFinite(impactLeadPortion) && durationMs != null
        ? Math.max(0, Math.round(durationMs * impactLeadPortion))
        : 0;

    return {
      src,
      delayMs: timelineDelayMs + impactLeadMs,
      timelineDelayMs,
      durationMs,
      impactLeadMs,
      randomize
    };
  };

  const planCue = (cueName) => {
    const entry = theme[cueName];
    if (!entry) return null;

    const plan = {
      cueName,
      leadIn: null,
      layers: [],
      mainStartMs: 0,
      totalDurationMs: null
    };

    if (entry.leadIn) {
      const leadInEntry = entry.leadIn;
      let leadInSrc = null;
      if (leadInEntry.variants?.length) {
        const indices = drawVariantIndices(`${cueName}:leadIn`, leadInEntry);
        const leadIndex = indices[0];
        if (leadIndex != null) {
          leadInSrc = leadInEntry.variants[leadIndex];
        }
      } else if (leadInEntry.src) {
        leadInSrc = leadInEntry.src;
      }

      if (leadInSrc) {
        plan.leadIn = createPlannedLayer({
          src: leadInSrc,
          entry: leadInEntry
        });
        plan.leadIn.overlapMs = Math.max(0, leadInEntry.overlapMs ?? 0);
        plan.leadIn.timelineLeadMs = Math.max(0, leadInEntry.timelineLeadMs ?? 0);
        plan.mainStartMs =
          plan.leadIn.durationMs != null
            ? Math.max(0, plan.leadIn.durationMs - plan.leadIn.overlapMs)
            : null;
      }
    }

    if (entry.variants?.length) {
      const indices = drawVariantIndices(cueName, entry);
      plan.layers = indices.map((index, layerIndex) =>
        createPlannedLayer({
          src: entry.variants[index],
          entry,
          delayMs: getLayerDelayMs(entry, layerIndex)
        })
      );
    } else if (entry.src) {
      plan.layers = [createPlannedLayer({ src: entry.src, entry })];
    }

    const layerEndTimes = plan.layers
      .map((layer) => {
        if (layer.durationMs == null) return null;
        return (plan.mainStartMs ?? 0) + layer.delayMs + layer.durationMs;
      })
      .filter((value) => value != null);

    if (layerEndTimes.length) {
      plan.totalDurationMs = Math.max(...layerEndTimes);
    }

    return plan;
  };

  const playHowl = (howl, delayMs = 0, resolvedRandomize = null, onPlay = null) => {
    if (!howl) return;
    const runPlay = () => {
      if (destroyed) return;
      const soundId = howl.play();
      applyResolvedRandomize(howl, soundId, resolvedRandomize);
      onPlay?.({ howl, soundId, applied: resolvedRandomize });
    };

    if (!delayMs) {
      runPlay();
      return;
    }

    const timeoutId = setTimeout(() => {
      pendingTimeouts.delete(timeoutId);
      runPlay();
    }, delayMs);
    pendingTimeouts.add(timeoutId);
  };

  const scheduleCallback = (delayMs, callback) => {
    const timeoutId = setTimeout(() => {
      pendingTimeouts.delete(timeoutId);
      if (destroyed) return;
      callback?.();
    }, delayMs);
    pendingTimeouts.add(timeoutId);
  };

  const playMainLayers = (entry, plan) => {
    plan.layers.forEach((layer) => {
      const howl = getVariantHowl(layer.src, entry);
      if (!howl) return;
      playHowl(howl, layer.delayMs, layer.randomize);
    });
  };

  const playLeadIn = (cueName, entry, plan, onEnd) => {
    if (!plan.leadIn) {
      onEnd?.();
      return;
    }

    const howl = getVariantHowl(plan.leadIn.src, entry.leadIn);
    if (!howl) {
      onEnd?.();
      return;
    }

    playHowl(howl, 0, plan.leadIn.randomize, ({ howl: activeHowl, soundId }) => {
      if (plan.mainStartMs != null) {
        scheduleCallback(plan.mainStartMs, onEnd);
        return;
      }

      if (typeof activeHowl.once === "function") {
        activeHowl.once(
          "end",
          () => {
            if (destroyed) return;
            onEnd?.();
          },
          soundId
        );
        return;
      }

      onEnd?.();
    });
  };

  const play = (cueName, providedPlan = null) => {
    if (settings.muted) return;
    if (!unlocked) return;
    if (destroyed) return;
    const entry = theme[cueName];
    if (!entry) return;
    if (isDocumentHidden() && !entry.allowWhenHidden) return;
    const plan = providedPlan ?? planCue(cueName);
    if (!plan) return;
    lastPlay = cueName;

    if (plan.leadIn) {
      playLeadIn(cueName, entry, plan, () => playMainLayers(entry, plan));
      return;
    }

    playMainLayers(entry, plan);
  };

  const unlock = () => {
    unlocked = true;
  };

  const unsubscribe = bus?.on("cue", (event) => {
    const cueName = event.payload?.name;
    if (cueName) play(cueName, event.payload?.plan);
  });

  return {
    planCue,
    unlock,
    destroy: () => {
      destroyed = true;
      pendingTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTimeouts.clear();
      unsubscribe?.();
      variantHowls.forEach((howl) => howl.unload?.());
      variantHowls.clear();
      variantState.clear();
    },
    _debugLastPlay: () => lastPlay
  };
}
