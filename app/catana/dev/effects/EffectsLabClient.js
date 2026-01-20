"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { EffectLayer } from "../../effects/EffectLayer";
import { createEffectBus } from "../../effects/EffectBus";
import { createAudioManager } from "../../effects/AudioManager";
import { DEFAULT_THEME } from "../../effects/soundThemes";
import { EFFECTS_LAB_REGISTRY } from "./registry";

const DEFAULT_TIME_SCALE = 1;
const DEFAULT_CUSTOM_DELAY_MS = 0;
const MAX_CUSTOM_DELAY_MS = 1000;

export function EffectsLabClient() {
  const layerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [timeScale, setTimeScale] = useState(DEFAULT_TIME_SCALE);
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState(
    EFFECTS_LAB_REGISTRY[0]?.id ?? ""
  );
  const [customSound, setCustomSound] = useState({ url: "", name: "" });
  const [customDelayMs, setCustomDelayMs] = useState(DEFAULT_CUSTOM_DELAY_MS);
  const [hasInteracted, setHasInteracted] = useState(false);

  const bus = useMemo(() => createEffectBus(), []);
  const audioRef = useRef(null);

  const selected = useMemo(
    () => EFFECTS_LAB_REGISTRY.find((item) => item.id === selectedId),
    [selectedId]
  );

  const selectedCues = selected?.cues ?? [];
  const audioSupported = Boolean(selected?.supportsAudio && selectedCues.length);

  const themeOverride = useMemo(() => {
    if (!customSound.url || !audioSupported) return DEFAULT_THEME;
    const overrides = {};
    selectedCues.forEach((cue) => {
      const base = DEFAULT_THEME[cue];
      overrides[cue] = base
        ? { ...base, src: customSound.url }
        : { src: customSound.url, volume: 1 };
    });
    return { ...DEFAULT_THEME, ...overrides };
  }, [customSound.url, audioSupported, selectedCues]);

  useEffect(() => {
    const audio = createAudioManager({ bus, theme: themeOverride });
    audioRef.current = audio;
    if (hasInteracted) {
      audio.unlock();
    }
    return () => {
      audio.destroy();
      if (audioRef.current === audio) {
        audioRef.current = null;
      }
    };
  }, [bus, themeOverride, hasInteracted]);

  const emitCue = useMemo(() => {
    return (name) => {
      const shouldDelay = customSound.url && selectedCues.includes(name);
      if (shouldDelay && customDelayMs > 0) {
        window.setTimeout(() => {
          bus.emit({ type: "cue", payload: { name } });
        }, customDelayMs);
        return;
      }
      bus.emit({ type: "cue", payload: { name } });
    };
  }, [bus, customSound.url, selectedCues, customDelayMs]);

  useEffect(() => {
    gsap.globalTimeline.timeScale(timeScale);
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  }, [timeScale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePointer = () => setHasInteracted(true);
    window.addEventListener("pointerdown", handlePointer, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handlePointer);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (customSound.url) {
        URL.revokeObjectURL(customSound.url);
      }
    };
  }, [customSound.url]);

  const handleCustomSoundChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomSound({ url, name: file.name });
  };

  const handleClearSound = () => {
    setCustomSound({ url: "", name: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Custom Sound
            <input
              ref={fileInputRef}
              className="mt-1 text-sm text-slate-200 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-1 file:text-xs file:uppercase file:tracking-wide file:text-slate-100"
              type="file"
              accept="audio/*"
              disabled={!audioSupported}
              onChange={handleCustomSoundChange}
            />
            <span className="mt-1 text-sm text-slate-200">
              {customSound.name || (audioSupported ? "None selected" : "Audio override not available")}
            </span>
          </label>

          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Audio Delay
            <input
              className="mt-1"
              type="range"
              min="0"
              max={MAX_CUSTOM_DELAY_MS}
              step="10"
              value={customDelayMs}
              onChange={(event) => setCustomDelayMs(Number(event.target.value))}
              disabled={!audioSupported}
            />
            <span className="text-sm text-slate-200">
              {(customDelayMs / 1000).toFixed(2)}s
            </span>
          </label>

          <button
            className="rounded bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleClearSound}
            disabled={!customSound.url}
          >
            Clear Sound
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
