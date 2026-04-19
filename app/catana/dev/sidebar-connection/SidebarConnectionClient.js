"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  ChatBubbleLeftRightIcon,
  ListBulletIcon
} from "@heroicons/react/24/outline";

const PANEL_ORDER = [
  {
    id: "log",
    label: "Game Log",
    shortLabel: "Log",
    Icon: ListBulletIcon,
    height: 286
  },
  {
    id: "chat",
    label: "Chat",
    shortLabel: "Chat",
    Icon: ChatBubbleLeftRightIcon,
    height: 230
  }
];

const STUDIES = [
  {
    id: "tapered",
    label: "Current",
    name: "Thin Header Taper",
    note:
      "The same shell owns the closed button and the open rail, so the title bar grows out of the button and then narrows into the thinner header."
  },
  {
    id: "side-tab",
    label: "New Variant",
    name: "Side-Tab Ribbon",
    note:
      "A visible dock column stays in the background. The active dock item becomes a selected side tab that plugs directly into the panel surface with simple horizontal joins."
  }
];

const LOG_ENTRIES = [
  {
    id: 1,
    tone: "text-amber-300",
    text: "Visitor 3 received",
    suffix: " sheep ore"
  },
  {
    id: 2,
    tone: "text-amber-300",
    text: "Visitor 3 placed a road",
    suffix: ""
  },
  {
    id: 3,
    tone: "text-rose-400",
    text: "Visitor 2 placed a settlement",
    suffix: ""
  },
  {
    id: 4,
    tone: "text-rose-400",
    text: "Visitor 2 received",
    suffix: " sheep"
  },
  {
    id: 5,
    tone: "text-sky-200",
    text: "Visitor 1 placed a road",
    suffix: ""
  }
];

const BUTTON_SIZE = 72;
const BUTTON_RADIUS = 18;
const BODY_LEFT = 84;
const BODY_WIDTH = 456;
const BODY_RIGHT = BODY_LEFT + BODY_WIDTH;
const BODY_TOP = 54;
const OPEN_HEADER_HEIGHT = 34;
const OPEN_HEADER_RADIUS = 12;
const SIDE_TAB_PANEL_GAP = 12;
const SIDE_TAB_PANEL_LEFT = BUTTON_SIZE + SIDE_TAB_PANEL_GAP;
const SIDE_TAB_HEADER_HEIGHT = 33;
const SIDE_TAB_PANEL_OPEN_LIFT = 12;
const SIDE_TAB_PANEL_TOP = -(
  SIDE_TAB_HEADER_HEIGHT + SIDE_TAB_PANEL_OPEN_LIFT
);
const SIDE_TAB_PANEL_WIDTH = 448;
const SIDE_TAB_PANEL_RADIUS = 18;
const SIDE_TAB_HEADER_SEAM_Y = SIDE_TAB_PANEL_TOP + SIDE_TAB_HEADER_HEIGHT;
const SIDE_TAB_JOIN_RADIUS = 10;
const SIDE_TAB_SHELL_WIDTH = SIDE_TAB_PANEL_LEFT + SIDE_TAB_PANEL_WIDTH;
const SIDE_TAB_BUTTON_CLOSED_TOP = 0;
const SIDE_TAB_BUTTON_OPEN_TOP = SIDE_TAB_BUTTON_CLOSED_TOP;
const SIDE_TAB_BUTTON_STACK_GAP = 16;
const SIDE_TAB_OPEN_PANEL_GAP = 20;

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function easeOutCubic(value) {
  return 1 - (1 - value) ** 3;
}

function interpolateStops(value, inputRange, outputRange) {
  if (value <= inputRange[0]) {
    return outputRange[0];
  }

  for (let index = 1; index < inputRange.length; index += 1) {
    const currentStop = inputRange[index];
    if (value <= currentStop) {
      const previousStop = inputRange[index - 1];
      const localProgress = (value - previousStop) / (currentStop - previousStop);
      return lerp(outputRange[index - 1], outputRange[index], localProgress);
    }
  }

  return outputRange[outputRange.length - 1];
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("prefers-reduced-motion: reduce");
    const syncPreference = () => setReduceMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener?.("change", syncPreference);

    return () => {
      mediaQuery.removeEventListener?.("change", syncPreference);
    };
  }, []);

  return reduceMotion;
}

