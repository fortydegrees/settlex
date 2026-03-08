"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DESERT_COLORS = {
  base: "#e9c77c",
  highlight: "#f8e2aa",
  shadow: "#a8742a",
  ink: "#0f172a",
};

const PALETTES = {
  C: {
    name: "Option C - Bright Gold Wheat / Split Greens",
    note: "Updated bright-gold wheat target with strong sheep/lumber separation.",
    tileFilter: "saturate(1.2) contrast(1.05)",
    resources: {
      ore: { base: "#86a8ce", highlight: "#e8f2ff", shadow: "#3c4f66", ink: "#0f172a" },
      wheat: { base: "#fcd34d", highlight: "#fef08a", shadow: "#f59e0b", ink: "#b45309" },
      sheep: { base: "#a3e635", highlight: "#ecfccb", shadow: "#4d7c0f", ink: "#0f172a" },
      lumber: { base: "#10b981", highlight: "#6ee7b7", shadow: "#065f46", ink: "#0f172a" },
      brick: { base: "#fb923c", highlight: "#fed7aa", shadow: "#c2410c", ink: "#0f172a" },
      desert: DESERT_COLORS,
    },
  },
  B: {
    name: "Option B - Vibrance+ (Playful)",
    note: "Higher saturation and stronger highlight/shadow separation for a juicier board feel.",
    tileFilter: "saturate(1.22) contrast(1.05)",
    resources: {
      ore: { base: "#7ea1cc", highlight: "#e6f0ff", shadow: "#334155", ink: "#0f172a" },
      wheat: { base: "#fcd34d", highlight: "#fef08a", shadow: "#f59e0b", ink: "#b45309" },
      sheep: { base: "#84cc16", highlight: "#d9f99d", shadow: "#3f6212", ink: "#0f172a" },
      lumber: { base: "#16a34a", highlight: "#86efac", shadow: "#14532d", ink: "#0f172a" },
      brick: { base: "#f97316", highlight: "#fed7aa", shadow: "#9a3412", ink: "#0f172a" },
      desert: DESERT_COLORS,
    },
  },
  A: {
    name: "Option A - Juicy Pop (Balanced)",
    note: "Moderate saturation/contrast bump with balanced resource separation.",
    tileFilter: "saturate(1.08) contrast(1.04)",
    resources: {
      ore: { base: "#8ea6c5", highlight: "#dbe8f8", shadow: "#475569", ink: "#0f172a" },
      wheat: { base: "#fcd34d", highlight: "#fef08a", shadow: "#f59e0b", ink: "#b45309" },
      sheep: { base: "#a3e635", highlight: "#d9f99d", shadow: "#4d7c0f", ink: "#0f172a" },
      lumber: { base: "#22c55e", highlight: "#86efac", shadow: "#166534", ink: "#0f172a" },
      brick: { base: "#f97316", highlight: "#fdba74", shadow: "#c2410c", ink: "#0f172a" },
      desert: DESERT_COLORS,
    },
  },
  D: {
    name: "Option D - Slate Ore / Split Greens",
    note: "Slate-steel ore with strong sheep/lumber separation for faster scanning.",
    tileFilter: "saturate(1.18) contrast(1.04)",
    resources: {
      ore: { base: "#94a3b8", highlight: "#dbe4ef", shadow: "#334155", ink: "#0f172a" },
      wheat: { base: "#fcd34d", highlight: "#fef08a", shadow: "#f59e0b", ink: "#b45309" },
      sheep: { base: "#bef264", highlight: "#f0fdb4", shadow: "#65a30d", ink: "#0f172a" },
      lumber: { base: "#059669", highlight: "#6ee7b7", shadow: "#065f46", ink: "#0f172a" },
      brick: { base: "#f97316", highlight: "#fed7aa", shadow: "#9a3412", ink: "#0f172a" },
      desert: DESERT_COLORS,
    },
  },
  E: {
    name: "Option E - Accessibility Patterns",
    note: "Same base colors as D; pattern overlays are not shown in this board preview route.",
    tileFilter: "saturate(1.16) contrast(1.03)",
    resources: {
      ore: { base: "#94a3b8", highlight: "#dbe4ef", shadow: "#334155", ink: "#0f172a" },
      wheat: { base: "#fcd34d", highlight: "#fef08a", shadow: "#f59e0b", ink: "#b45309" },
      sheep: { base: "#bef264", highlight: "#f0fdb4", shadow: "#65a30d", ink: "#0f172a" },
      lumber: { base: "#059669", highlight: "#6ee7b7", shadow: "#065f46", ink: "#0f172a" },
      brick: { base: "#f97316", highlight: "#fed7aa", shadow: "#9a3412", ink: "#0f172a" },
      desert: DESERT_COLORS,
    },
  },
};

