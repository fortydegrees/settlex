"use client";

import { CpuChipIcon, LinkIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { Fredoka } from "next/font/google";
import React, { useEffect, useState } from "react";
import { MetaDisclosure } from "../../ui/MetaDisclosure";
import { BrandWordmark } from "../../ui/DisplayText";
import { publicReleaseInfo } from "../lobby/releaseInfo";
import skyTextStyles from "./HomeSkyText.module.css";
import { SystemTopChrome } from "./SystemTopChrome";
import modeStyles from "./HomeModeButton.module.css";
import brandStyles from "./HomeBrand.module.css";

const brandWordmarkFont = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});
const BRAND_WORDMARK_FONT_FAMILY = brandWordmarkFont.style.fontFamily;

const HOME_RELEASE_PANEL_HIGHLIGHT_COUNT = 3;
const BRAND_LOGO_VARIANTS = new Set([
  "none",
  "settlement",
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
    variant: "none",
    tone: DEFAULT_BRAND_LOGO_TONE,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedVariant = params.get("logo");
    const requestedTone = params.get("logoTone");

    setOptions({
      variant: BRAND_LOGO_VARIANTS.has(requestedVariant)
        ? requestedVariant
        : "none",
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
    icon: UserGroupIcon,
    badge: "1v1",
    variant: "primary",
  },
  {
    id: "bot",
    label: "Play vs Bot",
    icon: CpuChipIcon,
    badge: "AI",
    variant: "accent",
  },
  ...(settleGraphV2Enabled
    ? [{
        id: "bot-v2",
        label: "Play Bot 005",
        icon: CpuChipIcon,
        badge: "005",
        variant: "accent",
      }]
    : []),
  {
    id: "friend",
    label: "Play a Friend",
    icon: LinkIcon,
    badge: "+",
    variant: "secondary",
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
  logoVariant = "none",
  logoTone = DEFAULT_BRAND_LOGO_TONE,
}) {
  return (
    <header className={brandStyles.brand}>
      {logoVariant !== "none" && <span className={brandStyles.mark} aria-hidden="true">
        {logoVariant === "settlement" ? (
          // The shipped game-piece SVG is already sized; no raster optimization needed.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/svgs/pieces/settlement_orange.svg"
            alt=""
            width="64"
            height="72"
            className={brandStyles.settlement}
          />
        ) : (
          <SettlehexLogoMark compact={compact} variant={logoVariant} tone={logoTone} />
        )}
      </span>}
      <div className="grid gap-ui-0.5">
        <h1
          className={brandStyles.heading}
          aria-label="SettleHex"
        >
          <BrandWordmark />
        </h1>
        <p className={`type-section sm:type-title text-center sm:text-left ${skyTextStyles.support} ${brandStyles.subtitle}`}>
          1v1 Settlers of Catan
        </p>
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
        triggerClassName={`select-none px-ui-0 py-ui-2 ${skyTextStyles.release}`}
        panelClassName="!w-[min(22rem,calc(100vw-1.5rem))]"
      >
        <div className="type-caption text-ink-secondary">
          Latest update
        </div>
        <h2 className="mt-ui-1 type-section text-ink-primary">
          {releaseInfo.releaseLabel} · {releaseInfo.title}
        </h2>
        <ul className="mt-ui-3 space-y-ui-2 type-body-small text-ink-secondary">
          {releaseHighlights.map((highlight) => (
            <li key={highlight} className="flex gap-ui-2">
              <span
                aria-hidden="true"
                className="settlex-ui-metadata-dot settlex-ui-metadata-dot-positive mt-ui-1.5 h-1.5 w-1.5 shrink-0"
              />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
        <div className="mt-ui-3 border-t border-edge-subtle pt-ui-3 type-code-caption text-ink-secondary">
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
      className={`settlex-ui-button settlex-ui-focus settlex-ui-button-${action.variant} ${modeStyles.button}`}
      disabled={disabled}
      data-active={isActive ? "true" : undefined}
      onClick={() => onSelectMode(action.id)}
    >
      <span className={modeStyles.content}>
        <span className={modeStyles.icon}>
          {isActive ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-pill border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          ) : Icon ? (
            <Icon className={modeStyles.symbol} aria-hidden="true" />
          ) : (
            action.tileLabel
          )}
        </span>
        <span className={modeStyles.label}>{label}</span>
        <span className={modeStyles.marker} aria-hidden={action.badge === "+"}>
          {action.badge}
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
    <section aria-label="Choose a game mode" className={`pointer-events-auto absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto grid grid-cols-1 gap-ui-2.5 select-none max-[639px]:max-w-[23.5rem] sm:bottom-6 lg:gap-ui-3 ${
      hasFourActions
        ? `max-w-[66rem] sm:grid-cols-2 lg:grid-cols-4 ${modeStyles.fourModes}`
        : "max-w-[53.75rem] md:grid-cols-3"
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
  logoVariant = "none",
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