function useGsapDockMotion({ isOpen, height }) {
  const targetProgress = isOpen ? 1 : 0;
  const reduceMotion = usePrefersReducedMotion();
  const valuesRef = useRef({ progress: targetProgress, height });
  const [motion, setMotion] = useState(() => ({ ...valuesRef.current }));

  useEffect(() => {
    const values = valuesRef.current;

    gsap.killTweensOf(values);
    const tween = gsap.to(values, {
      progress: targetProgress,
      height,
      duration: reduceMotion ? 0 : 0.22,
      ease: "power3.out",
      overwrite: "auto",
      onUpdate() {
        setMotion({ progress: values.progress, height: values.height });
      },
      onComplete() {
        values.progress = targetProgress;
        values.height = height;
        setMotion({ progress: targetProgress, height });
      }
    });

    return () => {
      tween.kill();
    };
  }, [height, reduceMotion, targetProgress]);

  return motion;
}

function roundedRectPath({ width, height, radius }) {
  return [
    `M ${radius} 0`,
    `H ${width - radius}`,
    `A ${radius} ${radius} 0 0 1 ${width} ${radius}`,
    `V ${height - radius}`,
    `A ${radius} ${radius} 0 0 1 ${width - radius} ${height}`,
    `H ${radius}`,
    `A ${radius} ${radius} 0 0 1 0 ${height - radius}`,
    `V ${radius}`,
    `A ${radius} ${radius} 0 0 1 ${radius} 0`,
    "Z"
  ].join(" ");
}

function buildDockShellPath(progress) {
  if (progress <= 0.001) {
    return roundedRectPath({
      width: BUTTON_SIZE,
      height: BUTTON_SIZE,
      radius: BUTTON_RADIUS
    });
  }

  const eased = easeOutCubic(progress);
  const currentWidth = lerp(BUTTON_SIZE, BODY_RIGHT, progress);
  const railHeight = lerp(BUTTON_SIZE, OPEN_HEADER_HEIGHT, eased);
  const railTop = (BUTTON_SIZE - railHeight) / 2;
  const railBottom = railTop + railHeight;
  const railRadius = lerp(BUTTON_RADIUS, OPEN_HEADER_RADIUS, eased);
  const neckStart = lerp(52, 38, eased);
  const neckEnd = Math.min(
    currentWidth - railRadius - 16,
    lerp(62, 92, eased)
  );
  const topCurveControl = lerp(18, 10, eased);
  const bottomCurveControl = lerp(18, 10, eased);

  return [
    `M ${BUTTON_RADIUS} 0`,
    `H ${neckStart}`,
    `C ${neckStart + topCurveControl} 0, ${neckEnd - 22} ${railTop}, ${neckEnd} ${railTop}`,
    `H ${currentWidth - railRadius}`,
    `A ${railRadius} ${railRadius} 0 0 1 ${currentWidth} ${railTop + railRadius}`,
    `V ${railBottom}`,
    `H ${neckEnd}`,
    `C ${neckEnd - 22} ${railBottom}, ${neckStart + bottomCurveControl} ${BUTTON_SIZE}, ${neckStart} ${BUTTON_SIZE}`,
    `H ${BUTTON_RADIUS}`,
    `A ${BUTTON_RADIUS} ${BUTTON_RADIUS} 0 0 1 0 ${BUTTON_SIZE - BUTTON_RADIUS}`,
    `V ${BUTTON_RADIUS}`,
    `A ${BUTTON_RADIUS} ${BUTTON_RADIUS} 0 0 1 ${BUTTON_RADIUS} 0`,
    "Z"
  ].join(" ");
}

function useOpenPanelSet(initialIds) {
  const [openIds, setOpenIds] = useState(initialIds);

  return {
    openIds,
    setOpenIds,
    toggle(id) {
      setOpenIds((currentIds) =>
        currentIds.includes(id)
          ? currentIds.filter((currentId) => currentId !== id)
          : [...currentIds, id]
      );
    }
  };
}

