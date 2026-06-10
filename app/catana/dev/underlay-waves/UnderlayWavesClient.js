"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  BOARD_UNDERLAY_DESIGN_SIZE,
  STANDARD_BOARD_LAND_COORDS,
  STANDARD_BOARD_UNDERLAY,
  getHexCorners
} from "../../utils/boardUnderlayGeometry";

const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] =
  STANDARD_BOARD_UNDERLAY.viewBox;

const WAVE_VARIANTS = [
  {
    id: "lap",
    label: "Incoming Lap",
    description: "Soft water bands pass over the visible SVG edge."
  },
  {
    id: "drift",
    label: "Slow Drift",
    description: "A softened shoreline copy drifts over the fixed base."
  }
];

const TILE_PALETTE = [
  "#a3e635",
  "#22c55e",
  "#94a3b8",
  "#fb923c",
  "#fcd34d",
  "#f97316",
  "#84cc16",
  "#10b981",
  "#bef264",
  "#e5d08a"
];

const BOARD_NUMBERS = [
  10, 8, 4, 6, 11, 12, 9, 10, 3, 6, 3, 5, 4, 2, 5, 8, 11, 9, null
];

const PORT_MARKERS = [
  { x: -360, y: -325, label: "2:1" },
  { x: 0, y: -325, label: "2:1" },
  { x: 340, y: -210, label: "2:1" },
  { x: 420, y: 0, label: "3:1" },
  { x: 300, y: 260, label: "3:1" },
  { x: 0, y: 360, label: "3:1" },
  { x: -360, y: 260, label: "2:1" },
  { x: -420, y: 0, label: "2:1" },
  { x: -300, y: -210, label: "2:1" }
];

function getLayer(id) {
  return STANDARD_BOARD_UNDERLAY.layers.find((layer) => layer.id === id);
}

const outerBlueLayer = getLayer("outerBlue");
const paleSurfLayer = getLayer("paleSurf");
const sandLayer = getLayer("sand");
const innerTintLayer = getLayer("innerTint");
const sandEdgePath = `${sandLayer.path} ${innerTintLayer.path}`;

