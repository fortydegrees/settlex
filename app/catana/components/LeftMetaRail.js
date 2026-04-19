import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { GameLogPanel } from "./GameLogPanel";
import { ChatPanel } from "./ChatPanel";
import {
  clampLeftMetaRailDesktopPanelWidth,
  normalizeLeftMetaRailDesktopPrefs,
  readLeftMetaRailDesktopPrefs,
  writeLeftMetaRailDesktopPrefs,
} from "../utils/leftMetaRailPreferences";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const panelIds = new Set(["log", "chat"]);
const defaultDesktopOpenPanels = ["log", "chat"];

const BUTTON_SIZE = 72;
const BUTTON_RADIUS = 18;
const SIDE_TAB_BUTTON_TAB_LEFT = BUTTON_SIZE - BUTTON_RADIUS;
const SIDE_TAB_PANEL_GAP = 8;
const SIDE_TAB_PANEL_LEFT = BUTTON_SIZE + SIDE_TAB_PANEL_GAP;
const SIDE_TAB_BUTTON_TAB_WIDTH = SIDE_TAB_PANEL_LEFT - SIDE_TAB_BUTTON_TAB_LEFT;
const SIDE_TAB_PANEL_OVERLAP = 2;
const SIDE_TAB_CARD_LEFT = SIDE_TAB_PANEL_LEFT - SIDE_TAB_PANEL_OVERLAP;
const SIDE_TAB_HEADER_HEIGHT = 33;
const SIDE_TAB_PANEL_OPEN_LIFT = 12;
const SIDE_TAB_PANEL_TOP = -(
  SIDE_TAB_HEADER_HEIGHT + SIDE_TAB_PANEL_OPEN_LIFT
);
const SIDE_TAB_BOTTOM_PANEL_TOP = 0;
const SIDE_TAB_MIDDLE_PANEL_TOP = Math.round(
  (SIDE_TAB_PANEL_TOP + SIDE_TAB_BOTTOM_PANEL_TOP) / 2
);
const SIDE_TAB_PANEL_MAX_WIDTH = 448;
const SIDE_TAB_PANEL_RADIUS = 18;
const SIDE_TAB_BUTTON_CLOSED_TOP = 0;
const SIDE_TAB_BUTTON_STACK_GAP = 16;
const SIDE_TAB_OPEN_PANEL_GAP = 20;
const SIDE_TAB_ATTACHMENTS = ["top", "middle", "bottom"];
const DESKTOP_META_DOCK_WIDTH_SLACK = 32;

const mobileButtonBaseClassName =
  "flex h-14 w-14 items-center justify-center rounded-[1.45rem] border transition-colors focus:outline-none focus:ring-2 focus:ring-white/80";
const mobileButtonActiveClassName =
  "border-transparent bg-transparent text-slate-700 shadow-none ring-0";
const mobileButtonIdleClassName =
  "border-white/30 bg-white/18 text-slate-700 shadow-md hover:bg-white/28";
const mobileButtonIconClassName = "h-5 w-5";
const desktopButtonIconClassName = "h-8 w-8";
const desktopSideTabPanelHeaderClassName =
  "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700";
const mobileRailWrapperClassName =
  "pointer-events-auto flex flex-col gap-2 rounded-[1.4rem] bg-white/24 p-1.5 shadow-2xl ring-1 ring-white/35 backdrop-blur-md";
const mobileDrawerShellClassName =
  "pointer-events-auto w-[min(22rem,calc(100vw-5.75rem))] max-w-[22rem] transition-all duration-200 ease-out";
const mobileDrawerPanelClassName =
  "flex h-[42vh] min-h-[11rem] max-h-[24rem] flex-col overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text";

const normalizePanelId = (panelId) =>
  typeof panelId === "string" && panelIds.has(panelId) ? panelId : null;

const normalizeSideTabAttachment = (attachment, anchor) => {
  const nextAttachment =
    typeof attachment === "string" ? attachment : typeof anchor === "string" ? anchor : "top";

  return SIDE_TAB_ATTACHMENTS.includes(nextAttachment)
    ? nextAttachment
    : "top";
};

