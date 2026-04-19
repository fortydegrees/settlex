import React, { useEffect, useRef } from "react";
import {
  cleanupFeedPanelScrollState,
  createFeedPanelScrollState,
  forceFeedPanelAutoScroll,
  handleFeedPanelBlur,
  handleFeedPanelFocus,
  handleFeedPanelMouseEnter,
  handleFeedPanelMouseLeave,
  markFeedPanelManualScroll,
  runFeedPanelAutoScrollIfNeeded,
} from "./FeedPanelScrollState";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");
const readPrefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const FeedPanelComponent = ({
  title = "Feed",
  rows = [],
  renderRow,
  footer = null,
  footerClassName = "border-t border-white/35 bg-white/35 px-3 py-3",
  autoScrollKey = rows.length,
  resumeAutoScrollKey = null,
  autoScrollIdleMs,
  rootClassName = "fixed left-4 bottom-4 w-72 md:w-80 z-30 pointer-events-auto",
  panelClassName = "flex h-[20vh] flex-col rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text overflow-hidden",
  headerClassName = "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700",
  contentWrapClassName = "min-h-0 flex-1 pb-4",
  scrollViewportClassName = "h-full overflow-y-auto px-4",
  scrollClassName = "feed-panel-scroll",
  fadeClassName = "feed-panel-fade",
  entryClassName = "feed-panel-entry",
  contentClassName = "space-y-2 text-sm pt-2",
  trackPanelInteraction = false,
}) => {
  const scrollRef = useRef(null);
  const stateRef = useRef(null);
  const hasMountedAutoScrollRef = useRef(false);
  if (!stateRef.current) {
    stateRef.current = createFeedPanelScrollState();
  }
  const forceScrollToBottom = ({ behavior = "smooth" } = {}) => {
    if (!scrollRef.current) return;
    forceFeedPanelAutoScroll(stateRef.current, scrollRef.current, {
      behavior,
      prefersReducedMotion: readPrefersReducedMotion(),
      requestAnimationFrameFn: requestAnimationFrame,
    });
  };

  useEffect(() => {
    if (!scrollRef.current) return;
    runFeedPanelAutoScrollIfNeeded(stateRef.current, scrollRef.current, {
      behavior: hasMountedAutoScrollRef.current ? "smooth" : "auto",
      prefersReducedMotion: readPrefersReducedMotion(),
      requestAnimationFrameFn: requestAnimationFrame,
    });
    hasMountedAutoScrollRef.current = true;
  }, [autoScrollKey]);

  useEffect(() => {
    if (resumeAutoScrollKey == null || !scrollRef.current) return;
    forceScrollToBottom();
  }, [resumeAutoScrollKey]);

  useEffect(
    () => () => {
      cleanupFeedPanelScrollState(stateRef.current);
    },
    []
  );

  const hasRows = rows.length > 0;
  const idleTimerConfig =
    autoScrollIdleMs == null
      ? undefined
      : {
          idleMs: autoScrollIdleMs,
          onIdleResume: forceScrollToBottom,
        };
  const panelInteractionProps = trackPanelInteraction
    ? {
        onMouseEnter: () => handleFeedPanelMouseEnter(stateRef.current),
        onMouseLeave: () =>
          handleFeedPanelMouseLeave(stateRef.current, idleTimerConfig),
        onFocusCapture: () => handleFeedPanelFocus(stateRef.current),
        onBlurCapture: () =>
          handleFeedPanelBlur(stateRef.current, idleTimerConfig),
      }
    : null;
  const viewportInteractionProps = trackPanelInteraction
    ? null
    : {
        onMouseEnter: () => handleFeedPanelMouseEnter(stateRef.current),
        onMouseLeave: () =>
          handleFeedPanelMouseLeave(stateRef.current, idleTimerConfig),
      };

  return React.createElement(
    "div",
    {
      className: rootClassName,
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      { className: panelClassName, ...panelInteractionProps },
      React.createElement(
        "div",
        { className: joinClassNames(headerClassName, "select-none") },
        title
      ),
      React.createElement(
        "div",
        { className: contentWrapClassName },
        React.createElement(
          "div",
          {
            ref: scrollRef,
            className: joinClassNames(
              scrollClassName,
              fadeClassName,
              scrollViewportClassName
            ),
            onWheel: () => markFeedPanelManualScroll(stateRef.current),
            onTouchMove: () => markFeedPanelManualScroll(stateRef.current),
            ...viewportInteractionProps,
          },
          hasRows
            ? React.createElement(
                "div",
                { className: contentClassName },
                rows.map((row, index) =>
                  React.createElement(
                    "div",
                    {
                      key: row?.key ?? row?.id ?? index,
                      className: entryClassName,
                    },
                    renderRow ? renderRow(row, index) : row
                  )
                )
              )
            : null
        )
      ),
      footer
        ? React.createElement(
            "div",
            { className: footerClassName },
            footer
          )
        : null
    )
  );
};

export const FeedPanel = React.memo(FeedPanelComponent);
FeedPanel.displayName = "FeedPanel";
