"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  CpuChipIcon,
  LinkIcon,
  UserGroupIcon
} from "@heroicons/react/24/outline";
import { Button } from "../../../ui/Button";
import {
  DEFAULT_THEME_ID,
  getResourceIconPath,
  getThemedSvgPath
} from "../../theme/themes";
import { getPieceSvgFile } from "../../theme/pieceAssets";
import { createEffectBus } from "../../effects/EffectBus";
import { HomeDemoBoard } from "../../homeDemo/HomeDemoBoard";
import { HomeDemoEffectBridge } from "../../homeDemo/HomeDemoEffectBridge";
import { createHomeDemoPieceState } from "../../homeDemo/homeDemoSequence";

const HOME_TABLE_BACKGROUND =
  "radial-gradient(circle at 22% 14%, rgba(255,255,255,0.245), transparent 19rem), linear-gradient(135deg, #86d0fb 0%, #55b6ef 36%, #2f75cc 100%)";

const PROTOTYPE_VARIANTS = [
  { id: "ready", label: "Ready Table" },
  { id: "islands", label: "Three Islands" },
  { id: "hybrid", label: "Hybrid" }
];

const FEED_ITEMS = [
  ["1v1", "New table opened", "now"],
  ["P", "Puffer is ready", "now"],
  ["G", "Green tapped ore", "now"]
];

const RESOURCE_TILE_BACKGROUNDS = Object.freeze({
  Wood: "linear-gradient(145deg, #30b75c, #0c8e45)",
  Brick: "linear-gradient(145deg, #ffa23b, #ef5d1b)",
  Sheep: "linear-gradient(145deg, #c9ff64, #7ed10c)",
  Wheat: "linear-gradient(145deg, #fff178, #f4b52c)",
  Ore: "linear-gradient(145deg, #d8e1ea, #8d9aa6)",
  Desert: "linear-gradient(145deg, #e5d494, #bdae75)"
});

const MODE_ISLANDS = [
  {
    id: "online",
    title: "Play Online",
    subtitle: "Join a 1v1 table",
    badge: "1v1",
    icon: UserGroupIcon,
    variant: "primary",
    tiles: [
      { resource: "Sheep", number: 6, left: 36, top: 28 },
      { resource: "Wheat", number: 9, left: 56, top: 28 },
      { resource: "Brick", number: 8, left: 26, top: 50 },
      { resource: "Wood", number: 5, left: 46, top: 50 },
      { resource: "Ore", number: 10, left: 66, top: 50 },
      { resource: "Sheep", number: 4, left: 36, top: 72 },
      { resource: "Wood", number: 3, left: 56, top: 72 }
    ],
    pieces: [
      { type: "settlement", color: "red", left: 37, top: 47, size: 32 },
      { type: "road", color: "red", left: 43, top: 44, size: 52, rotation: 28 },
      { type: "settlement", color: "royal", left: 63, top: 57, size: 32 },
      { type: "road", color: "royal", left: 58, top: 60, size: 52, rotation: -22 }
    ]
  },
  {
    id: "bot",
    title: "Play vs Bot",
    subtitle: "Puffer is ready",
    badge: "AI",
    icon: CpuChipIcon,
    variant: "bot",
    tiles: [
      { resource: "Wheat", number: 10, left: 36, top: 30 },
      { resource: "Ore", number: 4, left: 56, top: 30 },
      { resource: "Wood", number: 11, left: 26, top: 52 },
      { resource: "Desert", number: null, left: 46, top: 52 },
      { resource: "Brick", number: 6, left: 66, top: 52 },
      { resource: "Sheep", number: 5, left: 36, top: 74 },
      { resource: "Wheat", number: 9, left: 56, top: 74 }
    ],
    pieces: [
      { type: "settlement", color: "orange", left: 66, top: 48, size: 33 },
      { type: "road", color: "orange", left: 61, top: 55, size: 52, rotation: -28 },
      { type: "robber", left: 47, top: 55, size: 32 }
    ]
  },
  {
    id: "friend",
    title: "Play a Friend",
    subtitle: "Share a private link",
    badge: "+",
    icon: LinkIcon,
    variant: "friend",
    tiles: [
      { resource: "Wood", number: 5, left: 36, top: 28 },
      { resource: "Sheep", number: 2, left: 56, top: 28 },
      { resource: "Ore", number: 11, left: 26, top: 50 },
      { resource: "Wheat", number: 8, left: 46, top: 50 },
      { resource: "Brick", number: 3, left: 66, top: 50 },
      { resource: "Wood", number: 9, left: 36, top: 72 },
      { resource: "Sheep", number: 6, left: 56, top: 72 }
    ],
    pieces: [
      { type: "settlement", color: "green", left: 34, top: 66, size: 33 },
      { type: "road", color: "green", left: 42, top: 65, size: 52, rotation: 18 },
      { type: "settlement", color: "magenta", left: 58, top: 38, size: 33 },
      { type: "road", color: "magenta", left: 53, top: 43, size: 52, rotation: -42 }
    ]
  }
];

