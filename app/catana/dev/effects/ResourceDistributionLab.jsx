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
    <div className="flex flex-col gap-ui-6">
      <section className="settlex-dev-console-panel flex flex-wrap items-end gap-ui-4 p-ui-4">
        <label className="type-label flex flex-col text-ink-console-muted">
          Seed
          <input
            className="settlex-dev-console-field mt-ui-1"
            type="number"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
          />
        </label>

        <label className="type-label flex flex-col text-ink-console-muted">
          Cards
          <input
            className="mt-ui-1"
            type="range"
            min="1"
            max="10"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
          <span className="type-body-small text-ink-console-secondary">{count}</span>
        </label>

        <button
          className="settlex-dev-console-button"
          onClick={handleReplay}
          type="button"
        >
          Replay
        </button>
      </section>

      <section className="settlex-dev-console-panel relative flex items-center justify-center p-ui-8">
        <div
          ref={boardRef}
          className="relative rounded-control border border-dashed border-console-edge bg-surface-console-inset"
          style={boardStyle}
        />

        <div
          id="p0-resources"
          className="type-label pointer-events-none absolute bottom-6 left-6 flex h-12 w-20 items-center justify-center rounded-small bg-surface-solid text-ink-primary"
        >
          P0
        </div>
        <div
          id="p1-resources"
          className="type-label pointer-events-none absolute bottom-6 right-6 flex h-12 w-20 items-center justify-center rounded-small bg-surface-solid text-ink-primary"
        >
          P1
        </div>
      </section>
    </div>
  );
}