const LogIcon = ({ className = mobileButtonIconClassName } = {}) =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
    },
    React.createElement("path", { d: "M8 7h9" }),
    React.createElement("path", { d: "M8 12h9" }),
    React.createElement("path", { d: "M8 17h9" }),
    React.createElement("circle", { cx: "5", cy: "7", r: "1" }),
    React.createElement("circle", { cx: "5", cy: "12", r: "1" }),
    React.createElement("circle", { cx: "5", cy: "17", r: "1" })
  );

const ChatIcon = ({ className = mobileButtonIconClassName } = {}) =>
  React.createElement(
    "svg",
    {
      viewBox: "0 0 24 24",
      className,
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
    },
    React.createElement("path", {
      d: "M6.5 7.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-3H6.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z",
    })
  );

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
      },
    });

    return () => {
      tween.kill();
    };
  }, [height, reduceMotion, targetProgress]);

  return motion;
}

const getSideTabShellWidth = (panelWidth = SIDE_TAB_PANEL_MAX_WIDTH) =>
  SIDE_TAB_CARD_LEFT + panelWidth;

const getDesktopDockWidth = (panelWidth = SIDE_TAB_PANEL_MAX_WIDTH) =>
  getSideTabShellWidth(panelWidth) + DESKTOP_META_DOCK_WIDTH_SLACK;

export function getSideTabLayoutMetrics({
  panelHeight,
  attachment = "top",
  anchor,
}) {
  const normalizedAttachment = normalizeSideTabAttachment(attachment, anchor);
  const buttonTop = SIDE_TAB_BUTTON_CLOSED_TOP;
  const buttonBottom = buttonTop + BUTTON_SIZE;
  const attachmentLayout =
    {
      top: { panelTop: SIDE_TAB_PANEL_TOP },
      middle: { panelTop: SIDE_TAB_MIDDLE_PANEL_TOP },
      bottom: { panelTop: SIDE_TAB_BOTTOM_PANEL_TOP },
    }[normalizedAttachment] ?? { panelTop: SIDE_TAB_PANEL_TOP };
  const panelTop = attachmentLayout.panelTop;
  const panelBottom = panelTop + panelHeight;

  return {
    attachment: normalizedAttachment,
    panelTop,
    panelBottom,
    buttonTop,
    buttonBottom,
  };
}

export function getSideTabRowHeight({ layout, isOpen, nextIsOpen, nextLayout }) {
  if (isOpen && nextIsOpen && nextLayout) {
    return layout.panelBottom + SIDE_TAB_OPEN_PANEL_GAP - nextLayout.panelTop;
  }

  if (isOpen) {
    return BUTTON_SIZE + SIDE_TAB_BUTTON_STACK_GAP;
  }

  return BUTTON_SIZE + SIDE_TAB_BUTTON_STACK_GAP;
}

const MobileDockButton = ({
  panel,
  isOpen,
  onToggle,
  panelId,
  showLabel = true,
  className = "",
  iconClassName = mobileButtonIconClassName,
}) =>
  React.createElement(
    "button",
    {
      type: "button",
      onClick: () => onToggle(panel.id),
      className: joinClassNames(
        mobileButtonBaseClassName,
        isOpen ? mobileButtonActiveClassName : mobileButtonIdleClassName,
        className
      ),
      "aria-expanded": isOpen ? "true" : "false",
      "aria-controls": panelId,
      "aria-label": panel.ariaLabel,
      title: panel.label,
      "data-meta-sidebar-button": panel.id,
      "data-allow-interaction": "true",
    },
    React.cloneElement(panel.icon, {
      className: iconClassName,
    }),
    showLabel
      ? React.createElement(
          "span",
          {
            className:
              "mt-1 text-[0.6rem] font-semibold uppercase leading-none tracking-[0.24em]",
          },
          panel.shortLabel
        )
      : React.createElement("span", { className: "sr-only" }, panel.label)
  );

const useEscapeCollapse = (isEnabled, onCollapse) => {
  useEffect(() => {
    if (!isEnabled || typeof window === "undefined") return undefined;

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.code !== "Escape") return;
      event.preventDefault();
      onCollapse();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEnabled, onCollapse]);
};