function useViewportWidth() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return width;
}

function usePrototypeVariant() {
  const [variantId, setVariantId] = useState("ready");

  useEffect(() => {
    const readVariant = () => {
      const params = new URLSearchParams(window.location.search);
      const requested = params.get("variant");
      const nextVariant = PROTOTYPE_VARIANTS.some(({ id }) => id === requested)
        ? requested
        : "ready";
      setVariantId(nextVariant);
    };

    readVariant();
    window.addEventListener("popstate", readVariant);
    return () => window.removeEventListener("popstate", readVariant);
  }, []);

  const selectVariant = (nextVariantId) => {
    setVariantId(nextVariantId);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", nextVariantId);
    window.history.replaceState(null, "", url);
  };

  return [variantId, selectVariant];
}

function PrototypeSwitcher({ activeVariantId, onSelectVariant }) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-4 z-50 hidden -translate-x-1/2 rounded-full border border-white/[0.45] bg-white/[0.38] p-1 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl md:flex">
      {PROTOTYPE_VARIANTS.map((variant) => {
        const isActive = activeVariantId === variant.id;
        return (
          <button
            key={variant.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelectVariant(variant.id)}
            className={`min-h-8 rounded-full px-3.5 text-xs font-black transition ${
              isActive
                ? "bg-white/[0.82] text-slate-900 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.55)]"
                : "text-slate-700 hover:bg-white/[0.3]"
            }`}
          >
            {variant.label}
          </button>
        );
      })}
    </div>
  );
}

function HomeTableBrand({ compact = false }) {
  return (
    <header className="absolute left-4 top-4 z-30 flex items-center gap-3 sm:left-7 sm:top-7">
      <div className={`${compact ? "h-12 w-12 rounded-[1rem]" : "h-14 w-14 rounded-[1.2rem]"} grid place-items-center border border-white/[0.55] bg-[linear-gradient(135deg,rgba(132,204,22,0.96),rgba(46,134,222,0.88))] text-xl font-black text-white shadow-[0_18px_42px_-26px_rgba(22,78,145,0.6)]`}>
        S
      </div>
      <div className="grid gap-1">
        <h1 className={`${compact ? "text-[2.25rem]" : "text-[2.7rem] sm:text-5xl"} font-black leading-[0.82] text-slate-900 drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]`}>
          Settlehex
        </h1>
        <p className="text-[0.64rem] font-black uppercase tracking-[0.16em] text-slate-700">
          1v1 online / bot ready
        </p>
      </div>
    </header>
  );
}

function HomeTableStatusPill({ children }) {
  return (
    <div className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/[0.48] bg-white/[0.6] px-3 text-[0.72rem] font-black text-slate-800 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.5)] backdrop-blur-xl">
      <span className="h-2 w-2 rounded-full bg-lime-500 shadow-[0_0_0_5px_rgba(132,204,22,0.18)]" />
      {children}
    </div>
  );
}

