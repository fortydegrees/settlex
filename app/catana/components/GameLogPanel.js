import React, { useEffect, useMemo, useRef } from "react";
import { formatLogEntry } from "../utils/gameText";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "../theme/themes";
import { getPlayerNameHex } from "../theme/playerColors";

const AUTO_SCROLL_IDLE_MS = 3000;

const renderToken = (token, index, themeId) => {
  if (!token) return null;
  if (token.kind === "divider") {
    const isStrong = token.variant === "strong";
    return (
      <div
        key={`divider-${index}`}
        className={
          isStrong
            ? "my-3 h-0.5 w-full bg-slate-400/80"
            : "my-2 h-px w-full bg-slate-300/70"
        }
      />
    );
  }
  if (token.kind === "player") {
    const nameColor = token.color ? getPlayerNameHex(token.color) ?? token.color : null;
    return (
      <span
        key={`player-${index}`}
        className="inline-flex items-center gap-1 font-semibold"
      >
        {token.emoji ? <span aria-hidden="true">{token.emoji}</span> : null}
        <span
          className={nameColor ? "" : "text-slate-900"}
          style={nameColor ? { color: nameColor } : undefined}
        >
          {token.name}
        </span>
      </span>
    );
  }
  if (token.kind === "resource") {
    const icon = getResourceIconPath(themeId, token.resource);
    const iconFallback = getClassicResourceIconPath(token.resource);
    return (
      icon ? (
        <img
          key={`resource-${index}`}
          src={icon}
          alt=""
          title={token.resource}
          className="h-4 w-4"
          draggable={false}
          onError={(event) =>
            handleThemeImageError(event, iconFallback)
          }
        />
      ) : (
        <span key={`resource-${index}`} className="text-slate-700">
          {token.resource}
        </span>
      )
    );
  }
  if (token.kind === "text") {
    return (
      <span key={`text-${index}`} className="text-slate-800">
        {token.text}
      </span>
    );
  }
  return null;
};

const GameLogPanelComponent = ({ entries = [], playerMap = {}, themeId }) => {
  const scrollRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const idleTimeoutRef = useRef(null);
  const isAutoScrollingRef = useRef(false);
  const isHoveringRef = useRef(false);
  const formattedEntries = useMemo(
    () =>
      entries
        .map((entry, entryIndex) => {
          const tokens = formatLogEntry(entry, playerMap);
          if (!tokens || tokens.length === 0) return null;
          return {
            key: entry.id ?? `${entryIndex}-${entry.type}`,
            tokens
          };
        })
        .filter(Boolean),
    [entries, playerMap]
  );

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
      } catch (err) {
        scrollRef.current.scrollTop = targetTop;
      }
    } else {
      scrollRef.current.scrollTop = targetTop;
    }
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
  }, [formattedEntries.length]);

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
      className="fixed left-4 bottom-4 w-72 md:w-80 z-30 pointer-events-auto"
      data-allow-interaction="true"
    >
      <div className="flex h-[20vh] flex-col rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text overflow-hidden">
        <div className="bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700">
          Game Log
        </div>
        <div className="min-h-0 flex-1 pb-4">
          <div
            ref={scrollRef}
            className="game-log-scroll game-log-fade h-full overflow-y-auto px-4"
            onWheel={markManualScroll}
            onTouchMove={markManualScroll}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="space-y-2 text-sm pt-2">
              {formattedEntries.map((entry) => {
                return (
                  <div
                    key={entry.key}
                    className="game-log-entry flex flex-wrap items-center gap-1"
                  >
                    {entry.tokens.map((token, tokenIndex) =>
                      renderToken(token, tokenIndex, themeId)
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const GameLogPanel = React.memo(GameLogPanelComponent);
GameLogPanel.displayName = "GameLogPanel";
