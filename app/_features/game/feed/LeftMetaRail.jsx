import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GameLogPanel } from "./GameLogPanel";
import { ChatPanel } from "./ChatPanel";
import { Tooltip } from "../../../ui/Tooltip";
import {
  META_PANEL_FRAME_CLASS_NAME,
} from "./metaPanelChrome";
import {
  normalizeLeftMetaRailDesktopPrefs,
  readLeftMetaRailDesktopPrefs,
  writeLeftMetaRailDesktopPrefs,
} from "./leftMetaRailPreferences";

let mobileMetaDrawerPromise;
const loadMobileMetaDrawer = () =>
  (mobileMetaDrawerPromise ??= import("./MobileMetaDrawer"));
const LazyMobileMetaDrawer = React.lazy(() =>
  loadMobileMetaDrawer().then((module) => ({
    default: module.MobileMetaDrawer,
  }))
);

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const panelIds = new Set(["log", "chat"]);
const defaultDesktopOpenPanels = ["log", "chat"];
export const LEFT_META_RAIL_DESKTOP_WIDTH_PX = 0;

const mobileButtonIconClassName = "h-6 w-6 drop-shadow-[0_1px_0_rgba(255,255,255,0.22)]";
const desktopButtonIconClassName = "h-6 w-6 shrink-0";
const desktopFeedLaneClassName =
  "pointer-events-auto w-[min(clamp(18rem,20vw,25rem),calc(100vw-2rem))]";
const desktopFeedLogOpenHeight = "clamp(15rem,38vh,23rem)";
const desktopFeedChatOpenHeight = "clamp(13rem,34vh,20rem)";
const desktopFeedCollapsedHeight = "3.5rem";
const desktopFeedStackGap = "0.5rem";

const desktopFeedPanelClassName =
  "flex h-full min-h-0 flex-col overflow-hidden bg-transparent select-text";
const desktopFeedHeaderClassName = "sr-only";
const mobileFeedContentPanelClassName =
  "flex h-full min-h-0 flex-col overflow-hidden bg-transparent select-text";

const normalizePanelId = (panelId) =>
  typeof panelId === "string" && panelIds.has(panelId) ? panelId : null;

const LogIcon = ({ className = mobileButtonIconClassName } = {}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M8 7h9" />
    <path d="M8 12h9" />
    <path d="M8 17h9" />
    <circle cx="5" cy="7" r="1" />
    <circle cx="5" cy="12" r="1" />
    <circle cx="5" cy="17" r="1" />
  </svg>
);

const ChatIcon = ({ className = mobileButtonIconClassName } = {}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6.5 7.5h11a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H11l-4.5 3v-3H6.5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" />
  </svg>
);

const EMPTY_CHAT_MESSAGES = [];

const buildMetaPanels = ({
  entries,
  boardTiles,
  phase,
  activeEntryKey,
  onEntrySelect,
  logArrivalMode,
  logPlayerMap,
  themeId,
  playerID,
  chatMessages,
  sendChatMessage,
}) => [
  {
    id: "log",
    side: "left",
    shortLabel: "Log",
    label: "Game Log",
    ariaLabel: "Toggle game log panel",
    icon: <LogIcon />,
    defaultOpenDesktop: true,
    renderDesktop: () => (
      <GameLogPanel
        arrivalMode={logArrivalMode}
        entries={entries}
        boardTiles={boardTiles}
        phase={phase}
        activeEntryKey={activeEntryKey}
        onEntrySelect={onEntrySelect}
        playerMap={logPlayerMap}
        themeId={themeId}
        rootClassName="h-full w-full"
        panelClassName={desktopFeedPanelClassName}
        headerClassName={desktopFeedHeaderClassName}
      />
    ),
    renderMobile: () => (
      <GameLogPanel
        arrivalMode={logArrivalMode}
        entries={entries}
        boardTiles={boardTiles}
        phase={phase}
        activeEntryKey={activeEntryKey}
        onEntrySelect={onEntrySelect}
        playerMap={logPlayerMap}
        themeId={themeId}
        rootClassName="h-full w-full"
        panelClassName={mobileFeedContentPanelClassName}
        headerClassName="sr-only"
      />
    ),
  },
  {
    id: "chat",
    side: "left",
    shortLabel: "Chat",
    label: "Chat",
    ariaLabel: "Toggle chat panel",
    icon: <ChatIcon />,
    defaultOpenDesktop: true,
    renderDesktop: () => (
      <ChatPanel
        arrivalMode={logArrivalMode}
        playerID={playerID}
        playerMap={logPlayerMap}
        themeId={themeId}
        chatMessages={chatMessages}
        sendChatMessage={sendChatMessage}
        rootClassName="h-full w-full"
        panelClassName={desktopFeedPanelClassName}
        headerClassName={desktopFeedHeaderClassName}
      />
    ),
    renderMobile: () => (
      <ChatPanel
        arrivalMode={logArrivalMode}
        playerID={playerID}
        playerMap={logPlayerMap}
        themeId={themeId}
        chatMessages={chatMessages}
        sendChatMessage={sendChatMessage}
        rootClassName="h-full w-full"
        panelClassName={mobileFeedContentPanelClassName}
        headerClassName="sr-only"
      />
    ),
  },
];

