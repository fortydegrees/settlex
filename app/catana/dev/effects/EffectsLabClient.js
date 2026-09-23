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
const AUDIO_FORMAT_BY_MIME = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/aac": "aac",
  "audio/flac": "flac"
};

const getAudioFormat = (file) => {
  const byMime = AUDIO_FORMAT_BY_MIME[file.type];
  if (byMime) return [byMime];
  const parts = file.name.toLowerCase().split(".");
  const ext = parts.length > 1 ? parts[parts.length - 1] : "";
  return ext ? [ext] : undefined;
};

export function EffectsLabClient() {
  const layerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [timeScale, setTimeScale] = useState(DEFAULT_TIME_SCALE);
  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState(
    EFFECTS_LAB_REGISTRY[0]?.id ?? ""
  );
  const [customSound, setCustomSound] = useState({
    url: "",
    name: "",
    format: undefined
  });
  const [customDelayMs, setCustomDelayMs] = useState(DEFAULT_CUSTOM_DELAY_MS);
  const [hasInteracted, setHasInteracted] = useState(false);

  const bus = useMemo(() => createEffectBus(), []);
  const audioRef = useRef(null);

  const selected = useMemo(
    () => EFFECTS_LAB_REGISTRY.find((item) => item.id === selectedId),
    [selectedId]
  );

  const selectedCues = useMemo(() => selected?.cues ?? [], [selected]);
  const audioSupported = Boolean(selected?.supportsAudio && selectedCues.length);
  const customSoundFormat = customSound.format;

  const themeOverride = useMemo(() => {
    if (!customSound.url || !audioSupported) return DEFAULT_THEME;
    const overrides = {};
    selectedCues.forEach((cue) => {
      const base = DEFAULT_THEME[cue];
      overrides[cue] = base
        ? { ...base, src: customSound.url, format: customSoundFormat }
        : { src: customSound.url, volume: 1, format: customSoundFormat };
    });
    return { ...DEFAULT_THEME, ...overrides };
  }, [customSound.url, customSoundFormat, audioSupported, selectedCues]);

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
    setCustomSound({ url, name: file.name, format: getAudioFormat(file) });
  };

  const handleClearSound = () => {
    setCustomSound({ url: "", name: "", format: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="settlex-dev-console min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-ui-6 px-ui-6 py-ui-8">
        <header className="flex flex-col gap-ui-2">
          <h1 className="type-title text-ink-console-primary">Effects Lab</h1>
          <p className="type-body-small text-ink-console-secondary">
            Dev-only playground for tuning animation parameters without booting the
            full game.
          </p>
        </header>

        <section className="settlex-dev-console-panel flex flex-wrap items-end gap-ui-4 p-ui-4">
          <label className="type-label flex flex-col text-ink-console-muted">
            Effect
            <select
              className="settlex-dev-console-field mt-ui-1"
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

          <label className="type-label flex flex-col text-ink-console-muted">
            Time Scale
            <input
              className="mt-ui-1"
              type="range"
              min="0.2"
              max="2"
              step="0.1"
              value={timeScale}
              onChange={(event) => setTimeScale(Number(event.target.value))}
            />
            <span className="type-body-small text-ink-console-secondary">{timeScale.toFixed(1)}</span>
          </label>

          <label className="type-label flex flex-col text-ink-console-muted">
            Custom Sound
            <input
              ref={fileInputRef}
              className="settlex-dev-console-file mt-ui-1"
              type="file"
              accept="audio/*"
              disabled={!audioSupported}
              onChange={handleCustomSoundChange}
            />
            <span className="type-body-small mt-ui-1 text-ink-console-secondary">
              {customSound.name || (audioSupported ? "None selected" : "Audio override not available")}
            </span>
          </label>

          <label className="type-label flex flex-col text-ink-console-muted">
            Audio Delay
            <input
              className="mt-ui-1"
              type="range"
              min="0"
              max={MAX_CUSTOM_DELAY_MS}
              step="10"
              value={customDelayMs}
              onChange={(event) => setCustomDelayMs(Number(event.target.value))}
              disabled={!audioSupported}
            />
            <span className="type-body-small text-ink-console-secondary">
              {(customDelayMs / 1000).toFixed(2)}s
            </span>
          </label>

          <button
            className="settlex-dev-console-button settlex-dev-console-button-secondary"
            type="button"
            onClick={handleClearSound}
            disabled={!customSound.url}
          >
            Clear Sound
          </button>
        </section>

        <section className="settlex-dev-console-panel relative p-ui-8">
          {selected ? (
            <selected.component layerRef={layerRef} emitCue={emitCue} />
          ) : (
            <div className="type-body-small text-ink-console-secondary">No effect selected.</div>
          )}

          {mounted ? <EffectLayer ref={layerRef} /> : null}
        </section>
      </div>
    </div>
  );
}