const buildMetaPanels = ({
  entries,
  logPlayerMap,
  themeId,
  playerID,
  bgioProps,
}) => [
  {
    id: "log",
    attachment: "bottom",
    shortLabel: "Log",
    label: "Game Log",
    ariaLabel: "Open game log panel",
    icon: React.createElement(LogIcon),
    height: 286,
    renderDesktop: () =>
      React.createElement(GameLogPanel, {
        entries,
        playerMap: logPlayerMap,
        themeId,
        rootClassName: "w-full",
        panelClassName:
          "flex h-[286px] flex-col overflow-hidden bg-transparent select-text",
        headerClassName: desktopSideTabPanelHeaderClassName,
      }),
    renderMobile: () =>
      React.createElement(GameLogPanel, {
        entries,
        playerMap: logPlayerMap,
        themeId,
        rootClassName: "w-full",
        panelClassName: mobileDrawerPanelClassName,
      }),
  },
  {
    id: "chat",
    attachment: "top",
    shortLabel: "Chat",
    label: "Chat",
    ariaLabel: "Open chat panel",
    icon: React.createElement(ChatIcon),
    height: 230,
    renderDesktop: () =>
      React.createElement(ChatPanel, {
        playerID,
        playerMap: logPlayerMap,
        themeId,
        chatMessages: bgioProps?.chatMessages ?? [],
        sendChatMessage: bgioProps?.sendChatMessage,
        panelClassName:
          "flex h-[230px] flex-col overflow-hidden bg-transparent select-text",
        headerClassName: desktopSideTabPanelHeaderClassName,
      }),
    renderMobile: () =>
      React.createElement(ChatPanel, {
        playerID,
        playerMap: logPlayerMap,
        themeId,
        chatMessages: bgioProps?.chatMessages ?? [],
        sendChatMessage: bgioProps?.sendChatMessage,
        panelClassName: mobileDrawerPanelClassName,
      }),
  },
];