function StageBackdrop() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_32%),linear-gradient(160deg,_rgba(59,130,246,0.92),_rgba(29,78,216,0.98))]" />
      <div className="absolute inset-y-4 left-16 w-px bg-white/18" />
      <div className="absolute right-[-8rem] top-[-4rem] h-72 w-72 rounded-full bg-white/20 blur-3xl" />
      <div className="absolute right-[-2rem] top-28 h-60 w-60 rounded-full bg-lime-300/28 blur-3xl" />
      <div className="absolute right-8 bottom-4 h-52 w-52 rounded-full bg-amber-200/24 blur-3xl" />
      <div className="absolute right-14 top-10 h-14 w-24 rounded-2xl border border-white/70 bg-rose-300/90 shadow-lg shadow-sky-950/15" />
      <div className="absolute right-40 top-12 h-12 w-20 rounded-2xl border border-white/60 bg-white/22 backdrop-blur-sm" />
      <div className="absolute right-12 bottom-20 h-14 w-14 rounded-full border-4 border-white/65 bg-amber-100/90 shadow-lg shadow-sky-950/15" />
      <div className="absolute right-36 bottom-14 h-24 w-24 rounded-[30px] border border-white/55 bg-white/16 backdrop-blur-sm" />
    </>
  );
}

function ControlButton({ children, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClassNames(
        "rounded-full px-4 py-2 text-sm font-semibold transition",
        isSelected
          ? "bg-white/85 text-slate-800 shadow-md ring-1 ring-white/80"
          : "bg-white/18 text-white/90 ring-1 ring-white/35 hover:bg-white/26"
      )}
    >
      {children}
    </button>
  );
}

function StudyShell({ study, children }) {
  return (
    <section className="flex flex-col gap-4 rounded-[30px] bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-sm">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-lime-300 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-lime-950">
            {study.label}
          </span>
          <h2 className="text-xl font-bold text-white">{study.name}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-blue-50/88">
          {study.note}
        </p>
      </div>

      {children}
    </section>
  );
}

function MockLogBody() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-2">
        <div className="space-y-2 text-sm">
          {LOG_ENTRIES.map((entry, index) => (
            <div
              key={entry.id}
              className={joinClassNames(
                "space-y-2 break-words pb-3 text-sm leading-5 text-slate-800",
                index === LOG_ENTRIES.length - 1
                  ? ""
                  : "border-b border-white/35"
              )}
            >
              <div>
                <span className={joinClassNames("font-semibold", entry.tone)}>
                  {entry.text}
                </span>
                <span className="text-slate-800/80">{entry.suffix}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockChatBody() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <div className="h-full overflow-y-auto px-3">
          <div className="space-y-1.5 py-1.5 text-sm">
            <div className="break-words text-sm leading-5 text-slate-800">
              No messages yet.
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/35 bg-white/35 backdrop-blur-sm">
        <div className="bg-white/50 px-2.5 py-1.5 text-sm text-slate-500 shadow-inner ring-1 ring-white/50">
          Message...
        </div>
      </div>
    </div>
  );
}

function PanelCard({ panelId }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-b-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text">
      <div className="absolute inset-x-0 top-0 h-px bg-white/55" />
      <div
        className={joinClassNames(
          "h-full",
          panelId === "chat" ? "flex flex-col" : ""
        )}
      >
        {panelId === "log" ? <MockLogBody /> : <MockChatBody />}
      </div>
    </div>
  );
}

function HeaderedPanelCard({ panelId, title }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text">
      <div className="bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 select-none">
        {title}
      </div>
      <div
        className={joinClassNames(
          "min-h-0 flex-1",
          panelId === "chat" ? "flex flex-col" : ""
        )}
      >
        {panelId === "log" ? <MockLogBody /> : <MockChatBody />}
      </div>
    </div>
  );
}

function SideTabPanelContent({ panelId, title }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[18px] select-text">
      <div className="bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700 select-none">
        {title}
      </div>
      <div
        className={joinClassNames(
          "min-h-0 flex-1",
          panelId === "chat" ? "flex flex-col" : ""
        )}
      >
        {panelId === "log" ? <MockLogBody /> : <MockChatBody />}
      </div>
    </div>
  );
}