function DesktopFeedFrame({ panel, isOpen, onMinimize, onRestore }) {
  return (
    <section
      className="settlehex-ui-feed-frame pointer-events-auto relative h-full settlehex-ui-motion-layout"
      style={{ width: isOpen ? "100%" : desktopFeedCollapsedHeight }}
      aria-label={panel.label}
      data-meta-feed-frame={panel.id}
      data-meta-feed-frame-state={isOpen ? "open" : "minimized"}
      data-allow-interaction="true"
    >
      <div className={META_PANEL_FRAME_CLASS_NAME}>
        <Tooltip label={isOpen ? `Minimize ${panel.label}` : panel.label} side="right">
          <button
            type="button"
            className={joinClassNames("settlehex-ui-feed-toggle settlehex-ui-feed-minimize settlehex-ui-focus relative z-10 text-ink-secondary", isOpen && "settlehex-ui-feed-header")}
            aria-label={isOpen ? `Minimize ${panel.label}` : panel.label}
            aria-expanded={isOpen}
            aria-controls={`desktop-meta-panel-${panel.id}`}
            data-meta-feed-toggle={panel.id}
            data-meta-feed-minimize={isOpen ? panel.id : undefined}
            data-meta-sidebar-button={!isOpen ? panel.id : undefined}
            onClick={() => isOpen ? onMinimize(panel.id) : onRestore(panel.id)}
          >
            {React.cloneElement(panel.icon, { className: desktopButtonIconClassName })}
            <span className="settlehex-ui-feed-toggle-label truncate type-action-small">{panel.label}</span>
          </button>
        </Tooltip>
        <div
          id={`desktop-meta-panel-${panel.id}`}
          className="settlehex-ui-motion-presence relative z-10 min-h-0 flex-1"
          data-open={String(isOpen)}
          data-meta-feed-panel={panel.id}
          inert={isOpen ? undefined : true}
          aria-hidden={isOpen ? undefined : true}
        >
          {panel.renderDesktop()}
        </div>
      </div>
    </section>
  );
}