function DesktopSideTabRow({
  panel,
  panelWidth,
  isOpen,
  nextIsOpen,
  onToggle,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onResizePointerCancel,
}) {
  const layout = getSideTabLayoutMetrics({
    panelHeight: panel.height,
    attachment: panel.attachment,
  });
  const nextLayout = nextIsOpen
    ? getSideTabLayoutMetrics({
        panelHeight: panel.nextHeight ?? panel.height,
        attachment: panel.nextAttachment,
      })
    : null;
  const rowHeight = getSideTabRowHeight({
    layout,
    isOpen,
    nextIsOpen,
    nextLayout,
  });
  const motion = useGsapDockMotion({ isOpen, height: rowHeight });
  const progress = motion.progress;
  const panelHeight = panel.height;
  const currentButtonTop = SIDE_TAB_BUTTON_CLOSED_TOP;
  const shouldRenderOpenChrome = isOpen || progress > 0.001;
  const buttonShellOpacity = 1;
  const shellOpacity = interpolateStops(progress, [0, 0.1, 1], [0, 0.16, 1]);
  const shellTransform = `translate3d(${((1 - progress) * -10).toFixed(
    1
  )}px,0,0)`;
  const shellShadow = `0 18px 34px rgba(15,23,42,${(
    0.04 +
    progress * 0.08
  ).toFixed(3)})`;
  const bodyOpacity = interpolateStops(progress, [0, 0.24, 1], [0, 0, 1]);
  const bodyTransform = `translate3d(${((1 - progress) * -10).toFixed(
    1
  )}px,${((1 - progress) * -10).toFixed(1)}px,0) scale(${(
    0.986 +
    progress * 0.014
  ).toFixed(3)})`;
  const bodyHeight = Math.max(0, panelHeight * progress);

  return React.createElement(
    "div",
    {
      className: "pointer-events-none relative",
      style: { height: motion.height },
      "data-meta-dock-row": panel.id,
      "data-meta-side-tab-attachment": layout.attachment,
    },
    shouldRenderOpenChrome
      ? React.createElement(
          "div",
          {
            className:
              "pointer-events-none absolute z-10 rounded-[18px] bg-white/25 ring-1 ring-white/45 backdrop-blur-sm",
            style: {
              opacity: shellOpacity,
              transform: shellTransform,
              transformOrigin: "left center",
              boxShadow: shellShadow,
              left: `${SIDE_TAB_BUTTON_TAB_LEFT}px`,
              top: `${currentButtonTop}px`,
              width: `${SIDE_TAB_BUTTON_TAB_WIDTH}px`,
              height: `${BUTTON_SIZE}px`,
            },
            "data-meta-side-tab-shell": panel.id,
          }
        )
      : null,
    shouldRenderOpenChrome
      ? React.createElement("div", {
          className:
            "pointer-events-auto absolute z-40 w-4 cursor-ew-resize touch-none",
          style: {
            top: `${layout.panelTop}px`,
            left: `${SIDE_TAB_CARD_LEFT + panelWidth - 8}px`,
            height: `${bodyHeight}px`,
          },
          onPointerDown: onResizePointerDown,
          onPointerMove: onResizePointerMove,
          onPointerUp: onResizePointerUp,
          onPointerCancel: onResizePointerCancel,
          "data-meta-side-tab-resize-handle": panel.id,
          "data-allow-interaction": "true",
          "aria-hidden": "true",
        })
      : null,
    React.createElement("div", {
      className:
        "pointer-events-none absolute left-0 top-0 z-20 h-[72px] w-[72px] rounded-[18px] bg-white/25 ring-1 ring-white/45 backdrop-blur-sm",
      style: {
        opacity: buttonShellOpacity,
        top: `${currentButtonTop}px`,
        transformOrigin: "center center",
      },
      "data-meta-side-tab-button-shell": panel.id,
      "data-meta-dock-button-shell": panel.id,
    }),
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => onToggle(panel.id),
        "aria-expanded": isOpen ? "true" : "false",
        "aria-controls": `desktop-meta-panel-${panel.id}`,
        "aria-label": panel.ariaLabel,
        title: panel.label,
        className:
          "pointer-events-auto absolute left-0 z-40 flex h-[72px] w-[72px] items-center justify-center rounded-[18px] bg-transparent focus:outline-none",
        style: {
          top: `${currentButtonTop}px`,
        },
        "data-meta-sidebar-button": panel.id,
        "data-allow-interaction": "true",
      },
      React.cloneElement(panel.icon, {
        className: desktopButtonIconClassName,
      }),
      React.createElement("span", { className: "sr-only" }, panel.label)
    ),
    shouldRenderOpenChrome
      ? React.createElement(
          "div",
          {
            id: `desktop-meta-panel-${panel.id}`,
            className:
              "pointer-events-auto absolute z-30 overflow-hidden will-change-transform",
            style: {
              opacity: bodyOpacity,
              transform: bodyTransform,
              height: bodyHeight,
              borderRadius: `${SIDE_TAB_PANEL_RADIUS}px`,
              left: `${SIDE_TAB_CARD_LEFT}px`,
              top: `${layout.panelTop}px`,
              width: `${panelWidth}px`,
              background: "rgba(191,219,254,0.88)",
              border: "1.3px solid rgba(255,255,255,0.45)",
              boxShadow: `0 18px 34px rgba(15,23,42,${(
                0.04 +
                progress * 0.08
              ).toFixed(3)})`,
            },
            "data-meta-dock-panel": panel.id,
            "data-meta-side-tab-panel": panel.id,
            "data-meta-side-tab-attachment": layout.attachment,
            "data-allow-interaction": "true",
          },
          panel.renderDesktop()
        )
      : null
  );
}