const ROW_RESOURCE_ORDER = ["ore", "wheat", "sheep", "lumber", "brick"];
const ROW_SAMPLE_NUMBERS = { ore: 10, wheat: 8, sheep: 4, lumber: 11, brick: 6 };

const BOARD_ROWS = [
  ["ore", "wheat", "sheep"],
  ["lumber", "brick", "wheat", "ore"],
  ["sheep", "lumber", "desert", "brick", "wheat"],
  ["ore", "sheep", "lumber", "wheat"],
  ["brick", "sheep", "lumber"],
];

const BOARD_NUMBERS = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11];

const TILE_BORDER = "#fbbf24";

const numberToPips = (number) => {
  switch (number) {
    case 2:
    case 12:
      return "•";
    case 3:
    case 11:
      return "••";
    case 4:
    case 10:
      return "•••";
    case 5:
    case 9:
      return "••••";
    case 6:
    case 8:
      return "•••••";
    default:
      return "";
  }
};

function NumberToken({ number, size }) {
  const pips = numberToPips(number);
  let numberColor = "text-black";
  if (number === 6 || number === 8) {
    numberColor = "text-red-600";
  }

  return (
    <div
      className={`drop-shadow-md bg-slate-100 ${size >= 60 ? "rounded-md" : "rounded-sm"}`}
      style={{
        width: size / 1.75,
        height: size / 1.75,
        marginTop: size / 1.66,
      }}
    >
      <div className="select-none flex flex-col items-center">
        <span
          className={`${numberColor} font-black`}
          style={{
            fontSize: `${size * 0.4}px`,
            lineHeight: 0,
            marginTop: `${size * 0.25}px`,
          }}
        >
          {number}
        </span>
        <span
          className={`${numberColor} leading-none font-bold`}
          style={{
            fontSize: `${size * 0.18}px`,
            lineHeight: 0,
            marginTop: `${size * 0.22}px`,
          }}
        >
          {pips}
        </span>
      </div>
    </div>
  );
}

