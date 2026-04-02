import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  AUTO_SCROLL_IDLE_MS,
  createFeedPanelScrollState,
  handleFeedPanelMouseEnter,
  handleFeedPanelMouseLeave,
  markFeedPanelManualScroll,
  runFeedPanelAutoScrollIfNeeded,
} from "../components/FeedPanelScrollState";
import { ChatPanel } from "../components/ChatPanel";
import { FeedPanel } from "../components/FeedPanel";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readCatanaFile = (relativePath) =>
  fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");

afterEach(() => {
  vi.useRealTimers();
});

describe("render performance guards", () => {
  it("memoizes player view map in GameScreen", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toMatch(/useMemo\(\(\) => buildPlayerViewMap\(core\), \[core\]\)/);
  });

  it("only starts the timer ticker when timer is visible", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toMatch(/if \(!timerSnapshot \|\| hideTimer\) return;/);
  });

  it("precomputes resource counts in PlayerActionContainer", () => {
    const contents = readCatanaFile("components/PlayerActionContainer.js");
    expect(contents).toContain("resourceCounts");
    expect(contents).not.toContain("playerCards.filter(");
  });

  it("controls FeedPanel scroll behavior with a testable helper", () => {
    vi.useFakeTimers();

    const state = createFeedPanelScrollState();

    markFeedPanelManualScroll(state);
    handleFeedPanelMouseEnter(state);
    handleFeedPanelMouseLeave(state);

    expect(state.isHoveringRef.current).toBe(false);
    expect(state.shouldAutoScrollRef.current).toBe(false);
    expect(state.idleTimeoutRef.current).not.toBeNull();

    vi.advanceTimersByTime(AUTO_SCROLL_IDLE_MS - 1);
    expect(state.shouldAutoScrollRef.current).toBe(false);

    vi.advanceTimersByTime(1);
    expect(state.shouldAutoScrollRef.current).toBe(true);
  });

  it("skips auto-scroll while hovering and scrolls when allowed", () => {
    const state = createFeedPanelScrollState();
    const scrollEl = {
      scrollHeight: 128,
      scrollTop: 0,
      scrollTo: vi.fn(function scrollTo(options) {
        this.scrollTop = options.top;
      }),
    };
    const raf = vi.fn((callback) => callback());

    state.isHoveringRef.current = true;
    expect(runFeedPanelAutoScrollIfNeeded(state, scrollEl, { requestAnimationFrameFn: raf })).toBe(false);
    expect(scrollEl.scrollTo).not.toHaveBeenCalled();

    state.isHoveringRef.current = false;
    expect(runFeedPanelAutoScrollIfNeeded(state, scrollEl, { requestAnimationFrameFn: raf })).toBe(true);
    expect(scrollEl.scrollTo).toHaveBeenCalledWith({ top: 128, behavior: "smooth" });
    expect(state.isAutoScrollingRef.current).toBe(false);
  });

  it("wraps ChatPanel and FeedPanel in React.memo", () => {
    const memoType = React.memo(() => null).$$typeof;
    expect(ChatPanel.$$typeof).toBe(memoType);
    expect(FeedPanel.$$typeof).toBe(memoType);
  });

  it("memoizes and memo-wraps the game log panel", () => {
    const contents = readCatanaFile("components/GameLogPanel.js");
    expect(contents).toMatch(/useMemo/);
    expect(contents).toContain("formattedEntries");
    expect(contents).toContain("React.memo");
  });

  it("builds log player colors from stable maps instead of full player view objects", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toContain("seatColorMap");
    expect(contents).not.toContain("playerViewMap[id]?.color");
  });
});