function StatusPills() {
  return (
    <div className="absolute right-4 top-4 z-30 hidden max-w-[calc(100vw-2rem)] flex-wrap justify-end gap-2 sm:right-6 sm:top-6 sm:flex">
      <HomeTableStatusPill>Watching table</HomeTableStatusPill>
      <HomeTableStatusPill>Puffer online</HomeTableStatusPill>
      <HomeTableStatusPill>Beta</HomeTableStatusPill>
    </div>
  );
}

function TableFeed() {
  return (
    <aside className="absolute bottom-[6.5rem] left-5 z-30 hidden w-[19.5rem] rounded-[1.35rem] border border-white/[0.45] bg-white/[0.54] p-3.5 shadow-[0_18px_44px_-30px_rgba(22,78,145,0.42)] backdrop-blur-xl lg:block">
      <div className="mb-2 flex items-center justify-between gap-3 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-700">
        <span>Table feed</span>
        <span className="text-slate-600">Live</span>
      </div>
      <div className="grid gap-2">
        {FEED_ITEMS.map(([badge, label, time]) => (
          <div
            key={label}
            className="flex min-h-8 items-center gap-2 rounded-xl bg-white/[0.28] px-2 text-[0.78rem] font-black text-slate-800"
          >
            <span className="grid h-6 min-w-6 place-items-center rounded-lg bg-blue-500 px-1 text-[0.62rem] text-white">
              {badge}
            </span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="text-[0.64rem] text-slate-500">{time}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function BotReadinessCard() {
  return (
    <aside className="absolute bottom-[6.5rem] right-5 z-30 hidden w-[18.2rem] grid-cols-[3.1rem_1fr] items-center gap-3 rounded-[1.25rem] border border-white/[0.45] bg-white/[0.58] p-2.5 shadow-[0_18px_44px_-30px_rgba(22,78,145,0.42)] backdrop-blur-xl lg:grid">
      <div className="grid h-12 w-12 place-items-center rounded-[0.9rem] border border-white/[0.38] bg-[linear-gradient(135deg,rgba(132,204,22,0.9),rgba(245,158,11,0.8))] text-base font-black text-white">
        AI
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-sm font-black text-slate-900">Puffer is ready</h2>
        <p className="mt-0.5 truncate text-[0.68rem] font-bold text-slate-600">
          Start now if the online table is quiet.
        </p>
      </div>
    </aside>
  );
}

function HomeActionButton({ variant, icon: Icon, label, badge, onClick }) {
  const styles = {
    primary:
      "border-transparent bg-[linear-gradient(135deg,rgba(132,216,6,1),rgba(98,183,0,1))] text-white shadow-[0_18px_42px_rgba(22,78,145,0.18)]",
    bot:
      "border-transparent bg-[linear-gradient(135deg,rgba(255,233,130,1),rgba(248,199,73,1))] text-[#422e08] shadow-[0_18px_42px_rgba(22,78,145,0.18)]",
    friend:
      "border-white/[0.5] bg-white/[0.78] text-slate-900 shadow-[0_18px_42px_rgba(22,78,145,0.18)] backdrop-blur-xl"
  };

  const badgeStyles =
    variant === "friend"
      ? "bg-white/[0.5] text-slate-900"
      : variant === "bot"
        ? "bg-white/[0.38] text-slate-900"
        : "bg-white/[0.24] text-white";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-16 items-center justify-between gap-4 rounded-[1.15rem] border px-5 text-left text-lg font-black transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.85] active:translate-y-0 motion-reduce:transition-none sm:min-h-[4.45rem] sm:px-5 ${styles[variant]}`}
    >
      <span className="inline-flex min-w-0 items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 opacity-90 sm:h-6 sm:w-6" />
        <span className="truncate">{label}</span>
      </span>
      <span className={`grid h-11 min-w-11 shrink-0 place-items-center rounded-[0.95rem] px-2 text-sm font-black ${badgeStyles}`}>
        {badge}
      </span>
    </button>
  );
}

function ActionDock({ onSelectMode, className = "" }) {
  return (
    <section className={`pointer-events-auto absolute inset-x-4 bottom-4 z-30 mx-auto grid max-w-[56rem] grid-cols-1 gap-2 sm:bottom-6 sm:grid-cols-[1.22fr_1fr_1fr] sm:gap-3 ${className}`}>
      <HomeActionButton
        variant="primary"
        icon={UserGroupIcon}
        label="Play Online"
        badge="1v1"
        onClick={() => onSelectMode("queue")}
      />
      <HomeActionButton
        variant="bot"
        icon={CpuChipIcon}
        label="Play vs Bot"
        badge="AI"
        onClick={() => onSelectMode("bot")}
      />
      <HomeActionButton
        variant="friend"
        icon={LinkIcon}
        label="Play a Friend"
        badge="+"
        onClick={() => onSelectMode("friend")}
      />
    </section>
  );
}

function FullBoardLayer({
  pieceState,
  reservedHeight,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  className = ""
}) {
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 ${className}`}>
      <HomeDemoBoard
        pieceState={pieceState}
        reservedHeight={reservedHeight}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
      />
    </div>
  );
}

function MiniHex({ resource, number, left, top, compact = false }) {
  const iconSrc = getResourceIconPath(DEFAULT_THEME_ID, resource);
  const isHot = number === 6 || number === 8;

  return (
    <div
      className={`${compact ? "h-[3.25rem] w-[3.75rem]" : "h-16 w-[4.65rem]"} absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden text-slate-900 shadow-[0_10px_22px_-15px_rgba(15,23,42,0.55)]`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        clipPath: "polygon(25% 4%, 75% 4%, 100% 50%, 75% 96%, 25% 96%, 0 50%)",
        background: RESOURCE_TILE_BACKGROUNDS[resource] ?? RESOURCE_TILE_BACKGROUNDS.Desert
      }}
    >
      <div className="absolute inset-[0.18rem] rounded-[0.3rem] border border-white/[0.35]" style={{ clipPath: "inherit" }} />
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          className={`${compact ? "h-5 w-5" : "h-6 w-6"} absolute left-1/2 top-[19%] -translate-x-1/2 object-contain`}
          draggable={false}
        />
      ) : null}
      {number != null ? (
        <div className={`${compact ? "h-7 min-w-7 text-base" : "h-8 min-w-8 text-xl"} absolute left-1/2 top-[57%] grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg bg-white/[0.94] px-1 font-black leading-none shadow-[0_8px_18px_-14px_rgba(15,23,42,0.65)] ${isHot ? "text-red-600" : "text-slate-950"}`}>
          {number}
        </div>
      ) : null}
    </div>
  );
}

