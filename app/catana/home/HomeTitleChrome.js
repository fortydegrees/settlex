"use client";

import {
  CpuChipIcon,
  LinkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Fredoka } from "next/font/google";
import React, { useEffect, useState } from "react";
import { BETA_PRIMARY_DESCRIPTOR } from "../../metadata.js";
import { MetaDisclosure } from "../../ui/MetaDisclosure";
import { publicReleaseInfo } from "../lobby/releaseInfo";
import { SystemTopChrome } from "./SystemTopChrome";

const brandWordmarkFont = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
const BRAND_WORDMARK_FONT_FAMILY = brandWordmarkFont.style.fontFamily;

const SYSTEM_STATUS_ITEMS = [
  {
    label: "Beta",
    tone: "beta",
  },
];

const HOME_RELEASE_PANEL_HIGHLIGHT_COUNT = 3;
const BRAND_LOGO_VARIANTS = new Set([
  "sx",
  "sx-balanced-x",
  "sx-small-x",
  "sx-raised-x",
  "s",
  "cluster",
]);
const BRAND_LOGO_TILE_PATH =
  "M162.6 21 Q173 15 183.4 21 L322.8 101.5 Q333.2 107.5 333.2 119.5 L333.2 280.5 Q333.2 292.5 322.8 298.5 L183.4 379 Q173 385 162.6 379 L23.2 298.5 Q12.8 292.5 12.8 280.5 L12.8 119.5 Q12.8 107.5 23.2 101.5 Z";
const DEFAULT_BRAND_LOGO_TONE = "brand";
const BRAND_LOGO_TONES = Object.freeze({
  brand: {
    fillStops: [
      ["0", "#bef264"],
      ["0.52", "#84cc16"],
      ["1", "#16a34a"],
    ],
    strokeStops: [
      ["0", "#ecfccb"],
      ["0.52", "#a3e635"],
      ["1", "#166534"],
    ],
    highlightStroke: "#f7fee7",
    highlightOpacity: "0.34",
    vignetteOpacity: "0.19",
  },
  lime: {
    fillStops: [
      ["0", "#d9f99d"],
      ["0.53", "#a3e635"],
      ["1", "#65a30d"],
    ],
    strokeStops: [
      ["0", "#f7fee7"],
      ["0.5", "#d9f99d"],
      ["1", "#4d7c0f"],
    ],
    highlightStroke: "#f7fee7",
    highlightOpacity: "0.32",
    vignetteOpacity: "0.18",
  },
  emerald: {
    fillStops: [
      ["0", "#7ed957"],
      ["0.55", "#2fb65f"],
      ["1", "#168f4a"],
    ],
    strokeStops: [
      ["0", "#dcfce7"],
      ["0.55", "#86efac"],
      ["1", "#166534"],
    ],
    highlightStroke: "#dcfce7",
    highlightOpacity: "0.34",
    vignetteOpacity: "0.2",
  },
  gold: {
    fillStops: [
      ["0", "#fef08a"],
      ["0.5", "#fcd34d"],
      ["1", "#f59e0b"],
    ],
    strokeStops: [
      ["0", "#fffbeb"],
      ["0.5", "#fde68a"],
      ["1", "#d97706"],
    ],
    highlightStroke: "#fef3c7",
    highlightOpacity: "0.36",
    vignetteOpacity: "0.16",
  },
});
const SPLIT_SX_LOGO_GLYPHS = Object.freeze({
  "sx-balanced-x": {
    s: { x: 126, y: 222, fontSize: 190 },
    x: { x: 236, y: 226, fontSize: 152 },
  },
  "sx-small-x": {
    s: { x: 128, y: 222, fontSize: 196 },
    x: { x: 238, y: 232, fontSize: 132 },
  },
  "sx-raised-x": {
    s: { x: 127, y: 222, fontSize: 192 },
    x: { x: 236, y: 213, fontSize: 140 },
  },
});
const BRAND_LOGO_TONE_IDS = new Set(Object.keys(BRAND_LOGO_TONES));