const DesktopMetaDockComponent = ({
  entries = [],
  activeEntryKey = null,
  onEntrySelect,
  logArrivalMode,
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

  const chatMessages = bgioProps?.chatMessages ?? EMPTY_CHAT_MESSAGES;
  const sendChatMessage = bgioProps?.sendChatMessage;
  const panels = useMemo(
    () =>
      buildMetaPanels({
        entries,
        boardTiles: bgioProps?.G?.tiles,
        phase: bgioProps?.ctx?.phase,
        activeEntryKey,
        onEntrySelect,
        logArrivalMode,
        logPlayerMap,
        themeId,
        playerID,
        chatMessages,
        sendChatMessage,
      }),
    [
      entries,
      bgioProps?.G?.tiles,
      bgioProps?.ctx?.phase,
      activeEntryKey,
      onEntrySelect,
      logArrivalMode,
      logPlayerMap,
      themeId,
      playerID,
      chatMessages,
      sendChatMessage,
    ]
  );
  const logPanel = panels.find((panel) => panel.id === "log") ?? panels[0];
  const chatPanel = panels.find((panel) => panel.id === "chat") ?? panels[1];
  const isLogOpenBodyPhase = openPanels.includes("log");
  const currentLogHeight = isLogOpenBodyPhase
    ? desktopFeedLogOpenHeight
    : desktopFeedCollapsedHeight;
  const currentLogTop = isLogOpenBodyPhase
    ? `calc(${desktopFeedCollapsedHeight} - ${desktopFeedLogOpenHeight})`
    : "0px";
  const isChatOpenBodyPhase = openPanels.includes("chat");
  const currentChatHeight = isChatOpenBodyPhase
    ? desktopFeedChatOpenHeight
    : desktopFeedCollapsedHeight;
  const stackHeight = `min(calc(100vh - 12rem), calc(${desktopFeedCollapsedHeight} + ${desktopFeedStackGap} + ${currentChatHeight}))`;
  return (
    <div
      className="pointer-events-none fixed left-4 top-1/2 z-30 hidden lg:block"
      data-meta-left-rail-shell="true"
    >
      <section
        className={joinClassNames(desktopFeedLaneClassName, "relative")}
        style={{ height: stackHeight }}
        aria-label="Game feed"
        data-meta-feed-dock="true"
        data-allow-interaction="true"
      >
        {[
          {
            panel: logPanel,
            top: currentLogTop,
            height: currentLogHeight,
            transform: "translateY(0px)",
          },
          {
            panel: chatPanel,
            top: `calc(${desktopFeedCollapsedHeight} + ${desktopFeedStackGap})`,
            height: currentChatHeight,
            transform: "translateY(0px)",
          },
        ].map(({ panel, top, height, transform }) => (
          <div
            key={panel.id}
            className="absolute inset-x-0 settlehex-ui-motion-layout"
            style={{ top, height, transform }}
          >
            <DesktopFeedFrame
              panel={panel}
              isOpen={openPanels.includes(panel.id)}
              onMinimize={minimizePanel}
              onRestore={restorePanel}
            />
          </div>
        ))}
      </section>
    </div>
  );
};

const MobileMetaRailComponent = ({
  entries = [],
  activeEntryKey = null,
  onEntrySelect,
  logArrivalMode,
  logPlayerMap = {},
  themeId,
  playerID,
  bgioProps,
  mobileActivePanel,
  onMobileActivePanelChange,
  initialActivePanel = null,
  isPhoneLayout = false,
}) => {
  const isControlled = mobileActivePanel !== undefined;
  const [uncontrolledActivePanel, setUncontrolledActivePanel] = useState(() =>
    normalizePanelId(initialActivePanel)
  );
  const [isDrawerReady, setIsDrawerReady] = useState(false);

  useEffect(() => {
    if (isControlled) return;
    setUncontrolledActivePanel(normalizePanelId(initialActivePanel));
  }, [initialActivePanel, isControlled]);

  useEffect(() => {
    if (!isPhoneLayout) {
      setIsDrawerReady(false);
      return undefined;
    }

    let cancelled = false;
    const preloadDrawer = () => {
      void loadMobileMetaDrawer()
        .then(() => {
          if (!cancelled) setIsDrawerReady(true);
        })
        .catch(() => {});
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(preloadDrawer, {
        timeout: 2000,
      });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleCallbackId);
      };
    }

    const timeoutId = window.setTimeout(preloadDrawer, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isPhoneLayout]);

  const activePanel = isControlled
    ? normalizePanelId(mobileActivePanel)
    : uncontrolledActivePanel;

  const setActivePanel = useCallback(
    (panelId) => {
      const normalizedPanelId = normalizePanelId(panelId);
      if (typeof onMobileActivePanelChange === "function") {
        onMobileActivePanelChange(normalizedPanelId);
        return;
      }
      setUncontrolledActivePanel(normalizedPanelId);
    },
    [onMobileActivePanelChange]
  );

  const chatMessages = bgioProps?.chatMessages ?? EMPTY_CHAT_MESSAGES;
  const sendChatMessage = bgioProps?.sendChatMessage;
  const panels = useMemo(
    () =>
      buildMetaPanels({
        entries,
        boardTiles: bgioProps?.G?.tiles,
        phase: bgioProps?.ctx?.phase,
        activeEntryKey,
        onEntrySelect,
        logArrivalMode,
        logPlayerMap,
        themeId,
        playerID,
        chatMessages,
        sendChatMessage,
      }),
    [
      entries,
      bgioProps?.G?.tiles,
      bgioProps?.ctx?.phase,
      activeEntryKey,
      onEntrySelect,
      logArrivalMode,
      logPlayerMap,
      themeId,
      playerID,
      chatMessages,
      sendChatMessage,
    ]
  );

  if (!isPhoneLayout || (!isDrawerReady && !activePanel)) return null;

  return (
    <React.Suspense
      fallback={null}
    >
      <LazyMobileMetaDrawer
        activePanel={activePanel}
        panels={panels}
        onActivePanelChange={setActivePanel}
      />
    </React.Suspense>
  );
};

export const DesktopMetaDock = React.memo(DesktopMetaDockComponent);
DesktopMetaDock.displayName = "DesktopMetaDock";

export const MobileMetaRail = React.memo(MobileMetaRailComponent);
MobileMetaRail.displayName = "MobileMetaRail";

const LeftMetaRailComponent = (props) => (
  <>
    <DesktopMetaDock {...props} />
    <MobileMetaRail {...props} />
  </>
);

export const LeftMetaRail = React.memo(LeftMetaRailComponent);
LeftMetaRail.displayName = "LeftMetaRail";
