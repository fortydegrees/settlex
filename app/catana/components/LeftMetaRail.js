import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameLogPanel } from "./GameLogPanel";
import { ChatPanel } from "./ChatPanel";
import {
  normalizeLeftMetaRailDesktopPrefs,
  readLeftMetaRailDesktopPrefs,
  writeLeftMetaRailDesktopPrefs,
} from "../utils/leftMetaRailPreferences";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const panelIds = new Set(["log", "chat"]);
const defaultDesktopOpenPanels = ["log", "chat"];
export const LEFT_META_RAIL_DESKTOP_WIDTH_PX = 0;

const mobileButtonBaseClassName =
  "flex h-14 w-14 items-center justify-center rounded-[1.45rem] border transition-colors focus:outline-none focus:ring-2 focus:ring-white/80";
const mobileButtonActiveClassName =
  "border-transparent bg-transparent text-slate-700 shadow-none ring-0";
const mobileButtonIdleClassName =
  "border-white/30 bg-white/18 text-slate-700 shadow-md hover:bg-white/28";
const mobileButtonIconClassName = "h-5 w-5";
const desktopButtonIconClassName = "h-6 w-6 shrink-0";
const desktopFeedLaneClassName =
  "pointer-events-auto w-[min(25rem,calc(100vw-2rem))]";
const desktopFeedOpenSizeClassName = "h-[clamp(14rem,36vh,20rem)] w-full";
const desktopFeedCollapsedSizeClassName = "h-14 w-14";
const desktopFeedHeaderSizeClassName = "h-14 w-full";
const desktopFeedSlotClassName =
  "relative transition-[width,height,opacity,transform,border-radius] [will-change:width,height,opacity,transform] motion-reduce:transition-none";
const desktopFeedFrameClassName = joinClassNames(
  "relative flex h-full flex-col overflow-hidden rounded-[1.15rem] border border-white/[0.55] shadow-[0_22px_58px_-36px_rgba(15,23,42,0.62),inset_0_1px_0_rgba(255,255,255,0.48)] ring-1 ring-white/40 select-none"
);
const desktopFeedGlassLayerStyle = {
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.36), rgba(239,246,255,0.24)), linear-gradient(90deg, rgba(255,255,255,0.2), rgba(191,219,254,0.14), rgba(147,197,253,0.1))",
  backdropFilter: "blur(24px) saturate(1.18)",
  WebkitBackdropFilter: "blur(24px) saturate(1.18)",
};
const desktopFeedPanelClassName =
  "flex h-full min-h-0 flex-col overflow-hidden bg-transparent select-text";
const desktopFeedHeaderClassName = "sr-only";
const mobileRailWrapperClassName =
  "pointer-events-auto flex flex-col gap-2 rounded-[1.4rem] bg-white/24 p-1.5 shadow-2xl ring-1 ring-white/35 backdrop-blur-md";
const mobileDrawerShellClassName =
  "pointer-events-auto w-[min(22rem,calc(100vw-5.75rem))] max-w-[22rem] transition-all duration-200 ease-out";
const mobileDrawerPanelClassName =
  "flex h-[42vh] min-h-[11rem] max-h-[24rem] flex-col overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text";
const desktopFeedWidthStageMs = 210;
const desktopFeedBodyStageMs = 190;

