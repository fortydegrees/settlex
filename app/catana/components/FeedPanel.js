import React, { useEffect, useRef } from "react";

const AUTO_SCROLL_IDLE_MS = 3000;

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");

const FeedPanelComponent = ({
  title = "Feed",
  rows = [],
  renderRow,
  children,
  rootClassName = "fixed left-4 bottom-4 w-72 md:w-80 z-30 pointer-events-auto",
  panelClassName = "flex h-[20vh] flex-col rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text overflow-hidden",
  headerClassName = "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700",
  contentWrapClassName = "min-h-0 flex-1 pb-4",
  scrollClassName = "feed-panel-scroll",
  fadeClassName = "feed-panel-fade",
  entryClassName = "feed-panel-entry",
  contentClassName = "space-y-2 text-sm pt-2",
}) => {
  const scrollRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const idleTimeoutRef = useRef(null);
  const isAutoScrollingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const hasRows = Array.isArray(rows) && rows.length > 0;
  const contentCount = hasRows ? rows.length : React.Children.count(children);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    if (isHoveringRef.current) return;

    isAutoScrollingRef.current = true;
    const targetTop = scrollRef.current.scrollHeight;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (!prefersReducedMotion && typeof scrollRef.current.scrollTo === "function") {
      try {
        scrollRef.current.scrollTo({ top: targetTop, behavior: "smooth" });
      } catch (error) {
        scrollRef.current.scrollTop = targetTop;
      }
    } else {
      scrollRef.current.scrollTop = targetTop;
    }

    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
  }, [contentCount]);

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  const markManualScroll = () => {
    if (isAutoScrollingRef.current) return;
    shouldAutoScrollRef.current = false;
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
  };

  const scheduleAutoScrollResume = () => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = setTimeout(() => {
      shouldAutoScrollRef.current = true;
    }, AUTO_SCROLL_IDLE_MS);
  };

  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    scheduleAutoScrollResume();
  };

  return (
    <div
      className={rootClassName}
      data-allow-interaction="true"
    >
      <div className={panelClassName}>
        <div className={headerClassName}>{title}</div>
        <div className={contentWrapClassName}>
          <div
            ref={scrollRef}
            className={joinClassNames(scrollClassName, fadeClassName, "h-full overflow-y-auto px-4")}
            onWheel={markManualScroll}
            onTouchMove={markManualScroll}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {hasRows ? (
              <div className={contentClassName}>
                {rows.map((row, index) => (
                  <div
                    key={row?.key ?? row?.id ?? index}
                    className={entryClassName}
                  >
                    {renderRow ? renderRow(row, index) : row}
                  </div>
                ))}
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FeedPanel = React.memo(FeedPanelComponent);
FeedPanel.displayName = "FeedPanel";