export function useHomeBrandLogoOptions() {
  const [options, setOptions] = useState({
    variant: "sx",
    tone: DEFAULT_BRAND_LOGO_TONE,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedVariant = params.get("logo");
    const requestedTone = params.get("logoTone");

    setOptions({
      variant: BRAND_LOGO_VARIANTS.has(requestedVariant)
        ? requestedVariant
        : "sx",
      tone: BRAND_LOGO_TONE_IDS.has(requestedTone)
        ? requestedTone
        : DEFAULT_BRAND_LOGO_TONE,
    });
  }, []);

  return options;
}

export const buildSystemActions = ({ settleGraphV2Enabled = false } = {}) => [
  {
    id: "queue",
    label: "Play Online",
    subtitle: "1v1 matchmaking",
    badge: "1v1",
    icon: UserGroupIcon,
    variant: "primary",
    sheen: true,
    buttonClassName:
      "border-lime-200/70 bg-[linear-gradient(180deg,rgba(132,204,22,0.98),rgba(101,163,13,0.94))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_26px_rgba(77,124,15,0.16)]",
    iconClassName: "border-white/28 bg-white/16 text-white",
    badgeClassName: "bg-white/24 text-white",
  },
  {
    id: "bot",
    label: "Play vs Bot",
    subtitle: "Puffer is ready",
    badge: "AI",
    icon: CpuChipIcon,
    variant: "accent",
    buttonClassName:
      "border-amber-200/75 bg-[linear-gradient(180deg,rgba(251,191,36,0.98),rgba(245,158,11,0.94))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_26px_rgba(180,83,9,0.12)]",
    iconClassName: "border-white/36 bg-white/30 text-slate-900",
    badgeClassName: "bg-white/34 text-slate-900",
  },
  ...(settleGraphV2Enabled
    ? [{
        id: "bot-v2",
        label: "Play V2 Bot",
        subtitle: "Sealed SettleGraph",
        badge: "V2",
        icon: CpuChipIcon,
        variant: "accent",
        buttonClassName:
          "border-lime-200/75 bg-[linear-gradient(180deg,rgba(163,230,53,0.98),rgba(101,163,13,0.94))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_12px_26px_rgba(77,124,15,0.13)]",
        iconClassName: "border-white/36 bg-white/30 text-slate-900",
        badgeClassName: "bg-white/34 text-slate-900",
      }]
    : []),
  {
    id: "friend",
    label: "Play a Friend",
    subtitle: "Private invite",
    badge: "+",
    icon: LinkIcon,
    variant: "secondary",
    buttonClassName:
      "border-white/45 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(219,234,254,0.52))] text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.48),0_12px_24px_rgba(37,99,235,0.08)]",
    iconClassName: "border-white/46 bg-white/42 text-slate-800",
    badgeClassName: "bg-white/54 text-slate-900",
  },
];

export const SYSTEM_ACTIONS = buildSystemActions({
  settleGraphV2Enabled:
    process.env.NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2 === "1",
});