function ShellActionButton({ Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-0 top-0 z-30 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-transparent focus:outline-none"
    >
      <Icon className="h-8 w-8 text-slate-700" strokeWidth={1.8} />
    </button>
  );
}

function buildSideTabUnifiedShellPath(panelHeight) {
  const panelLeft = SIDE_TAB_PANEL_LEFT;
  const panelTop = SIDE_TAB_PANEL_TOP;
  const panelRight = panelLeft + SIDE_TAB_PANEL_WIDTH;
  const panelBottom = panelTop + panelHeight;
  const panelRadius = SIDE_TAB_PANEL_RADIUS;
  const buttonTop = SIDE_TAB_BUTTON_OPEN_TOP;
  const buttonBottom = buttonTop + BUTTON_SIZE;
  const tabRadius = BUTTON_RADIUS;
  const joinRadius = SIDE_TAB_JOIN_RADIUS;
  const topJoinY = SIDE_TAB_HEADER_SEAM_Y;

  return [
    `M ${panelLeft + panelRadius} ${panelTop}`,
    `H ${panelRight - panelRadius}`,
    `A ${panelRadius} ${panelRadius} 0 0 1 ${panelRight} ${panelTop + panelRadius}`,
    `V ${panelBottom - panelRadius}`,
    `A ${panelRadius} ${panelRadius} 0 0 1 ${panelRight - panelRadius} ${panelBottom}`,
    `H ${panelLeft + panelRadius}`,
    `A ${panelRadius} ${panelRadius} 0 0 1 ${panelLeft} ${panelBottom - panelRadius}`,
    `V ${buttonBottom + joinRadius}`,
    `Q ${panelLeft} ${buttonBottom} ${panelLeft - joinRadius} ${buttonBottom}`,
    `H ${tabRadius}`,
    `A ${tabRadius} ${tabRadius} 0 0 1 0 ${buttonBottom - tabRadius}`,
    `V ${buttonTop + tabRadius}`,
    `A ${tabRadius} ${tabRadius} 0 0 1 ${tabRadius} ${buttonTop}`,
    `H ${panelLeft - joinRadius}`,
    `Q ${panelLeft} ${buttonTop} ${panelLeft} ${topJoinY}`,
    `V ${panelTop + panelRadius}`,
    `A ${panelRadius} ${panelRadius} 0 0 1 ${panelLeft + panelRadius} ${panelTop}`,
    "Z"
  ].join(" ");
}

function getSideTabRowHeight({ panel, isOpen, nextIsOpen }) {
  if (isOpen && nextIsOpen) {
    return panel.height + SIDE_TAB_OPEN_PANEL_GAP;
  }

  return BUTTON_SIZE + SIDE_TAB_BUTTON_STACK_GAP;
}

