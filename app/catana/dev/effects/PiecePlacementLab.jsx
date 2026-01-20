"use client";

import React, { useMemo, useRef, useState } from "react";
import { createPiecePlacementRunner } from "../../effects/placePiece";
import { createSeededRandom } from "../../utils/seededRandom";
import useWindowSize from "../../utils/useWindowSize";
import { getBoardLayout } from "../../utils/boardLayout";
import { buildRenderMaps } from "../../utils/renderMaps";
import { generateBoard, resolveBoardConfig } from "@settlex/game-core";

const DEFAULT_SEED = 1;
const DEFAULT_PLAYER_ID = "0";
const DEFAULT_TUNING = {
  dropDistance: 1.5,
  dropDuration: 0.22,
  squishDuration: 0.08,
  settleDuration: 0.18,
  dustDuration: 0.24,
  dustScaleFrom: 0.2,
  dustScaleTo: 1.15,
  dustOpacity: 0.7,
  squishScaleX: 1,
  squishScaleY: 1,
  roadSquishScaleX: 1,
  roadSquishScaleY: 1,
  dustSizeSettlement: 1.05,
  dustSizeRoad: 0.85,
  shadowOpacity: 0.35,
  shadowScaleFrom: 0.4,
  shadowScaleTo: 0.9,
  shadowSizeSettlement: 0.85,
  shadowSizeRoad: 0.6,
  shadowFadeOutDuration: 0.08,
  shadowEase: "power2.out",
  easeDrop: "power2.in",
  easeDust: "power2.out",
  easeSquish: "power2.out",
  easeSettle: "back.out(1.6)",
  easeSettleRoad: "back.out(1.4)"
};

const COLOR_OPTIONS = [
  { id: "red", label: "Red" },
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "orange", label: "Orange" }
];

const createRangeField = (label, value, setValue, min, max, step = 0.01) => (
  <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
    {label}
    <input
      className="mt-1"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => setValue(Number(event.target.value))}
    />
    <span className="text-sm text-slate-200">{value}</span>
  </label>
);