const DesktopMetaDockComponent = ({
  entries = [],
  logPlayerMap = {},
  themeId,
  playerID,
  bgioProps,
  initialOpenPanels = defaultDesktopOpenPanels,
}) => {
  const [desktopPrefs, setDesktopPrefs] = useState(() =>
    readLeftMetaRailDesktopPrefs(undefined, {
      initialOpenPanels,
    })
  );
  const desktopPrefsRef = useRef(desktopPrefs);
  const resizeStateRef = useRef(null);
  const openPanels = desktopPrefs.openPanels;
  const panelWidth = desktopPrefs.panelWidth;

  useEffect(() => {
    desktopPrefsRef.current = desktopPrefs;
  }, [desktopPrefs]);

  const getDesktopPrefsOptions = useCallback(
    () => ({
      initialOpenPanels,
      viewportWidth:
        typeof window === "undefined" ? undefined : window.innerWidth,
    }),
    [initialOpenPanels]
  );

  const updateDesktopPrefs = useCallback(
    (updater, { persist = true } = {}) => {
      setDesktopPrefs((currentPrefs) => {
        const nextPrefsValue =
          typeof updater === "function" ? updater(currentPrefs) : updater;
        const normalized = normalizeLeftMetaRailDesktopPrefs(
          nextPrefsValue,
          getDesktopPrefsOptions()
        );

        desktopPrefsRef.current = normalized;

        if (persist) {
          writeLeftMetaRailDesktopPrefs(
            undefined,
            normalized,
            getDesktopPrefsOptions()
          );
        }

        return normalized;
      });
    },
    [getDesktopPrefsOptions]
  );

  const collapseAllPanels = useCallback(() => {
    updateDesktopPrefs((currentPrefs) => ({
      ...currentPrefs,
      openPanels: [],
    }));
  }, [updateDesktopPrefs]);

  useEscapeCollapse(openPanels.length > 0, collapseAllPanels);

  const handleTogglePanel = useCallback((panelId) => {
    updateDesktopPrefs((currentPrefs) => ({
      ...currentPrefs,
      openPanels: currentPrefs.openPanels.includes(panelId)
        ? currentPrefs.openPanels.filter(
            (currentPanelId) => currentPanelId !== panelId
          )
        : [...currentPrefs.openPanels, panelId],
    }));
  }, [updateDesktopPrefs]);

  const restoreResizeBodyStyles = useCallback(() => {
    const resizeState = resizeStateRef.current;
    if (!resizeState || typeof document === "undefined") return;
    document.body.style.cursor = resizeState.previousCursor;
    document.body.style.userSelect = resizeState.previousUserSelect;
  }, []);

  const handleResizePointerDown = useCallback((event) => {
    if (event.button != null && event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    resizeStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: desktopPrefsRef.current.panelWidth,
      previousCursor:
        typeof document === "undefined" ? "" : document.body.style.cursor,
      previousUserSelect:
        typeof document === "undefined" ? "" : document.body.style.userSelect,
    };

    if (typeof document !== "undefined") {
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
    }
  }, []);

  const handleResizePointerMove = useCallback(
    (event) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;

      const nextWidth = clampLeftMetaRailDesktopPanelWidth(
        resizeState.startWidth + (event.clientX - resizeState.startX),
        getDesktopPrefsOptions()
      );

      updateDesktopPrefs(
        (currentPrefs) =>
          currentPrefs.panelWidth === nextWidth
            ? currentPrefs
            : {
                ...currentPrefs,
                panelWidth: nextWidth,
              },
        { persist: false }
      );
    },
    [getDesktopPrefsOptions, updateDesktopPrefs]
  );

  const finishResizeInteraction = useCallback(
    (event) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;

      event.currentTarget.releasePointerCapture?.(event.pointerId);
      restoreResizeBodyStyles();
      resizeStateRef.current = null;
      updateDesktopPrefs((currentPrefs) => currentPrefs);
    },
    [restoreResizeBodyStyles, updateDesktopPrefs]
  );

  useEffect(
    () => () => {
      restoreResizeBodyStyles();
      resizeStateRef.current = null;
    },
    [restoreResizeBodyStyles]
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleWindowResize = () => {
      const clampedWidth = clampLeftMetaRailDesktopPanelWidth(
        desktopPrefsRef.current.panelWidth,
        getDesktopPrefsOptions()
      );

      if (clampedWidth === desktopPrefsRef.current.panelWidth) return;

      updateDesktopPrefs((currentPrefs) => ({
        ...currentPrefs,
        panelWidth: clampedWidth,
      }));
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, [getDesktopPrefsOptions, updateDesktopPrefs]);

  const panels = useMemo(
    () =>
      buildMetaPanels({
        entries,
        logPlayerMap,
        themeId,
        playerID,
        bgioProps,
      }),
    [entries, logPlayerMap, themeId, playerID, bgioProps]
  );
  const desktopDockWidth = getDesktopDockWidth(panelWidth);

  return React.createElement(
    "div",
    {
      className:
        "pointer-events-none fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block",
      style: { width: `${desktopDockWidth}px` },
      "data-meta-dock-desktop": "true",
    },
    React.createElement(
      "div",
      {
        className:
          "pointer-events-none overflow-x-visible overflow-y-visible pr-2",
      },
      React.createElement(
        "div",
        { className: "pointer-events-none relative" },
        React.createElement("div", {
          className:
            "pointer-events-none absolute left-3 top-6 bottom-0 z-0 w-[84px] rounded-[28px] bg-slate-950/14 ring-1 ring-white/8 backdrop-blur-sm",
        }),
        React.createElement(
          "div",
          {
            className:
              "pointer-events-none relative z-10 flex flex-col gap-0 px-3 pt-[52px]",
          },
          panels.map((panel, index) => {
            const isOpen = openPanels.includes(panel.id);
            const nextPanel = panels[index + 1];
            const nextIsOpen = nextPanel
              ? openPanels.includes(nextPanel.id)
              : false;

            return React.createElement(DesktopSideTabRow, {
              key: panel.id,
              panel: {
                ...panel,
                nextHeight: nextPanel?.height,
                nextAttachment: nextPanel?.attachment,
              },
              panelWidth,
              isOpen,
              nextIsOpen,
              onToggle: handleTogglePanel,
              onResizePointerDown: handleResizePointerDown,
              onResizePointerMove: handleResizePointerMove,
              onResizePointerUp: finishResizeInteraction,
              onResizePointerCancel: finishResizeInteraction,
            });
          })
        )
      )
    )
  );
};

