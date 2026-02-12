"use client";

import React, { useMemo, useRef, useState } from "react";
import { createResourceDistributionRunner } from "../../effects/resourceDistribution";
import { buildResourceDistributionDemo } from "./resourceDistributionLabUtils";
import { createSeededRandom } from "../../utils/seededRandom";
import useWindowSize from "../../utils/useWindowSize";
import { getBoardLayout } from "../../utils/boardLayout";

const DEFAULT_SEED = 1;
const DEFAULT_COUNT = 4;

export function ResourceDistributionLab({ layerRef, emitCue }) {
  const boardRef = useRef(null);
  const { width, height } = useWindowSize();
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [count, setCount] = useState(DEFAULT_COUNT);

  const layout = useMemo(() => {
    if (!width || !height) return null;
    return getBoardLayout({ width, height });
  }, [width, height]);

  const handleReplay = () => {
    if (!layout || !boardRef.current || !layerRef?.current) return;
    const random = createSeededRandom(Number(seed) || DEFAULT_SEED);
    const cards = buildResourceDistributionDemo({
      count: Number(count) || DEFAULT_COUNT,
      random
    });
    const runner = createResourceDistributionRunner({
      getLayerEl: () => layerRef.current,
      getLayout: () => layout,
      getBoardRect: () => boardRef.current.getBoundingClientRect(),
      emitCue,
      random
    });
    runner({ cards });
  };

  const boardStyle = {
    width: layout?.containerWidth ?? 640,
    height: layout?.containerHeight ?? 640
  };

  return (
    <div className="flex flex-col gap-6">
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

        <button
          className="rounded bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-400"
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
      </section>
    </div>
  );
}