function MiniPiece({ type, color, left, top, rotation = 0, size = 34 }) {
  const src =
    type === "robber"
      ? getThemedSvgPath(DEFAULT_THEME_ID, "icon_robber.svg")
      : getThemedSvgPath(DEFAULT_THEME_ID, getPieceSvgFile(type, color));
  const width = type === "road" ? size : size;
  const height = type === "road" ? Math.max(14, size * 0.34) : size;

  return (
    <img
      src={src}
      alt=""
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_9px_10px_rgba(15,23,42,0.28)]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width,
        height,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`
      }}
      draggable={false}
    />
  );
}

function MiniIsland({ mode, compact = false }) {
  return (
    <div className={`${compact ? "h-44" : "h-56"} relative mx-auto w-full max-w-[22rem]`}>
      <div className="absolute left-1/2 top-1/2 h-[84%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[44%_38%_42%_35%/38%_44%_34%_41%] border border-white/[0.54] bg-white/[0.18] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),0_22px_54px_-34px_rgba(15,23,42,0.6)]" />
      {mode.tiles.map((tile, index) => (
        <MiniHex
          key={`${mode.id}-tile-${index}`}
          compact={compact}
          {...tile}
        />
      ))}
      {mode.pieces.map((piece, index) => (
        <MiniPiece key={`${mode.id}-piece-${index}`} {...piece} />
      ))}
    </div>
  );
}

function ModeIslandCard({ mode, compact = false, onSelect }) {
  const Icon = mode.icon;
  const variantStyles = {
    primary: "border-lime-200/[0.6] bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(198,246,213,0.34))]",
    bot: "border-amber-200/[0.7] bg-[linear-gradient(180deg,rgba(255,255,255,0.68),rgba(254,240,138,0.34))]",
    friend: "border-white/[0.58] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(219,234,254,0.42))]"
  };
  const buttonStyles = {
    primary: "bg-[linear-gradient(135deg,rgba(132,216,6,1),rgba(98,183,0,1))] text-white",
    bot: "bg-[linear-gradient(135deg,rgba(255,233,130,1),rgba(248,199,73,1))] text-[#422e08]",
    friend: "bg-white/[0.84] text-slate-900"
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(mode.id === "online" ? "queue" : mode.id)}
      className={`group pointer-events-auto grid overflow-hidden rounded-[1.45rem] border p-3 text-left shadow-[0_26px_62px_-38px_rgba(15,23,42,0.58)] backdrop-blur-xl transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/[0.85] active:translate-y-0 motion-reduce:transition-none ${variantStyles[mode.variant]}`}
    >
      <MiniIsland mode={mode} compact={compact} />
      <div className={`${compact ? "mt-1" : "mt-2"} flex items-center justify-between gap-3 rounded-[1.05rem] border border-white/[0.5] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] ${buttonStyles[mode.variant]}`}>
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0" />
          <span>
            <span className="block truncate text-lg font-black leading-none">{mode.title}</span>
            {!compact ? (
              <span className="mt-1 block truncate text-xs font-bold opacity-75">{mode.subtitle}</span>
            ) : null}
          </span>
        </span>
        <span className="grid h-10 min-w-10 shrink-0 place-items-center rounded-[0.85rem] bg-white/[0.28] px-2 text-sm font-black">
          {mode.badge}
        </span>
      </div>
    </button>
  );
}

function ReadyTableVariant({
  pieceState,
  isCompact,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  onSelectMode
}) {
  return (
    <>
      <FullBoardLayer
        pieceState={pieceState}
        reservedHeight={isCompact ? 276 : 158}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
      />
      <HomeTableBrand />
      <StatusPills />
      <TableFeed />
      <BotReadinessCard />
      <ActionDock onSelectMode={onSelectMode} />
    </>
  );
}

function ThreeIslandsVariant({ isCompact, onSelectMode }) {
  return (
    <>
      <HomeTableBrand compact />
      <StatusPills />
      <div className={`${isCompact ? "overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "grid place-items-center sm:top-32"} absolute inset-x-4 bottom-6 top-28 z-20`}>
        <section className={`${isCompact ? "mx-auto max-w-[28rem]" : "max-w-6xl md:grid-cols-3 md:gap-4"} grid w-full grid-cols-1 gap-3`}>
          {MODE_ISLANDS.map((mode) => (
            <ModeIslandCard
              key={mode.id}
              mode={mode}
              compact={isCompact}
              onSelect={onSelectMode}
            />
          ))}
        </section>
      </div>
    </>
  );
}