const MobileMetaRailComponent = ({
  entries = [],
  logPlayerMap = {},
  themeId,
  playerID,
  bgioProps,
  initialActivePanel = null,
}) => {
  const [activePanel, setActivePanel] = useState(() =>
    normalizePanelId(initialActivePanel)
  );

  useEffect(() => {
    setActivePanel(normalizePanelId(initialActivePanel));
  }, [initialActivePanel]);

  const clearActivePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  useEscapeCollapse(Boolean(activePanel), clearActivePanel);

  const handleTogglePanel = useCallback((panelId) => {
    setActivePanel((currentPanel) => (currentPanel === panelId ? null : panelId));
  }, []);

  const panels = useMemo(
    () =>
      buildMetaPanels({
        entries,
        logPlayerMap,
        themeId,
        playerID,
        bgioProps,
      }),
    [entries, logPlayerMap, themeId, playerID, bgioProps]
  );

  const selectedPanel = panels.find((panel) => panel.id === activePanel) ?? null;

  return React.createElement(
    "div",
    {
      className:
        "fixed left-3 top-16 bottom-32 z-30 flex items-end gap-3 pointer-events-none sm:left-4 sm:top-20 sm:bottom-6 lg:hidden",
    },
    React.createElement(
      "div",
      {
        className: mobileRailWrapperClassName,
        "data-meta-mobile-rail": "true",
        "data-allow-interaction": "true",
      },
      panels.map((panel) =>
        React.createElement(MobileDockButton, {
          key: panel.id,
          panel,
          isOpen: selectedPanel?.id === panel.id,
          onToggle: handleTogglePanel,
          panelId: `mobile-meta-panel-${panel.id}`,
        })
      )
    ),
    selectedPanel
      ? React.createElement(
          "div",
          {
            id: `mobile-meta-panel-${selectedPanel.id}`,
            className: mobileDrawerShellClassName,
            "data-meta-mobile-panel": selectedPanel.id,
            "data-allow-interaction": "true",
          },
          selectedPanel.renderMobile()
        )
      : null
  );
};

export const DesktopMetaDock = React.memo(DesktopMetaDockComponent);
DesktopMetaDock.displayName = "DesktopMetaDock";

export const MobileMetaRail = React.memo(MobileMetaRailComponent);
MobileMetaRail.displayName = "MobileMetaRail";

const LeftMetaRailComponent = (props) =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement(DesktopMetaDock, props),
    React.createElement(MobileMetaRail, props)
  );

export const LeftMetaRail = React.memo(LeftMetaRailComponent);
LeftMetaRail.displayName = "LeftMetaRail";

