import React, { useEffect, useRef } from "react";
import { formatLogEntry } from "../utils/gameText";
import { RESOURCE_ICON_SVGS } from "../game/types";

const AUTO_SCROLL_IDLE_MS = 3000;

const renderToken = (token, index) => {
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
    return (
      <span key={`player-${index}`} className="font-semibold text-slate-900">
        {token.name}
      </span>
    );
  }
  if (token.kind === "resource") {
    const icon = RESOURCE_ICON_SVGS[token.resource];
    return (
      <span
        key={`resource-${index}`}
        className="inline-flex items-center gap-1"
      >
        <span className="text-xs font-semibold text-slate-700">
          {token.count}x
        </span>
        {icon ? (
          <img src={icon} alt="" className="h-4 w-4" />
        ) : (
          <span className="text-slate-700">{token.resource}</span>
        )}
      </span>
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

export const GameLogPanel = ({ entries = [], nameMap = {} }) => {
  const scrollRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  const idleTimeoutRef = useRef(null);
  const isAutoScrollingRef = useRef(false);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (!shouldAutoScrollRef.current) return;
    isAutoScrollingRef.current = true;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    requestAnimationFrame(() => {
      isAutoScrollingRef.current = false;
    });
  }, [entries.length]);

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
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, AUTO_SCROLL_IDLE_MS);
  };

  return (
    <div
      className="fixed left-4 top-4 w-72 md:w-80 z-30 pointer-events-auto"
      data-allow-interaction="true"
    >
      <div className="flex h-[20vh] flex-col rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text overflow-hidden">
        <div className="bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700">
          Game Log
        </div>
        <div className="min-h-0 flex-1 pb-4">
          <div
            ref={scrollRef}
            className="game-log-scroll h-full overflow-y-auto px-4"
            onWheel={markManualScroll}
            onTouchMove={markManualScroll}
            onMouseLeave={scheduleAutoScrollResume}
          >
            <div className="space-y-2 text-sm">
              {entries.map((entry, entryIndex) => {
                const tokens = formatLogEntry(entry, nameMap);
                if (!tokens || tokens.length === 0) return null;
                return (
                  <div
                    key={entry.id ?? `${entryIndex}-${entry.type}`}
                    className="flex flex-wrap items-center gap-1"
                  >
                    {tokens.map((token, tokenIndex) =>
                      renderToken(token, tokenIndex)
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