const normalizePanelId = (panelId) =>
  typeof panelId === "string" && panelIds.has(panelId) ? panelId : null;

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
    side: "left",
    shortLabel: "Log",
    label: "Game Log",
    ariaLabel: "Toggle game log panel",
    icon: React.createElement(LogIcon),
    defaultOpenDesktop: true,
    renderDesktop: () =>
      React.createElement(GameLogPanel, {
        entries,
        playerMap: logPlayerMap,
        themeId,
        rootClassName: "h-full w-full",
        panelClassName: desktopFeedPanelClassName,
        headerClassName: desktopFeedHeaderClassName,
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
    side: "left",
    shortLabel: "Chat",
    label: "Chat",
    ariaLabel: "Toggle chat panel",
    icon: React.createElement(ChatIcon),
    defaultOpenDesktop: true,
    renderDesktop: () =>
      React.createElement(ChatPanel, {
        playerID,
        playerMap: logPlayerMap,
        themeId,
        chatMessages: bgioProps?.chatMessages ?? [],
        sendChatMessage: bgioProps?.sendChatMessage,
        rootClassName: "h-full w-full",
        panelClassName: desktopFeedPanelClassName,
        headerClassName: desktopFeedHeaderClassName,
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

const getDesktopFeedSlotSizeClassName = (phase) => {
  if (phase === "open" || phase === "opening-body") {
    return desktopFeedOpenSizeClassName;
  }

  if (phase === "opening-width" || phase === "closing-body") {
    return desktopFeedHeaderSizeClassName;
  }

  return desktopFeedCollapsedSizeClassName;
};

const getDesktopFeedSlotMotionClassName = (phase) => {
  if (phase === "closing-body") {
    return "duration-[170ms] ease-[cubic-bezier(0.4,0,1,1)]";
  }

  if (phase === "closing-width") {
    return "duration-[190ms] ease-[cubic-bezier(0.4,0,0.2,1)]";
  }

  return "duration-[210ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]";
};

function DesktopFeedFrame({ panel, isOpen, onMinimize, onRestore }) {
  const [phase, setPhase] = useState(() => (isOpen ? "open" : "closed"));
  const hasMountedRef = useRef(false);
  const isRestoreButton = phase === "closed";
  const shouldShowPanelBody = phase === "opening-body" || phase === "open";
  const shouldShowHeaderDetails =
    phase === "opening-body" || phase === "open" || phase === "closing-body";
  const handleRestoreKeyDown = useCallback(
    (event) => {
      if (!isRestoreButton) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onRestore(panel.id);
    },
    [isRestoreButton, onRestore, panel.id]
  );
  const handleHeaderKeyDown = useCallback(
    (event) => {
      if (!shouldShowHeaderDetails) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onMinimize(panel.id);
    },
    [onMinimize, panel.id, shouldShowHeaderDetails]
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setPhase(isOpen ? "open" : "closed");
      return undefined;
    }

    const timers = [];

    if (isOpen) {
      setPhase("opening-width");
      timers.push(
        setTimeout(() => setPhase("opening-body"), desktopFeedWidthStageMs)
      );
      timers.push(
        setTimeout(
          () => setPhase("open"),
          desktopFeedWidthStageMs + desktopFeedBodyStageMs
        )
      );
    } else {
      setPhase("closing-body");
      timers.push(
        setTimeout(() => setPhase("closing-width"), desktopFeedBodyStageMs)
      );
      timers.push(
        setTimeout(
          () => setPhase("closed"),
          desktopFeedBodyStageMs + desktopFeedWidthStageMs
        )
      );
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [isOpen]);

  return React.createElement(
    "section",
    {
      className: joinClassNames(
        "group pointer-events-auto",
        desktopFeedSlotClassName,
        getDesktopFeedSlotSizeClassName(phase),
        getDesktopFeedSlotMotionClassName(phase),
        !isRestoreButton
          ? "overflow-hidden rounded-[1.15rem] opacity-100 translate-y-0"
          : "overflow-visible rounded-[1.15rem] opacity-95 translate-y-0.5 cursor-pointer hover:scale-[1.035] hover:opacity-100 active:translate-y-0 active:scale-[0.96] focus:outline-none"
      ),
      role: isRestoreButton ? "button" : undefined,
      tabIndex: isRestoreButton ? 0 : undefined,
      onClick: isRestoreButton ? () => onRestore(panel.id) : undefined,
      onKeyDown: isRestoreButton ? handleRestoreKeyDown : undefined,
      "aria-label": panel.label,
      "aria-expanded": isRestoreButton ? "false" : undefined,
      "aria-controls": isRestoreButton
        ? `desktop-meta-panel-${panel.id}`
        : undefined,
      "data-meta-feed-frame": panel.id,
      "data-meta-feed-frame-state": isOpen ? "open" : "minimized",
      "data-meta-feed-frame-phase": phase,
      "data-meta-feed-toggle": isRestoreButton ? panel.id : undefined,
      "data-meta-sidebar-button": isRestoreButton ? panel.id : undefined,
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      {
        className: joinClassNames(
          desktopFeedFrameClassName,
          "transition-[border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
          isRestoreButton
            ? "group-hover:border-white/70 group-hover:shadow-[0_22px_46px_-28px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.55)] group-hover:ring-white/50 group-active:ring-white/60"
            : null
        ),
      },
      React.createElement("div", {
        className: "pointer-events-none absolute inset-0 rounded-[inherit]",
        style: desktopFeedGlassLayerStyle,
        "aria-hidden": "true",
      }),
      React.createElement("div", {
        className:
          "pointer-events-none absolute inset-0 rounded-[inherit] bg-white/0 transition-colors duration-150 ease-out group-hover:bg-white/[0.08] group-active:bg-white/[0.1] motion-reduce:transition-none",
        "aria-hidden": "true",
      }),
      React.createElement(
        "div",
        {
          className: joinClassNames(
            "relative z-10 flex shrink-0 items-center justify-between gap-3 overflow-hidden pl-4 pr-4 text-slate-700 transition-[height,background-color,border-color] duration-150 ease-out motion-reduce:transition-none",
            shouldShowHeaderDetails ? "h-12" : "h-14",
            shouldShowHeaderDetails
              ? "cursor-pointer border-b border-white/30 bg-white/25 hover:bg-white/40 focus:outline-none active:bg-white/30"
              : "border-b border-transparent bg-transparent"
          ),
          role: shouldShowHeaderDetails ? "button" : undefined,
          tabIndex: shouldShowHeaderDetails ? 0 : undefined,
          onClick: shouldShowHeaderDetails
            ? () => onMinimize(panel.id)
            : undefined,
          onKeyDown: shouldShowHeaderDetails ? handleHeaderKeyDown : undefined,
          "aria-label": shouldShowHeaderDetails
            ? `Minimize ${panel.label}`
            : undefined,
          "data-meta-feed-minimize": shouldShowHeaderDetails
            ? panel.id
            : undefined,
          "data-allow-interaction": shouldShowHeaderDetails
            ? "true"
            : undefined,
        },
        React.createElement(
          "div",
          {
            className: "flex min-w-0 items-center gap-2.5",
          },
          React.cloneElement(panel.icon, {
            className: joinClassNames(
              desktopButtonIconClassName,
              isRestoreButton
                ? "transition duration-150 ease-out group-hover:scale-110"
                : null
            ),
          }),
          React.createElement(
            "span",
            {
              className: joinClassNames(
                "truncate text-sm font-bold text-slate-700 transition-[max-width,opacity,transform] duration-150 ease-out motion-reduce:transition-none",
                shouldShowHeaderDetails
                  ? "max-w-[12rem] translate-x-0 opacity-100"
                  : "max-w-0 -translate-x-1 opacity-0"
              ),
            },
            panel.label
          )
        )
      ),
      React.createElement(
        "div",
        {
          id: `desktop-meta-panel-${panel.id}`,
          className: joinClassNames(
            "relative z-10 min-h-0 flex-1 transition duration-[150ms] ease-out motion-reduce:transition-none",
            shouldShowPanelBody
              ? "translate-y-0 opacity-100 delay-[45ms]"
              : "-translate-y-1 opacity-0 delay-0"
          ),
          "data-meta-feed-panel": panel.id,
        },
        panel.renderDesktop()
      )
    ),
    isRestoreButton
      ? React.createElement(
          "span",
          {
            className:
              "pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 scale-[0.96] whitespace-nowrap rounded-[0.85rem] border border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(219,234,254,0.86))] px-3 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.52)] backdrop-blur-xl transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100 motion-reduce:transition-none",
            "aria-hidden": "true",
            "data-meta-feed-tooltip": panel.id,
          },
          panel.label
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
  const openPanels = desktopPrefs.openPanels;

  const updateDesktopPrefs = useCallback(
    (updater) => {
      setDesktopPrefs((currentPrefs) => {
        const nextPrefsValue =
          typeof updater === "function" ? updater(currentPrefs) : updater;
        const normalized = normalizeLeftMetaRailDesktopPrefs(nextPrefsValue, {
          initialOpenPanels,
        });

        writeLeftMetaRailDesktopPrefs(undefined, normalized, {
          initialOpenPanels,
        });

        return normalized;
      });
    },
    [initialOpenPanels]
  );

  const minimizePanel = useCallback(
    (panelId) => {
      const normalizedPanelId = normalizePanelId(panelId);
      if (!normalizedPanelId) return;

      updateDesktopPrefs((currentPrefs) => ({
        ...currentPrefs,
        openPanels: currentPrefs.openPanels.filter(
          (currentPanelId) => currentPanelId !== normalizedPanelId
        ),
      }));
    },
    [updateDesktopPrefs]
  );

  const restorePanel = useCallback(
    (panelId) => {
      const normalizedPanelId = normalizePanelId(panelId);
      if (!normalizedPanelId) return;

      updateDesktopPrefs((currentPrefs) => ({
        ...currentPrefs,
        openPanels: currentPrefs.openPanels.includes(normalizedPanelId)
          ? currentPrefs.openPanels
          : [...currentPrefs.openPanels, normalizedPanelId],
      }));
    },
    [updateDesktopPrefs]
  );

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

  return React.createElement(
    "div",
    {
      className:
        "pointer-events-none fixed bottom-32 left-4 z-30 hidden lg:block",
      "data-meta-left-rail-shell": "true",
    },
    React.createElement(
      "section",
      {
        className: joinClassNames(desktopFeedLaneClassName, "space-y-2"),
        "aria-label": "Game feed",
        "data-meta-feed-dock": "true",
        "data-allow-interaction": "true",
      },
      panels.map((panel) =>
        React.createElement(DesktopFeedFrame, {
          key: panel.id,
          panel,
          isOpen: openPanels.includes(panel.id),
          onMinimize: minimizePanel,
          onRestore: restorePanel,
        })
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
