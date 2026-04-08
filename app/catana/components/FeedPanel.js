import React, { useEffect, useRef } from "react";
import {
  cleanupFeedPanelScrollState,
  createFeedPanelScrollState,
  handleFeedPanelMouseEnter,
  handleFeedPanelMouseLeave,
  markFeedPanelManualScroll,
  runFeedPanelAutoScrollIfNeeded,
} from "./FeedPanelScrollState";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const FeedPanelComponent = ({
  title = "Feed",
  rows = [],
  renderRow,
  footer = null,
  footerClassName = "border-t border-white/35 bg-white/35 px-3 py-3",
  autoScrollKey = rows.length,
  rootClassName = "fixed left-4 bottom-4 w-72 md:w-80 z-30 pointer-events-auto",
  panelClassName = "flex h-[20vh] flex-col rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text overflow-hidden",
  headerClassName = "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700",
  contentWrapClassName = "min-h-0 flex-1 pb-4",
  scrollViewportClassName = "h-full overflow-y-auto px-4",
  scrollClassName = "feed-panel-scroll",
  fadeClassName = "feed-panel-fade",
  entryClassName = "feed-panel-entry",
  contentClassName = "space-y-2 text-sm pt-2",
}) => {
  const scrollRef = useRef(null);
  const stateRef = useRef(null);
  if (!stateRef.current) {
    stateRef.current = createFeedPanelScrollState();
  }

  useEffect(() => {
    if (!scrollRef.current) return;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    runFeedPanelAutoScrollIfNeeded(stateRef.current, scrollRef.current, {
      prefersReducedMotion,
      requestAnimationFrameFn: requestAnimationFrame,
    });
  }, [autoScrollKey]);

  useEffect(
    () => () => {
      cleanupFeedPanelScrollState(stateRef.current);
    },
    []
  );

  const hasRows = rows.length > 0;

  return React.createElement(
    "div",
    {
      className: rootClassName,
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      { className: panelClassName },
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
            onMouseEnter: () => handleFeedPanelMouseEnter(stateRef.current),
            onMouseLeave: () => handleFeedPanelMouseLeave(stateRef.current),
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