function tileSvg(colors, key) {
  const bodyLiftId = `${key}-body-lift`;
  const bodyShadeId = `${key}-body-shade`;
  const ringOuterId = `${key}-ring-outer`;
  const ringInnerId = `${key}-ring-inner`;
  const vignetteId = `${key}-vignette`;

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 346 400" preserveAspectRatio="xMidYMid meet" role="img" aria-label="tile">
  <defs>
    <path id="${key}-inner-hex" d="M173 15L333.2 107.5V292.5L173 385L12.8 292.5V107.5Z" />
    <path id="${key}-split-hex" d="M173 29L321 114.4V285.6L173 371L25 285.6V114.4Z" />
    <clipPath id="${key}-inner-clip" clipPathUnits="userSpaceOnUse">
      <use href="#${key}-inner-hex" />
    </clipPath>

    <radialGradient id="${bodyLiftId}" gradientUnits="userSpaceOnUse" cx="140" cy="120" r="220">
      <stop offset="0" stop-color="${colors.highlight}" stop-opacity="0.22" />
      <stop offset="0.45" stop-color="${colors.highlight}" stop-opacity="0.10" />
      <stop offset="1" stop-color="${colors.highlight}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="${bodyShadeId}" gradientUnits="userSpaceOnUse" cx="224" cy="250" r="260">
      <stop offset="0" stop-color="${colors.shadow}" stop-opacity="0" />
      <stop offset="0.65" stop-color="${colors.shadow}" stop-opacity="0.09" />
      <stop offset="1" stop-color="${colors.shadow}" stop-opacity="0.20" />
    </radialGradient>

    <linearGradient id="${ringOuterId}" gradientUnits="userSpaceOnUse" x1="226" y1="34" x2="110" y2="366">
      <stop offset="0" stop-color="${colors.highlight}" stop-opacity="1" />
      <stop offset="0.24" stop-color="${colors.base}" stop-opacity="1" />
      <stop offset="0.56" stop-color="${colors.highlight}" stop-opacity="0.82" />
      <stop offset="1" stop-color="${colors.shadow}" stop-opacity="0.72" />
    </linearGradient>

    <linearGradient id="${ringInnerId}" gradientUnits="userSpaceOnUse" x1="216" y1="50" x2="122" y2="350">
      <stop offset="0" stop-color="${colors.highlight}" stop-opacity="1" />
      <stop offset="0.30" stop-color="${colors.base}" stop-opacity="1" />
      <stop offset="0.52" stop-color="${colors.highlight}" stop-opacity="0.78" />
      <stop offset="1" stop-color="${colors.shadow}" stop-opacity="0.72" />
    </linearGradient>

    <radialGradient id="${vignetteId}" gradientUnits="userSpaceOnUse" cx="173" cy="226" r="196">
      <stop offset="0" stop-color="${colors.ink}" stop-opacity="0" />
      <stop offset="1" stop-color="${colors.ink}" stop-opacity="0.18" />
    </radialGradient>
  </defs>

  <path
    id="tileBorder"
    fill="${TILE_BORDER}"
    fill-rule="evenodd"
    d="M173 0L346 100V300L173 400L0 300V100Z M173 15L333.2 107.5V292.5L173 385L12.8 292.5V107.5Z"
  />

  <g id="tileArt" clip-path="url(#${key}-inner-clip)">
    <use href="#${key}-inner-hex" fill="${colors.base}" />
    <use href="#${key}-inner-hex" fill="url(#${bodyLiftId})" />
    <use href="#${key}-inner-hex" fill="url(#${bodyShadeId})" />

    <path
      fill="url(#${ringOuterId})"
      fill-rule="evenodd"
      d="M173 15L333.2 107.5V292.5L173 385L12.8 292.5V107.5Z M173 29L321 114.4V285.6L173 371L25 285.6V114.4Z"
    />

    <path
      fill="url(#${ringInnerId})"
      fill-rule="evenodd"
      d="M173 29L321 114.4V285.6L173 371L25 285.6V114.4Z M173 33.5L317 116.7V283.3L173 366.5L29 283.3V116.7Z"
    />

    <g id="ringSeparators" pointer-events="none">
      <use href="#${key}-inner-hex" fill="none" stroke="${colors.shadow}" stroke-width="5.2" opacity="0.68" />
      <use href="#${key}-inner-hex" fill="none" stroke="${colors.highlight}" stroke-width="1.5" opacity="0.3" />
      <use href="#${key}-split-hex" fill="none" stroke="${colors.shadow}" stroke-width="2" opacity="0.39" />
      <use href="#${key}-split-hex" fill="none" stroke="${colors.highlight}" stroke-width="1" opacity="0.35" />
    </g>

    <use href="#${key}-inner-hex" fill="url(#${vignetteId})" />
  </g>
</svg>`;
}

function buildBoardTiles() {
  const rows = [];
  let numberIndex = 0;

  for (const row of BOARD_ROWS) {
    const rowTiles = row.map((resourceKey) => {
      if (resourceKey === "desert") {
        return { resourceKey, number: null };
      }

      const number = BOARD_NUMBERS[numberIndex] ?? null;
      numberIndex += 1;
      return { resourceKey, number };
    });

    rows.push(rowTiles);
  }

  return rows;
}

function TileFrame({ colors, svgKey, tileFilter, number, showNumberTokens }) {
  const frameRef = useRef(null);
  const [tokenSize, setTokenSize] = useState(72);

  useEffect(() => {
    const frameNode = frameRef.current;
    if (!frameNode) {
      return undefined;
    }

    const updateTokenSize = () => {
      const height = frameNode.getBoundingClientRect().height;
      if (height > 0) {
        setTokenSize(height / 2);
      }
    };

    updateTokenSize();

    if (typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      updateTokenSize();
    });

    observer.observe(frameNode);
    return () => observer.disconnect();
  }, []);

  const frameStyle = {
    position: "relative",
    width: "100%",
    aspectRatio: "346 / 400",
    overflow: "hidden",
    borderRadius: "10px",
    background: "rgba(255, 255, 255, 0.45)",
  };
  const svgStyle = {
    width: "100%",
    height: "100%",
    lineHeight: 0,
    filter: tileFilter,
  };
  const tokenWrapStyle = {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  };

  return (
    <div ref={frameRef} style={frameStyle}>
      <div style={svgStyle} dangerouslySetInnerHTML={{ __html: tileSvg(colors, svgKey) }} />
      {showNumberTokens && number != null ? (
        <div style={tokenWrapStyle}>
          <NumberToken number={number} size={tokenSize} />
        </div>
      ) : null}
    </div>
  );
}

export function PaletteBoardPreviewClient() {
  const [selectedPaletteId, setSelectedPaletteId] = useState("C");
  const [showNumberTokens, setShowNumberTokens] = useState(true);

  const boardRows = useMemo(() => buildBoardTiles(), []);
  const palette = PALETTES[selectedPaletteId] || PALETTES.C;

  return (
    <main className="min-h-screen px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-[1320px] rounded-[20px] border border-white/50 bg-white/70 p-5 shadow-[0_28px_60px_rgba(15,23,42,0.2)] backdrop-blur-md">
        <h1 className="text-[clamp(1.4rem,2.7vw,2.1rem)] font-extrabold tracking-[0.02em]">
          Palette Row + Board Preview
        </h1>
        <p className="mb-3 mt-2 text-[0.95rem] text-slate-700">
          Pick Option C/B/A/D/E, toggle number tokens, and preview both the resource row and a full 19-hex board.
        </p>

        <section className="mb-3 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5 rounded-xl border border-white/60 bg-white/65 p-3">
          <div className="grid gap-1.5">
            <label htmlFor="palette-select" className="text-[0.76rem] font-bold uppercase tracking-[0.08em] text-slate-700">
              Palette Option
            </label>
            <select
              id="palette-select"
              className="w-full rounded-lg border border-slate-300/80 bg-white/90 px-2.5 py-1.5 text-[0.9rem]"
              value={selectedPaletteId}
              onChange={(event) => setSelectedPaletteId(event.target.value)}
            >
              <option value="C">Option C</option>
              <option value="B">Option B</option>
              <option value="A">Option A</option>
              <option value="D">Option D</option>
              <option value="E">Option E</option>
            </select>
          </div>

          <div className="grid grid-cols-[auto_1fr] items-end gap-2">
            <input
              id="show-number-tokens"
              type="checkbox"
              className="h-4 w-4 accent-green-600"
              checked={showNumberTokens}
              onChange={(event) => setShowNumberTokens(event.target.checked)}
            />
            <label htmlFor="show-number-tokens" className="text-[0.9rem] font-semibold text-slate-800">
              Show number tokens
            </label>
          </div>
        </section>

        <p className="mb-3 text-[0.86rem] leading-[1.35] text-slate-700">
          {palette.name}. {palette.note} Number tokens {showNumberTokens ? "enabled" : "disabled"}.
        </p>

        <section className="rounded-xl border border-white/60 bg-white/60 p-3">
          <h2 className="mb-2.5 text-[1.04rem] font-bold">Selected Resource Row</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
            {ROW_RESOURCE_ORDER.map((resourceKey) => (
              <article key={`row-card-${resourceKey}`} className="rounded-xl border border-white/80 bg-white/85 p-2 shadow-[0_8px_18px_rgba(15,23,42,0.12)]">
                <TileFrame
                  colors={palette.resources[resourceKey]}
                  svgKey={`row-${selectedPaletteId}-${resourceKey}`}
                  tileFilter={palette.tileFilter}
                  number={ROW_SAMPLE_NUMBERS[resourceKey]}
                  showNumberTokens={showNumberTokens}
                />
                <p className="mt-2 text-center text-[0.86rem] font-bold capitalize text-slate-900">
                  {resourceKey}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-3 rounded-xl border border-white/60 bg-white/60 p-3">
          <h2 className="mb-2.5 text-[1.04rem] font-bold">Board Preview (19 Hexes)</h2>
          <div className="boardScroll">
            <div className="boardRoot">
              {boardRows.map((rowTiles, rowIndex) => (
                <div key={`board-row-${rowIndex}`} className="boardRow">
                  {rowTiles.map((tile, tileIndex) => {
                    const tileKey = `board-${selectedPaletteId}-${tile.resourceKey}-${rowIndex}-${tileIndex}`;
                    const colors = palette.resources[tile.resourceKey] || DESERT_COLORS;
                    return (
                      <div key={tileKey} className="boardTile">
                        <TileFrame
                          colors={colors}
                          svgKey={tileKey}
                          tileFilter={palette.tileFilter}
                          number={tile.number}
                          showNumberTokens={showNumberTokens}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <style jsx>{`
        .boardScroll {
          width: 100%;
          overflow-x: auto;
          padding-bottom: 2px;
        }

        .boardRoot {
          width: fit-content;
          margin-inline: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
        }

        .boardRow {
          display: flex;
          gap: 4px;
          justify-content: center;
        }

        .boardTile {
          width: 112px;
          height: 129px;
          flex: 0 0 auto;
        }

        @media (max-width: 980px) {
          .boardTile {
            width: 94px;
            height: 109px;
          }
        }

        @media (max-width: 720px) {
          .boardTile {
            width: 78px;
            height: 90px;
          }
        }
      `}</style>
    </main>
  );
}
