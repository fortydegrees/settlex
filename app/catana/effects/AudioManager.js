import { Howl } from "howler";
import { DEFAULT_THEME } from "./soundThemes";
import { isDocumentHidden } from "../utils/visibility";

export function createAudioManager({ bus, theme = DEFAULT_THEME, settings = {} } = {}) {
  const howls = new Map();
  const variantHowls = new Map();
  const variantState = new Map();
  let unlocked = false;
  let lastPlay = null;

  const getHowl = (cueName) => {
    const entry = theme[cueName];
    if (!entry?.src) return null;
    if (!howls.has(cueName)) {
      howls.set(
        cueName,
        new Howl({
          src: [entry.src],
          volume: entry.volume ?? 1,
          format: entry.format
        })
      );
    }
    return howls.get(cueName);
  };

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

  const applyRandomize = (howl, soundId, entry) => {
    const randomize = entry.randomize;
    if (!randomize || soundId == null) return;

    if (Array.isArray(randomize.rate) && randomize.rate.length === 2) {
      const [minRate, maxRate] = randomize.rate;
      const rate = minRate + Math.random() * (maxRate - minRate);
      howl.rate(rate, soundId);
    }

    if (Array.isArray(randomize.volume) && randomize.volume.length === 2) {
      const [minVolume, maxVolume] = randomize.volume;
      const multiplier = minVolume + Math.random() * (maxVolume - minVolume);
      const baseVolume = entry.volume ?? 1;
      howl.volume(baseVolume * multiplier, soundId);
    }
  };

  const play = (cueName) => {
    if (settings.muted) return;
    if (!unlocked) return;
    const entry = theme[cueName];
    if (!entry) return;
    if (isDocumentHidden() && !entry.allowWhenHidden) return;
    let howl = null;
    if (entry.variants?.length) {
      const index = drawVariantIndex(cueName, entry);
      if (index == null) return;
      howl = getVariantHowl(entry.variants[index], entry);
    } else {
      howl = getHowl(cueName);
    }
    if (!howl) return;
    lastPlay = cueName;
    const soundId = howl.play();
    applyRandomize(howl, soundId, entry);
  };

  const unlock = () => {
    unlocked = true;
  };

  const unsubscribe = bus?.on("cue", (event) => {
    const cueName = event.payload?.name;
    if (cueName) play(cueName);
  });

  return {
    unlock,
    destroy: () => unsubscribe?.(),
    _debugLastPlay: () => lastPlay
  };
}