function HybridVariant({
  pieceState,
  isCompact,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  onSelectMode
}) {
  if (isCompact) {
    return (
      <>
        <FullBoardLayer
          pieceState={pieceState}
          reservedHeight={276}
          boardRef={boardRef}
          placementLayerRef={placementLayerRef}
          placementRoadLayerRef={placementRoadLayerRef}
          className="opacity-[0.95]"
        />
        <HomeTableBrand />
        <ActionDock onSelectMode={onSelectMode} />
      </>
    );
  }

  return (
    <>
      <FullBoardLayer
        pieceState={pieceState}
        reservedHeight={isCompact ? 350 : 212}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
        className="opacity-[0.9]"
      />
      <HomeTableBrand compact />
      <StatusPills />
      <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-30 mx-auto grid max-w-5xl grid-cols-1 gap-2 sm:bottom-6 md:grid-cols-3 md:gap-3">
        {MODE_ISLANDS.map((mode) => (
          <ModeIslandCard
            key={mode.id}
            mode={mode}
            compact
            onSelect={onSelectMode}
          />
        ))}
      </div>
    </>
  );
}

function PrototypeModal({ matchmakingState, onClose }) {
  if (!matchmakingState) return null;

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center bg-sky-700/[0.18] p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[1.45rem] border border-white/[0.42] bg-white/[0.76] p-5 text-center shadow-[0_28px_80px_-35px_rgba(15,23,42,0.65)] backdrop-blur-xl">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[1.15rem] bg-lime-500 text-base font-black text-white shadow-[0_18px_38px_-28px_rgba(63,98,18,0.9)]">
          {matchmakingState === "bot" ? "AI" : "Sx"}
        </div>
        <h2 className="text-2xl font-black text-slate-900">
          {matchmakingState === "queue"
            ? "Finding a table"
            : matchmakingState === "bot"
              ? "Starting bot game"
              : "Creating invite"}
        </h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          Prototype state only. This is the homepage table flow without real routing.
        </p>
        <Button
          variant="secondary"
          size="md"
          className="mt-4 w-full"
          onClick={onClose}
        >
          Back to table
        </Button>
      </div>
    </div>
  );
}

