"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { gsap } from "gsap";
import { EffectLayer } from "../../effects/EffectLayer";
import { createResourceDistributionRunner } from "../../effects/resourceDistribution";
import { buildResourceDistributionDemo } from "./resourceDistributionLabUtils";
import { createSeededRandom } from "../../utils/seededRandom";
import useWindowSize from "../../utils/useWindowSize";
import { getBoardLayout } from "../../utils/boardLayout";

const DEFAULT_SEED = 1;
const DEFAULT_COUNT = 4;
const DEFAULT_TIME_SCALE = 1;

export function EffectsLabClient() {
  const boardRef = useRef(null);
  const layerRef = useRef(null);
  const { width, height } = useWindowSize();
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [timeScale, setTimeScale] = useState(DEFAULT_TIME_SCALE);
  const [mounted, setMounted] = useState(false);

  const layout = useMemo(() => {
    if (!width || !height) return null;
    return getBoardLayout({ width, height });
  }, [width, height]);

  useEffect(() => {
    gsap.globalTimeline.timeScale(timeScale);
    return () => {
      gsap.globalTimeline.timeScale(1);
    };
  }, [timeScale]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReplay = () => {
    if (!layout || !boardRef.current || !layerRef.current) return;
    const random = createSeededRandom(Number(seed) || DEFAULT_SEED);
    const cards = buildResourceDistributionDemo({
      count: Number(count) || DEFAULT_COUNT,
      random
    });
    const runner = createResourceDistributionRunner({
      getLayerEl: () => layerRef.current,
      getLayout: () => layout,
      getBoardRect: () => boardRef.current.getBoundingClientRect(),
      random
    });
    runner({ cards });
  };

  const boardStyle = {
    width: layout?.containerWidth ?? 640,
    height: layout?.containerHeight ?? 640
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Effects Lab</h1>
          <p className="text-sm text-slate-300">
            Dev-only playground for tuning animation parameters without booting the
            full game.
          </p>
        </header>

        <section className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Seed
            <input
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              type="number"
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
            />
          </label>

          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Cards
            <input
              className="mt-1"
              type="range"
              min="1"
              max="10"
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
            <span className="text-sm text-slate-200">{count}</span>
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
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
            onClick={handleReplay}
            type="button"
          >
            Replay
          </button>
        </section>

        <section className="relative flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800/40 p-8">
          <div
            ref={boardRef}
            className="relative rounded-xl border border-dashed border-slate-600 bg-slate-900/60"
            style={boardStyle}
          />

          <div
            id="p0-resources"
            className="pointer-events-none absolute bottom-6 left-6 flex h-12 w-20 items-center justify-center rounded bg-slate-200 text-xs font-semibold text-slate-900"
          >
            P0
          </div>
          <div
            id="p1-resources"
            className="pointer-events-none absolute bottom-6 right-6 flex h-12 w-20 items-center justify-center rounded bg-slate-200 text-xs font-semibold text-slate-900"
          >
            P1
          </div>

          {mounted ? <EffectLayer ref={layerRef} /> : null}
        </section>
      </div>
    </div>
  );
}
