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
  scrollFeedPanelRowIntoView,
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
  footerClassName = "settlex-ui-feed-footer px-ui-3 py-ui-3",
  autoScrollKey = rows.length,
  resumeAutoScrollKey = null,
  autoScrollIdleMs,
  rootClassName = "fixed left-ui-4 bottom-ui-4 w-72 md:w-80 z-30 pointer-events-auto",
  panelClassName = "settlex-ui-hud flex h-[20vh] flex-col select-text overflow-hidden",
  headerClassName = "settlex-ui-feed-header px-ui-4 py-ui-2 type-action-small text-ink-secondary",
  contentWrapClassName = "min-h-0 flex-1 pb-ui-4",
  scrollViewportClassName = "h-full overflow-y-auto px-ui-4",
  scrollClassName = "feed-panel-scroll",
  fadeClassName = "feed-panel-fade",
  entryClassName = "feed-panel-entry",
  contentClassName = "space-y-ui-2 type-body-small pt-ui-2",
  trackPanelInteraction = false,
  activeRowKey = null,
}) => {
  const scrollRef = useRef(null);
  const rowRefs = useRef(new Map());
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

  useEffect(() => {
    if (activeRowKey == null) return;
    scrollFeedPanelRowIntoView(rowRefs.current.get(String(activeRowKey)));
  }, [activeRowKey]);

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
                rows.map((row, index) => {
                  const rowKey = String(row?.key ?? row?.id ?? index);
                  return React.createElement(
                    "div",
                    {
                      key: rowKey,
                      ref: (node) => {
                        if (node) rowRefs.current.set(rowKey, node);
                        else rowRefs.current.delete(rowKey);
                      },
                      className: entryClassName,
                      "data-feed-row-active":
                        String(activeRowKey) === rowKey ? "true" : undefined,
                    },
                    renderRow ? renderRow(row, index) : row
                  );
                })
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