function HomeTableBoard() {
  const viewportWidth = useViewportWidth();
  const isCompact = viewportWidth > 0 && viewportWidth < 760;
  const [variantId, setVariantId] = usePrototypeVariant();
  const [pieceState, setPieceState] = useState(() => createHomeDemoPieceState());
  const [matchmakingState, setMatchmakingState] = useState(null);
  const boardRef = useRef(null);
  const placementLayerRef = useRef(null);
  const placementRoadLayerRef = useRef(null);
  const effectsBus = useMemo(() => createEffectBus(), []);
  const activeBoardReservedHeight =
    variantId === "hybrid"
      ? isCompact
        ? 276
        : 212
      : isCompact
        ? 276
        : 158;

  return (
    <main
      className="fixed inset-0 overflow-hidden text-slate-900"
      style={{ background: HOME_TABLE_BACKGROUND }}
    >
      <PrototypeSwitcher
        activeVariantId={variantId}
        onSelectVariant={setVariantId}
      />

      {variantId === "islands" ? (
        <ThreeIslandsVariant
          isCompact={isCompact}
          onSelectMode={setMatchmakingState}
        />
      ) : variantId === "hybrid" ? (
        <HybridVariant
          pieceState={pieceState}
          isCompact={isCompact}
          boardRef={boardRef}
          placementLayerRef={placementLayerRef}
          placementRoadLayerRef={placementRoadLayerRef}
          onSelectMode={setMatchmakingState}
        />
      ) : (
        <ReadyTableVariant
          pieceState={pieceState}
          isCompact={isCompact}
          boardRef={boardRef}
          placementLayerRef={placementLayerRef}
          placementRoadLayerRef={placementRoadLayerRef}
          onSelectMode={setMatchmakingState}
        />
      )}

      <HomeDemoEffectBridge
        effectsBus={effectsBus}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
        reservedHeight={activeBoardReservedHeight}
        onPieceStateChange={setPieceState}
      />

      <PrototypeModal
        matchmakingState={matchmakingState}
        onClose={() => setMatchmakingState(null)}
      />
    </main>
  );
}

export function HomeTablePrototypeClient() {
  return <HomeTableBoard />;
}
