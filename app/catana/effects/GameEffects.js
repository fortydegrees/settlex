import React, { useEffect, useMemo, useRef } from "react";
import { useEffectListener } from "bgio-effects/react";
import { createEffectBus } from "./EffectBus";
import { createAudioManager } from "./AudioManager";
import { registerEffects } from "./registry";
import { EffectLayer } from "./EffectLayer";

export function GameEffects({ effects = {}, boardRef }) {
  const bus = useMemo(() => createEffectBus(), []);
  const layerRef = useRef(null);
  const audio = useMemo(() => createAudioManager({ bus }), [bus]);

  const context = useMemo(
    () => ({
      bus,
      boardRef,
      layerRef,
      emitCue: (name) => bus.emit({ type: "cue", payload: { name } })
    }),
    [bus, boardRef]
  );

  const handlers = useMemo(() => {
    const resolved = {};
    Object.entries(effects).forEach(([key, value]) => {
      resolved[key] = typeof value === "function" ? value(context) : value;
    });
    return resolved;
  }, [effects, context]);

  useEffect(() => {
    const cleanup = registerEffects({ bus, effects: handlers });
    return () => cleanup();
  }, [bus, handlers]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [audio]);

  useEffectListener(
    "distributeCardsFromTile",
    (payload) => {
      bus.emit({ type: "resource:distribution", payload });
    },
    [bus]
  );

  return <EffectLayer ref={layerRef} />;
}