function cx(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

function pointsAttribute(points) {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

function NumberToken({ number, x, y }) {
  if (!number) {
    return null;
  }

  const isHot = number === 6 || number === 8;
  const pipCount =
    number === 2 || number === 12
      ? 1
      : number === 3 || number === 11
        ? 2
        : number === 4 || number === 10
          ? 3
          : 4;

  return (
    <g transform={`translate(${x - 25} ${y - 2})`}>
      <rect
        width="50"
        height="50"
        rx="7"
        fill="#f8fafc"
        opacity="0.96"
        filter="drop-shadow(0 5px 7px rgba(15, 23, 42, 0.22))"
      />
      <text
        x="25"
        y="28"
        fill={isHot ? "#dc2626" : "#020617"}
        fontSize="28"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {number}
      </text>
      <text
        x="25"
        y="42"
        fill={isHot ? "#dc2626" : "#020617"}
        fontSize="11"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {"•".repeat(pipCount)}
      </text>
    </g>
  );
}

function BoardContextLayer({ showPorts }) {
  return (
    <g aria-hidden="true">
      {STANDARD_BOARD_LAND_COORDS.map((coordinate, index) => {
        const corners = getHexCorners(
          coordinate,
          BOARD_UNDERLAY_DESIGN_SIZE,
          [0, 0]
        );
        const [q, , s] = coordinate;
        const centerX =
          BOARD_UNDERLAY_DESIGN_SIZE *
          (1.73205080757 * q + (1.73205080757 / 2) * s);
        const centerY = BOARD_UNDERLAY_DESIGN_SIZE * (3 / 2) * s;
        const fill = TILE_PALETTE[index % TILE_PALETTE.length];

        return (
          <g key={coordinate.join(":")}>
            <polygon
              points={pointsAttribute(corners)}
              fill={fill}
              stroke="#f5df91"
              strokeWidth="10"
              opacity="0.94"
              filter="drop-shadow(0 8px 8px rgba(15, 23, 42, 0.2))"
            />
            <polygon
              points={pointsAttribute(corners)}
              fill="none"
              stroke="rgba(255,255,255,0.58)"
              strokeWidth="2"
            />
            <NumberToken
              number={BOARD_NUMBERS[index]}
              x={centerX}
              y={centerY - 20}
            />
          </g>
        );
      })}

      {showPorts
        ? PORT_MARKERS.map((port) => (
            <g key={`${port.x}:${port.y}`} transform={`translate(${port.x} ${port.y})`}>
              <circle
                r="42"
                fill="#fff7b8"
                stroke="#dbeafe"
                strokeWidth="14"
                opacity="0.9"
              />
              <circle r="34" fill="none" stroke="#e5d08a" strokeWidth="4" />
              <text
                x="0"
                y="7"
                fill="#0f172a"
                fontSize="22"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {port.label}
              </text>
            </g>
          ))
        : null}
    </g>
  );
}

function UnderlaySvg({
  refs,
  showBoard,
  showPorts,
  showStaticUnderlay
}) {
  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
      role="img"
      aria-label="Catana island underlay wave preview"
    >
      <rect
        x={viewBoxX - 80}
        y={viewBoxY - 80}
        width={viewBoxWidth + 160}
        height={viewBoxHeight + 160}
        fill="#2f95e8"
      />

      {showStaticUnderlay ? (
        <g>
          <path d={outerBlueLayer.path} fill={outerBlueLayer.fill} />
          <path d={paleSurfLayer.path} fill={paleSurfLayer.fill} />
          <path d={sandLayer.path} fill={sandLayer.fill} />
          <path d={innerTintLayer.path} fill={innerTintLayer.fill} />
        </g>
      ) : null}

      <g ref={refs.driftWash} opacity="0">
        <path d={outerBlueLayer.path} fill="#c9efff" opacity="0.3" />
        <path d={paleSurfLayer.path} fill="#ffffff" opacity="0.18" />
        <path
          d={sandEdgePath}
          fill="#fff6cf"
          fillRule="evenodd"
          opacity="0.07"
        />
      </g>

      <g ref={refs.lapOuter} opacity="0">
        <path d={outerBlueLayer.path} fill="#d7f4ff" opacity="0.42" />
        <path d={paleSurfLayer.path} fill="#ffffff" opacity="0.18" />
      </g>
      <g ref={refs.lapSurf} opacity="0">
        <path d={paleSurfLayer.path} fill="#ffffff" opacity="0.28" />
        <path d={sandLayer.path} fill="#fff3c4" opacity="0.06" />
      </g>
      <g ref={refs.lapSand} opacity="0">
        <path
          d={sandEdgePath}
          fill="#fff7cf"
          fillRule="evenodd"
          opacity="0.08"
        />
      </g>

      {showBoard ? <BoardContextLayer showPorts={showPorts} /> : null}
    </svg>
  );
}

function SegmentedButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-lg px-3 py-2 text-sm font-bold transition",
        active
          ? "bg-lime-500 text-white shadow-md"
          : "bg-white/55 text-slate-700 ring-1 ring-white/50 hover:bg-white/75"
      )}
    >
      {children}
    </button>
  );
}

function ToggleButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition",
        active
          ? "bg-amber-400 text-slate-900 shadow-md"
          : "bg-white/45 text-slate-600 ring-1 ring-white/50 hover:bg-white/65"
      )}
    >
      {children}
    </button>
  );
}