export function PiecePlacementLab({ layerRef, emitCue }) {
  const boardRef = useRef(null);
  const { width, height } = useWindowSize();
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [pieceType, setPieceType] = useState("settlement");
  const [playerColor, setPlayerColor] = useState("red");
  const [targetIndex, setTargetIndex] = useState(0);
  const [tuning, setTuning] = useState(DEFAULT_TUNING);

  const layout = useMemo(() => {
    if (!width || !height) return null;
    return getBoardLayout({ width, height });
  }, [width, height]);

  const tiles = useMemo(() => {
    const random = createSeededRandom(Number(seed) || DEFAULT_SEED);
    const config = resolveBoardConfig("standard-random");
    return generateBoard(config, random, true);
  }, [seed]);

  const { nodeRenderById, edgeRenderById } = useMemo(
    () => buildRenderMaps(tiles),
    [tiles]
  );

  const nodeIds = useMemo(() => Object.keys(nodeRenderById), [nodeRenderById]);
  const edgeIds = useMemo(() => Object.keys(edgeRenderById), [edgeRenderById]);

  const handleReplay = () => {
    if (!layout || !boardRef.current || !layerRef?.current) return;
    const runner = createPiecePlacementRunner({
      getLayerEl: () => layerRef.current,
      getLayout: () => layout,
      getBoardRect: () => boardRef.current.getBoundingClientRect(),
      getTiles: () => tiles,
      getPlayerColor: () => playerColor,
      emitCue
    });

    const ids = pieceType === "road" ? edgeIds : nodeIds;
    if (!ids.length) return;
    const clampedIndex = Math.max(0, Math.min(targetIndex, ids.length - 1));
    const id = pieceType === "road" ? ids[clampedIndex] : Number(ids[clampedIndex]);

    runner({
      pieceType,
      id,
      playerId: DEFAULT_PLAYER_ID,
      tuning
    });
  };

  const boardStyle = {
    width: "100%",
    maxWidth: 720,
    aspectRatio: "1 / 1"
  };

  const targetMax = pieceType === "road" ? Math.max(edgeIds.length - 1, 0) : Math.max(nodeIds.length - 1, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
      <section className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/60 p-3">
        <div className="flex flex-wrap items-end gap-3">
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
            Piece
            <select
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={pieceType}
              onChange={(event) => {
                setPieceType(event.target.value);
                setTargetIndex(0);
              }}
            >
              <option value="settlement">Settlement</option>
              <option value="road">Road</option>
            </select>
          </label>

          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Player Color
            <select
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={playerColor}
              onChange={(event) => setPlayerColor(event.target.value)}
            >
              {COLOR_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            {pieceType === "road" ? "Edge" : "Node"} Index
            <input
              className="mt-1"
              type="range"
              min="0"
              max={targetMax}
              value={Math.min(targetIndex, targetMax)}
              onChange={(event) => setTargetIndex(Number(event.target.value))}
            />
            <span className="text-sm text-slate-200">{Math.min(targetIndex, targetMax)}</span>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {createRangeField("Drop Distance", tuning.dropDistance, (value) =>
            setTuning((prev) => ({ ...prev, dropDistance: value })), 0, 1.5, 0.05
          )}
          {createRangeField("Drop Duration", tuning.dropDuration, (value) =>
            setTuning((prev) => ({ ...prev, dropDuration: value })), 0.05, 0.6, 0.01
          )}
          {createRangeField("Squish Duration", tuning.squishDuration, (value) =>
            setTuning((prev) => ({ ...prev, squishDuration: value })), 0.03, 0.2, 0.01
          )}
          {createRangeField("Settle Duration", tuning.settleDuration, (value) =>
            setTuning((prev) => ({ ...prev, settleDuration: value })), 0.05, 0.4, 0.01
          )}
          {createRangeField("Dust Duration", tuning.dustDuration, (value) =>
            setTuning((prev) => ({ ...prev, dustDuration: value })), 0.05, 0.6, 0.01
          )}
          {createRangeField("Dust Opacity", tuning.dustOpacity, (value) =>
            setTuning((prev) => ({ ...prev, dustOpacity: value })), 0, 1, 0.05
          )}
          {createRangeField("Dust Scale From", tuning.dustScaleFrom, (value) =>
            setTuning((prev) => ({ ...prev, dustScaleFrom: value })), 0.1, 1, 0.05
          )}
          {createRangeField("Dust Scale To", tuning.dustScaleTo, (value) =>
            setTuning((prev) => ({ ...prev, dustScaleTo: value })), 0.5, 2, 0.05
          )}
          {createRangeField("Settlement Dust Size", tuning.dustSizeSettlement, (value) =>
            setTuning((prev) => ({ ...prev, dustSizeSettlement: value })), 0.4, 1.5, 0.05
          )}
          {createRangeField("Road Dust Size", tuning.dustSizeRoad, (value) =>
            setTuning((prev) => ({ ...prev, dustSizeRoad: value })), 0.3, 1.3, 0.05
          )}
          {createRangeField("Shadow Opacity", tuning.shadowOpacity, (value) =>
            setTuning((prev) => ({ ...prev, shadowOpacity: value })), 0, 0.6, 0.05
          )}
          {createRangeField("Shadow Scale From", tuning.shadowScaleFrom, (value) =>
            setTuning((prev) => ({ ...prev, shadowScaleFrom: value })), 0.2, 1, 0.05
          )}
          {createRangeField("Shadow Scale To", tuning.shadowScaleTo, (value) =>
            setTuning((prev) => ({ ...prev, shadowScaleTo: value })), 0.4, 1.2, 0.05
          )}
          {createRangeField("Settlement Shadow Size", tuning.shadowSizeSettlement, (value) =>
            setTuning((prev) => ({ ...prev, shadowSizeSettlement: value })), 0.6, 1.1, 0.05
          )}
          {createRangeField("Road Shadow Size", tuning.shadowSizeRoad, (value) =>
            setTuning((prev) => ({ ...prev, shadowSizeRoad: value })), 0.4, 0.9, 0.05
          )}
          {createRangeField("Shadow Fade", tuning.shadowFadeOutDuration, (value) =>
            setTuning((prev) => ({ ...prev, shadowFadeOutDuration: value })), 0.02, 0.2, 0.01
          )}
          {createRangeField("Squish X", tuning.squishScaleX, (value) =>
            setTuning((prev) => ({ ...prev, squishScaleX: value })), 0.9, 1.1, 0.01
          )}
          {createRangeField("Squish Y", tuning.squishScaleY, (value) =>
            setTuning((prev) => ({ ...prev, squishScaleY: value })), 0.85, 1.1, 0.01
          )}
          {createRangeField("Road Squish X", tuning.roadSquishScaleX, (value) =>
            setTuning((prev) => ({ ...prev, roadSquishScaleX: value })), 0.9, 1.1, 0.01
          )}
          {createRangeField("Road Squish Y", tuning.roadSquishScaleY, (value) =>
            setTuning((prev) => ({ ...prev, roadSquishScaleY: value })), 0.85, 1.1, 0.01
          )}
          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Ease Drop
            <input
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={tuning.easeDrop}
              onChange={(event) => setTuning((prev) => ({ ...prev, easeDrop: event.target.value }))}
            />
          </label>
        <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
          Ease Dust
          <input
            className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            value={tuning.easeDust}
            onChange={(event) => setTuning((prev) => ({ ...prev, easeDust: event.target.value }))}
          />
        </label>
        <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
          Ease Shadow
          <input
            className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            value={tuning.shadowEase}
            onChange={(event) => setTuning((prev) => ({ ...prev, shadowEase: event.target.value }))}
          />
        </label>
        <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
          Ease Squish
          <input
            className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={tuning.easeSquish}
              onChange={(event) => setTuning((prev) => ({ ...prev, easeSquish: event.target.value }))}
            />
          </label>
          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Ease Settle (Settlement)
            <input
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={tuning.easeSettle}
              onChange={(event) => setTuning((prev) => ({ ...prev, easeSettle: event.target.value }))}
            />
          </label>
          <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
            Ease Settle (Road)
            <input
              className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
              value={tuning.easeSettleRoad}
              onChange={(event) => setTuning((prev) => ({ ...prev, easeSettleRoad: event.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="relative flex min-w-0 flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/40 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Preview</h2>
          <button
            className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
            onClick={handleReplay}
            type="button"
          >
            Play
          </button>
        </div>
        <div className="relative flex items-center justify-center">
          <div
            ref={boardRef}
            className="relative rounded-xl border border-dashed border-slate-600 bg-slate-900/60"
            style={boardStyle}
          />
        </div>
      </section>
    </div>
  );
}
