import { Howl } from "howler";
import { DEFAULT_THEME } from "./soundThemes";

export function createAudioManager({ bus, theme = DEFAULT_THEME, settings = {} } = {}) {
  const howls = new Map();
  let unlocked = false;
  let lastPlay = null;

  const getHowl = (cueName) => {
    const entry = theme[cueName];
    if (!entry) return null;
    if (!howls.has(cueName)) {
      howls.set(cueName, new Howl({ src: [entry.src], volume: entry.volume ?? 1 }));
    }
    return howls.get(cueName);
  };

  const play = (cueName) => {
    if (settings.muted) return;
    if (!unlocked) return;
    const howl = getHowl(cueName);
    if (!howl) return;
    lastPlay = cueName;
    howl.play();
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