export function UnderlayWavesClient() {
  const lapOuterRef = useRef(null);
  const lapSurfRef = useRef(null);
  const lapSandRef = useRef(null);
  const driftWashRef = useRef(null);
  const [variantId, setVariantId] = useState(WAVE_VARIANTS[0].id);
  const [showBoard, setShowBoard] = useState(true);
  const [showPorts, setShowPorts] = useState(true);
  const [showStaticUnderlay, setShowStaticUnderlay] = useState(true);
  const [scale, setScale] = useState(1);
  const [speed, setSpeed] = useState(1);

  const refs = useMemo(
    () => ({
      lapOuter: lapOuterRef,
      lapSurf: lapSurfRef,
      lapSand: lapSandRef,
      driftWash: driftWashRef,
    }),
    []
  );

  const selectedVariant =
    WAVE_VARIANTS.find((variant) => variant.id === variantId) ??
    WAVE_VARIANTS[0];

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const nodes = [
      lapOuterRef.current,
      lapSurfRef.current,
      lapSandRef.current,
      driftWashRef.current,
    ].filter(Boolean);

    gsap.killTweensOf(nodes);
    gsap.set(nodes, {
      clearProps: "transform,opacity",
      svgOrigin: "0 0",
      transformOrigin: "50% 50%"
    });

    if (reduceMotion) {
      gsap.set(nodes, { opacity: 0 });
      return undefined;
    }

    const timeline = gsap.timeline({
      repeat: -1,
      defaults: { ease: "sine.inOut" }
    });
    const durationScale = 1 / speed;

    if (variantId === "lap") {
      gsap.set(driftWashRef.current, { opacity: 0 });
      timeline
        .fromTo(
          lapOuterRef.current,
          { scale: 1.026, opacity: 0 },
          {
            keyframes: [
              { scale: 1.012, opacity: 0.34, duration: 2.6 * durationScale },
              { scale: 0.998, opacity: 0, duration: 2.7 * durationScale }
            ]
          },
          0
        )
        .fromTo(
          lapSurfRef.current,
          { scale: 1.014, opacity: 0 },
          {
            keyframes: [
              { scale: 1.004, opacity: 0.28, duration: 2.3 * durationScale },
              { scale: 0.996, opacity: 0, duration: 2.1 * durationScale }
            ]
          },
          1.1 * durationScale
        )
        .fromTo(
          lapSandRef.current,
          { scale: 1.004, opacity: 0 },
          {
            keyframes: [
              { scale: 1, opacity: 0.1, duration: 1.5 * durationScale },
              { scale: 0.997, opacity: 0, duration: 1.7 * durationScale }
            ]
          },
          1.7 * durationScale
        );
    }

    if (variantId === "drift") {
      gsap.set(
        [lapOuterRef.current, lapSurfRef.current, lapSandRef.current],
        { opacity: 0 }
      );
      timeline
        .fromTo(
          driftWashRef.current,
          { x: -5, y: 2, scale: 1.008, opacity: 0.22 },
          { x: 5, y: -2, scale: 1.012, opacity: 0.3, duration: 5 * durationScale },
          0
        )
        .to(driftWashRef.current, {
          x: -5,
          y: 2,
          scale: 1.008,
          opacity: 0.22,
          duration: 5 * durationScale
        });
    }

    return () => {
      timeline.kill();
    };
  }, [variantId, speed]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,1)_0%,_rgba(59,130,246,1)_46%,_rgba(2,132,199,1)_100%)] text-slate-800">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
        <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-xl bg-white/70 p-4 shadow-lg ring-1 ring-white/60 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              Catana Dev
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Underlay Waves
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              Preview ambient shoreline motion against the generated island
              underlay and a simplified board context.
            </p>
          </section>

          <section className="rounded-xl bg-white/55 p-4 shadow-lg ring-1 ring-white/50 backdrop-blur-sm">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              Variant
            </div>
            <div className="mt-3 grid gap-2">
              {WAVE_VARIANTS.map((variant) => (
                <SegmentedButton
                  key={variant.id}
                  active={variant.id === variantId}
                  onClick={() => setVariantId(variant.id)}
                >
                  {variant.label}
                </SegmentedButton>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-700">
              {selectedVariant.description}
            </p>
          </section>

          <section className="space-y-4 rounded-xl bg-white/55 p-4 shadow-lg ring-1 ring-white/50 backdrop-blur-sm">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-600">
                View
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ToggleButton
                  active={showBoard}
                  onClick={() => setShowBoard((current) => !current)}
                >
                  Board
                </ToggleButton>
                <ToggleButton
                  active={showPorts}
                  onClick={() => setShowPorts((current) => !current)}
                >
                  Ports
                </ToggleButton>
                <ToggleButton
                  active={showStaticUnderlay}
                  onClick={() =>
                    setShowStaticUnderlay((current) => !current)
                  }
                >
                  Base
                </ToggleButton>
              </div>
            </div>

            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
              Preview Scale
              <input
                className="mt-3 w-full accent-lime-500"
                type="range"
                min="0.72"
                max="1.22"
                step="0.01"
                value={scale}
                onChange={(event) => setScale(Number(event.target.value))}
              />
              <span className="mt-1 block text-sm font-semibold normal-case tracking-normal text-slate-800">
                {scale.toFixed(2)}x
              </span>
            </label>

            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-600">
              Motion Speed
              <input
                className="mt-3 w-full accent-lime-500"
                type="range"
                min="0.4"
                max="1.8"
                step="0.1"
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <span className="mt-1 block text-sm font-semibold normal-case tracking-normal text-slate-800">
                {speed.toFixed(1)}x
              </span>
            </label>
          </section>
        </aside>

        <section className="min-h-[680px] rounded-xl bg-white/25 p-3 shadow-xl ring-1 ring-white/40 backdrop-blur-sm lg:min-h-0">
          <div className="relative grid h-full min-h-[640px] place-items-center overflow-hidden rounded-lg bg-sky-500 shadow-inner ring-1 ring-white/40">
            <div
              className="h-[min(84vh,760px)] w-full max-w-[880px]"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "center center"
              }}
            >
              <UnderlaySvg
                refs={refs}
                showBoard={showBoard}
                showPorts={showPorts}
                showStaticUnderlay={showStaticUnderlay}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