function HexClusterGlyph({ filterId }) {
  const hexPoints =
    "0,-37 32,-18.5 32,18.5 0,37 -32,18.5 -32,-18.5";
  const cells = [
    { x: 0, y: -43, fill: "#bef264" },
    { x: -39, y: -21, fill: "#84cc16" },
    { x: 39, y: -21, fill: "#fcd34d" },
    { x: 0, y: 0, fill: "#16a34a" },
    { x: 0, y: 43, fill: "#fbbf24" },
  ];

  return (
    <g filter={`url(#${filterId})`} transform="translate(173 207)">
      {cells.map((cell) => (
        <polygon
          key={`${cell.x}-${cell.y}`}
          points={hexPoints}
          transform={`translate(${cell.x} ${cell.y})`}
          fill={cell.fill}
          stroke="#ffffff"
          strokeWidth="7"
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
}

function LogoGlyph({ variant, filterId }) {
  if (variant === "cluster") {
    return <HexClusterGlyph filterId={filterId} />;
  }

  const splitGlyph = SPLIT_SX_LOGO_GLYPHS[variant];
  if (splitGlyph) {
    return (
      <g
        fill="#ffffff"
        filter={`url(#${filterId})`}
        fontFamily={BRAND_WORDMARK_FONT_FAMILY}
        fontWeight="600"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        <text
          x={splitGlyph.s.x}
          y={splitGlyph.s.y}
          fontSize={splitGlyph.s.fontSize}
        >
          S
        </text>
        <text
          x={splitGlyph.x.x}
          y={splitGlyph.x.y}
          fontSize={splitGlyph.x.fontSize}
        >
          x
        </text>
      </g>
    );
  }

  const isSingleLetter = variant === "s";

  return (
    <text
      x="173"
      y={isSingleLetter ? "224" : "222"}
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#ffffff"
      filter={`url(#${filterId})`}
      fontFamily={BRAND_WORDMARK_FONT_FAMILY}
      fontSize={isSingleLetter ? "216" : "180"}
      fontWeight="600"
    >
      {isSingleLetter ? "S" : "Sx"}
    </text>
  );
}

function SettlehexLogoMark({
  compact = false,
  variant = "sx",
  tone = DEFAULT_BRAND_LOGO_TONE,
}) {
  const rawId = React.useId().replace(/:/g, "");
  const fillId = `settlehex-logo-fill-${rawId}`;
  const innerStrokeId = `settlehex-logo-inner-stroke-${rawId}`;
  const vignetteId = `settlehex-logo-vignette-${rawId}`;
  const glyphShadowId = `settlehex-logo-glyph-shadow-${rawId}`;
  const logoTone =
    BRAND_LOGO_TONES[tone] ?? BRAND_LOGO_TONES[DEFAULT_BRAND_LOGO_TONE];

  return (
    <svg
      aria-hidden="true"
      className={`shrink-0 drop-shadow-[0_18px_28px_rgba(22,78,145,0.22)] ${
        compact
          ? "h-12 w-[2.65rem]"
          : "h-[3.85rem] w-[3.33rem] sm:h-[4.4rem] sm:w-[3.8rem]"
      }`}
      focusable="false"
      viewBox="0 0 346 400"
    >
      <defs>
        <linearGradient
          id={fillId}
          gradientUnits="userSpaceOnUse"
          x1="60"
          y1="38"
          x2="286"
          y2="362"
        >
          {logoTone.fillStops.map(([offset, stopColor]) => (
            <stop key={offset} offset={offset} stopColor={stopColor} />
          ))}
        </linearGradient>

        <linearGradient
          id={innerStrokeId}
          gradientUnits="userSpaceOnUse"
          x1="48"
          y1="30"
          x2="298"
          y2="370"
        >
          {logoTone.strokeStops.map(([offset, stopColor]) => (
            <stop key={offset} offset={offset} stopColor={stopColor} />
          ))}
        </linearGradient>

        <radialGradient
          id={vignetteId}
          gradientUnits="userSpaceOnUse"
          cx="173"
          cy="226"
          r="196"
        >
          <stop offset="0" stopColor="#0f172a" stopOpacity="0" />
          <stop
            offset="1"
            stopColor="#0f172a"
            stopOpacity={logoTone.vignetteOpacity}
          />
        </radialGradient>

        <filter
          id={glyphShadowId}
          x="-24%"
          y="-24%"
          width="148%"
          height="148%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="7"
            floodColor="#0f172a"
            floodOpacity="0.22"
          />
          <feDropShadow
            dx="0"
            dy="1.5"
            stdDeviation="0"
            floodColor="#0f172a"
            floodOpacity="0.18"
          />
        </filter>
      </defs>

      <path d={BRAND_LOGO_TILE_PATH} fill={`url(#${fillId})`} />
      <path
        d={BRAND_LOGO_TILE_PATH}
        fill="none"
        stroke={`url(#${innerStrokeId})`}
        strokeWidth="8"
      />
      <path
        d={BRAND_LOGO_TILE_PATH}
        fill="none"
        stroke={logoTone.highlightStroke}
        strokeOpacity={logoTone.highlightOpacity}
        strokeWidth="1.5"
      />
      <path d={BRAND_LOGO_TILE_PATH} fill={`url(#${vignetteId})`} />

      <LogoGlyph variant={variant} filterId={glyphShadowId} />
    </svg>
  );
}

function HomeTableBrand({
  compact = false,
  logoVariant = "sx",
  logoTone = DEFAULT_BRAND_LOGO_TONE,
}) {
  return (
    <header className="absolute left-4 top-4 z-30 flex items-start gap-2.5 sm:left-7 sm:top-7 sm:gap-3.5">
      <SettlehexLogoMark
        compact={compact}
        variant={logoVariant}
        tone={logoTone}
      />
      <div className="grid gap-1.5">
        <h1
          className={`${brandWordmarkFont.className} ${
            compact ? "text-[2.22rem]" : "text-[2.3rem] sm:text-[3.18rem]"
          } font-semibold leading-[0.9] text-[#143f60] drop-shadow-[0_1px_0_rgba(255,255,255,0.22)]`}
        >
          Settlehex
        </h1>
        <p className="hidden text-xs font-medium leading-5 text-slate-700 sm:block">
          {BETA_PRIMARY_DESCRIPTOR}
        </p>
        <div
          className="hidden items-center gap-2 sm:flex"
          aria-label="Table status"
        >
          {SYSTEM_STATUS_ITEMS.map((item) => (
            <span
              key={item.label}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  item.tone === "online"
                    ? "bg-lime-500 shadow-[0_0_0_3px_rgba(132,204,22,0.18)]"
                    : "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.16)]"
                }`}
                aria-hidden="true"
              />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}

function HomeMetaChrome({
  releaseInfo = publicReleaseInfo,
  open,
  onOpenChange,
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const releaseOpen = open ?? uncontrolledOpen;
  const handleOpenChange = onOpenChange ?? setUncontrolledOpen;
  const releaseHighlights = releaseInfo.highlights.slice(
    0,
    HOME_RELEASE_PANEL_HIGHLIGHT_COUNT
  );

  return (
    <aside className="pointer-events-auto absolute bottom-6 left-6 z-30 hidden lg:block">
      <MetaDisclosure
        open={releaseOpen}
        onOpenChange={handleOpenChange}
        label={releaseInfo.releaseLabel}
        ariaLabel={`Show release notes for ${releaseInfo.releaseLabel}`}
        align="start"
        sideOffset={10}
        triggerClassName="settlex-ui-focus min-h-[2.75rem] px-0 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
        panelClassName="w-[min(22rem,calc(100vw-1.5rem))] p-4"
      >
        <div className="text-xs font-medium text-slate-600">
          Latest update
        </div>
        <h2 className="mt-1 text-base font-bold text-slate-900">
          {releaseInfo.releaseLabel} · {releaseInfo.title}
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
          {releaseHighlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-500 shadow-[0_0_0_3px_rgba(132,204,22,0.16)]"
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-slate-200/80 pt-3 text-xs text-slate-600">
          Build {releaseInfo.buildShaShort}
        </div>
      </MetaDisclosure>
    </aside>
  );
}

function SystemActionButton({ action, disabled, isActive, onSelectMode }) {
  const Icon = action.icon;
  const activeLabel =
    action.id.startsWith("bot")
      ? "Starting..."
      : action.id === "friend"
      ? "Creating..."
      : "Finding...";
  const label = isActive ? activeLabel : action.label;

  return (
    <button
      type="button"
      className={`settlex-ui-button settlex-ui-focus settlex-ui-button-${action.variant} min-h-[4rem] w-full px-4 text-left sm:min-h-[4.5rem]`}
      disabled={disabled}
      onClick={() => onSelectMode(action.id)}
    >
      {action.sheen ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 animate-[settlex-ui-cta-shimmer_3.6s_linear_infinite] rounded-[inherit] bg-[linear-gradient(120deg,transparent_20%,rgba(255,255,255,0.22)_45%,transparent_70%)] opacity-0 motion-reduce:animate-none"
        />
      ) : null}
      <span className="flex w-full items-center justify-between gap-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center"
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold leading-5">
            {label}
          </span>
          <span className="mt-1 block truncate text-xs font-medium opacity-80">
            {action.subtitle}
          </span>
        </span>
        <span
          className="grid min-w-[1.5rem] shrink-0 place-items-center text-xs font-semibold"
        >
          {isActive ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          ) : (
            action.badge
          )}
        </span>
      </span>
    </button>
  );
}

export function HomeGameModeDock({
  isBusy,
  activeActionId,
  onSelectMode,
  actions = SYSTEM_ACTIONS,
}) {
  const hasFourActions = actions.length === 4;
  return (
    <section aria-label="Choose a game mode" className={`pointer-events-auto absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto grid grid-cols-1 gap-3 sm:bottom-6 ${
      hasFourActions
        ? "max-w-[66rem] sm:grid-cols-2 lg:grid-cols-4"
        : "max-w-[55rem] sm:grid-cols-[1.2fr_1fr_1fr]"
    }`}>
      {actions.map((action) => (
        <SystemActionButton
          key={action.id}
          action={action}
          disabled={isBusy}
          isActive={activeActionId === action.id}
          onSelectMode={onSelectMode}
        />
      ))}
    </section>
  );
}

export function HomeTitleChrome({
  identity,
  accountStatus,
  hasIdentity,
  matchAlertDisplay,
  matchAlertLoading = false,
  matchAlertError = "",
  onMatchAlertAction = () => {},
  onEditIdentity,
  onOpenAccount,
  onOpenSignIn,
  onOpenSaveProfile,
  onSignOut,
  accountMenuOpen,
  accountMenuDefaultOpen,
  onAccountMenuOpenChange,
  isBusy = false,
  activeActionId = null,
  onSelectMode,
  logoVariant = "sx",
  logoTone = DEFAULT_BRAND_LOGO_TONE,
  releaseInfo = publicReleaseInfo,
  releaseOpen,
  onReleaseOpenChange,
  systemActions = SYSTEM_ACTIONS,
}) {
  return (
    <>
      <HomeTableBrand logoVariant={logoVariant} logoTone={logoTone} />
      <SystemTopChrome
        identity={identity}
        accountStatus={accountStatus}
        hasIdentity={hasIdentity}
        matchAlertDisplay={matchAlertDisplay}
        matchAlertLoading={matchAlertLoading}
        matchAlertError={matchAlertError}
        onMatchAlertAction={onMatchAlertAction}
        onEditIdentity={onEditIdentity}
        onOpenAccount={onOpenAccount}
        onOpenSignIn={onOpenSignIn}
        onOpenSaveProfile={onOpenSaveProfile}
        onSignOut={onSignOut}
        open={accountMenuOpen}
        defaultOpen={accountMenuDefaultOpen}
        onOpenChange={onAccountMenuOpenChange}
      />
      <HomeMetaChrome
        releaseInfo={releaseInfo}
        open={releaseOpen}
        onOpenChange={onReleaseOpenChange}
      />
      <HomeGameModeDock
        isBusy={isBusy}
        activeActionId={activeActionId}
        onSelectMode={onSelectMode}
        actions={systemActions}
      />
    </>
  );
}
