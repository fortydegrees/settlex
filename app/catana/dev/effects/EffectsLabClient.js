"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { EffectLayer } from "../../effects/EffectLayer";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";
import { EFFECTS_LAB_REGISTRY } from "./registry";

const DEFAULT_TIME_SCALE = 1;

export function EffectsLabClient() {
  const layerRef = useRef(null);
  const [timeScale, setTimeScale] = useState(DEFAULT_TIME_SCALE);
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState(
    EFFECTS_LAB_REGISTRY[0]?.id ?? ""
  );
  const [audioEnabled, setAudioEnabled] = useState(false);

  const bus = useMemo(() => createEffectBus(), []);
  const audio = useMemo(() => createAudioManager({ bus }), [bus]);

  const selected = useMemo(
    () => EFFECTS_LAB_REGISTRY.find((item) => item.id === selectedId),
    [selectedId]
  );

  const emitCue = useMemo(() => {
    if (!audioEnabled) return () => {};
    return (name) => bus.emit({ type: "cue", payload: { name } });
  }, [audioEnabled, bus]);

  useEffect(() => {
    gsap.globalTimeline.timeScale(timeScale);
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  }, [timeScale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAudioToggle = () => {
    if (!audioEnabled) {
      audio.unlock();
    }
    setAudioEnabled((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Effects Lab</h1>
          <p className="text-sm text-slate-300">
            Dev-only playground for tuning animation parameters without booting the
            full game.
          </p>
        </header>

        <section className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Effect
            <select
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {EFFECTS_LAB_REGISTRY.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Time Scale
            <input
              className="mt-1"
              type="range"
              min="0.2"
              max="2"
              step="0.1"
              value={timeScale}
              onChange={(event) => setTimeScale(Number(event.target.value))}
            />
            <span className="text-sm text-slate-200">{timeScale.toFixed(1)}</span>
          </label>

          <button
            className={`rounded px-4 py-2 text-sm font-semibold ${
              audioEnabled
                ? "bg-emerald-400 text-slate-900"
                : "bg-slate-700 text-slate-100"
            }`}
            onClick={handleAudioToggle}
            type="button"
          >
            {audioEnabled ? "Audio On" : "Enable Audio"}
          </button>
        </section>

        <section className="relative rounded-lg border border-slate-700 bg-slate-800/40 p-8">
          {selected ? (
            <selected.component layerRef={layerRef} emitCue={emitCue} />
          ) : (
            <div className="text-sm text-slate-300">No effect selected.</div>
          )}

          {mounted ? <EffectLayer ref={layerRef} /> : null}
        </section>
      </div>
    </div>
  );
}