function TaperedConnectedRow({ panel, isOpen, onToggle }) {
  const rowHeight = isOpen ? panel.height : 88;
  const panelCardHeight = rowHeight - BODY_TOP;
  const motion = useGsapDockMotion({ isOpen, height: rowHeight });
  const progress = motion.progress;
  const eased = easeOutCubic(progress);
  const shellFillAlpha = 0.18 + progress * 0.32;
  const shellBorderAlpha = 0.34 + progress * 0.14;
  const shellFill = `rgba(255, 255, 255, ${shellFillAlpha.toFixed(3)})`;
  const shellBorder = `rgba(255, 255, 255, ${shellBorderAlpha.toFixed(3)})`;
  const labelOpacity = interpolateStops(
    progress,
    [0, 0.42, 0.72, 1],
    [0, 0, 1, 1]
  );
  const labelTransform = `translate3d(${((1 - progress) * -12).toFixed(
    1
  )}px,0,0)`;
  const labelTop = `${lerp(24, 29, eased).toFixed(1)}px`;
  const shellPath = buildDockShellPath(progress);
  const bodyOpacity = interpolateStops(progress, [0, 0.28, 1], [0, 0, 1]);
  const bodyTransform = `translate3d(${((1 - progress) * -14).toFixed(
    1
  )}px,${((1 - progress) * -10).toFixed(1)}px,0) scale(${(
    0.985 +
    progress * 0.015
  ).toFixed(3)})`;
  const bodyHeight = Math.max(0, panelCardHeight * progress);

  return (
    <div
      className="relative"
      style={{
        height: motion.height
      }}
    >
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-[72px] w-[540px]">
        <svg
          viewBox={`0 0 ${BODY_RIGHT} ${BUTTON_SIZE}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={shellPath}
            fill={shellFill}
            stroke={shellBorder}
            strokeWidth="1.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div
          className="absolute left-[92px] top-[24px] text-xs font-semibold uppercase tracking-widest text-slate-700"
          style={{
            opacity: labelOpacity,
            transform: labelTransform,
            top: labelTop
          }}
        >
          {panel.label}
        </div>
      </div>

      <ShellActionButton Icon={panel.Icon} onClick={onToggle} />

      <div
        className="absolute left-[84px] top-[54px] z-10 w-[456px] overflow-hidden will-change-transform"
        style={{
          opacity: bodyOpacity,
          transform: bodyTransform,
          height: bodyHeight
        }}
      >
        <PanelCard panelId={panel.id} />
      </div>
    </div>
  );
}

function SideTabConnectedRow({ panel, isOpen, nextIsOpen, onToggle }) {
  const rowHeight = getSideTabRowHeight({ panel, isOpen, nextIsOpen });
  const panelHeight = panel.height;
  const motion = useGsapDockMotion({ isOpen, height: rowHeight });
  const progress = motion.progress;
  const shellHeight = SIDE_TAB_PANEL_TOP + panelHeight;
  const shellPath = buildSideTabUnifiedShellPath(panelHeight);
  const buttonShellOpacity = interpolateStops(
    progress,
    [0, 0.22, 0.44, 1],
    [1, 0.9, 0, 0]
  );
  const shellOpacity = interpolateStops(progress, [0, 0.1, 1], [0, 0.16, 1]);
  const shellTransform = `translate3d(${((1 - progress) * -10).toFixed(
    1
  )}px,0,0)`;
  const shellShadow = `drop-shadow(0 18px 34px rgba(15,23,42,${(
    0.04 +
    progress * 0.08
  ).toFixed(3)}))`;
  const bodyOpacity = interpolateStops(progress, [0, 0.24, 1], [0, 0, 1]);
  const bodyTransform = `translate3d(${((1 - progress) * -10).toFixed(
    1
  )}px,${((1 - progress) * -10).toFixed(1)}px,0) scale(${(
    0.986 +
    progress * 0.014
  ).toFixed(3)})`;
  const bodyHeight = Math.max(0, panelHeight * progress);
  const sideTabPanelClip = `inset(0 round ${SIDE_TAB_PANEL_RADIUS}px)`;

  return (
    <div
      className="relative"
      style={{
        height: motion.height
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 z-10"
        style={{
          opacity: shellOpacity,
          transform: shellTransform,
          transformOrigin: "left top",
          filter: shellShadow
        }}
      >
        <svg
          width={SIDE_TAB_SHELL_WIDTH}
          height={shellHeight}
          viewBox={`0 0 ${SIDE_TAB_SHELL_WIDTH} ${shellHeight}`}
          className="overflow-visible"
          aria-hidden="true"
        >
          <path
            d={shellPath}
            fill="rgba(191,219,254,0.88)"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="1.3"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div
        className="pointer-events-none absolute left-0 top-0 z-20 h-[72px] w-[72px] rounded-[18px] bg-white/25 ring-1 ring-white/45 backdrop-blur-sm"
        style={{
          opacity: buttonShellOpacity,
          top: `${SIDE_TAB_BUTTON_CLOSED_TOP}px`,
          transformOrigin: "center center"
        }}
      />

      <button
        type="button"
        onClick={onToggle}
        aria-label={panel.label}
        className="absolute left-0 z-40 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-transparent focus:outline-none"
        style={{
          top: `${SIDE_TAB_BUTTON_CLOSED_TOP}px`
        }}
      >
        <panel.Icon className="h-8 w-8 text-slate-700" strokeWidth={1.8} />
      </button>

      <div
        className="absolute z-30 overflow-hidden will-change-transform"
        style={{
          opacity: bodyOpacity,
          transform: bodyTransform,
          height: bodyHeight,
          borderRadius: `${SIDE_TAB_PANEL_RADIUS}px`,
          clipPath: sideTabPanelClip,
          WebkitClipPath: sideTabPanelClip,
          left: `${SIDE_TAB_PANEL_LEFT}px`,
          top: `${SIDE_TAB_PANEL_TOP}px`,
          width: `${SIDE_TAB_PANEL_WIDTH}px`
        }}
      >
        <SideTabPanelContent panelId={panel.id} title={panel.label} />
      </div>
    </div>
  );
}

function VariantStage({ study, openIds, onToggle }) {
  return (
    <StudyShell study={study}>
      <div className="relative min-h-[620px] overflow-hidden rounded-[34px] border border-white/24 shadow-[0_30px_80px_rgba(15,23,42,0.24)]">
        <StageBackdrop />
        {study.id === "side-tab" ? (
          <div className="pointer-events-none absolute left-3 top-6 bottom-8 z-0 w-[84px] rounded-[28px] bg-slate-950/14 ring-1 ring-white/8 backdrop-blur-sm" />
        ) : null}

        <div
          className={joinClassNames(
            "relative z-10 flex flex-col px-6 pb-8",
            study.id === "side-tab" ? "gap-0 pt-[52px]" : "gap-5 pt-6"
          )}
        >
          {PANEL_ORDER.map((panel, index) => {
            const isOpen = openIds.includes(panel.id);
            const nextPanel = PANEL_ORDER[index + 1];
            const nextIsOpen = nextPanel
              ? openIds.includes(nextPanel.id)
              : false;

            return study.id === "tapered" ? (
              <TaperedConnectedRow
                key={panel.id}
                panel={panel}
                isOpen={isOpen}
                onToggle={() => onToggle(panel.id)}
              />
            ) : (
              <SideTabConnectedRow
                key={panel.id}
                panel={panel}
                isOpen={isOpen}
                nextIsOpen={nextIsOpen}
                onToggle={() => onToggle(panel.id)}
              />
            );
          })}
        </div>
      </div>
    </StudyShell>
  );
}

export function SidebarConnectionClient() {
  const { openIds, setOpenIds, toggle } = useOpenPanelSet(["log", "chat"]);

  const selectionLabel = useMemo(() => {
    if (openIds.length === 0) {
      return "Dock only";
    }
    if (openIds.length === PANEL_ORDER.length) {
      return "Both open";
    }
    return openIds[0] === "log" ? "Log only" : "Chat only";
  }, [openIds]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-8">
        <header className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-200/80">
              Catana Dev Mockups
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              Connected Desktop Dock Studies
            </h1>
            <p className="max-w-3xl text-base leading-7 text-slate-300">
              Fresh experiments for making the left dock feel genuinely tied to
              the panel it opens. These mockups ignore the current sidebar code
              and focus on one thing: whether the connection reads clearly at a
              glance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ControlButton
              isSelected={selectionLabel === "Both open"}
              onClick={() => setOpenIds(["log", "chat"])}
            >
              Both open
            </ControlButton>
            <ControlButton
              isSelected={selectionLabel === "Log only"}
              onClick={() => setOpenIds(["log"])}
            >
              Log only
            </ControlButton>
            <ControlButton
              isSelected={selectionLabel === "Chat only"}
              onClick={() => setOpenIds(["chat"])}
            >
              Chat only
            </ControlButton>
            <ControlButton
              isSelected={selectionLabel === "Dock only"}
              onClick={() => setOpenIds([])}
            >
              Dock only
            </ControlButton>
            <div className="ml-2 flex items-center gap-2 text-sm text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                Live toggle
              </span>
              <button
                type="button"
                onClick={() => toggle("log")}
                className="rounded-full bg-white/14 px-3 py-1 ring-1 ring-white/20 transition hover:bg-white/22"
              >
                Toggle log
              </button>
              <button
                type="button"
                onClick={() => toggle("chat")}
                className="rounded-full bg-white/14 px-3 py-1 ring-1 ring-white/20 transition hover:bg-white/22"
              >
                Toggle chat
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-2">
          {STUDIES.map((study) => (
            <VariantStage
              key={study.id}
              study={study}
              openIds={openIds}
              onToggle={toggle}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
