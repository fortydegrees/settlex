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
  it("memoizes effective player colors in GameScreen and passes them into buildPlayerViewMap", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toContain("const effectiveColorByPlayerId = useMemo(");
    expect(contents).toMatch(
      /buildPlayerViewMap\(core, effectiveColorByPlayerId\)/
    );
  });

  it("only starts the ticker when a visible timer, disconnect countdown, or idle countdown is active", () => {
    const contents = readCatanaFile("GameScreen.js");
    expect(contents).toContain("hasDisconnectCountdown");
    expect(contents).toContain("hasIdleCountdown");
    expect(contents).toMatch(
      /if \(!timerSnapshot \|\| hideTimer\) \{\s+if \(!hasDisconnectCountdown && !hasIdleCountdown\) return;\s+\}/
    );
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
    const MemoProbe = () => null;
    const memoType = React.memo(MemoProbe).$$typeof;
    expect(ChatPanel.$$typeof).toBe(memoType);
    expect(FeedPanel.$$typeof).toBe(memoType);
  });

  it("memoizes and memo-wraps the game log panel", () => {
    const contents = readCatanaFile("components/GameLogPanel.js");
    expect(contents).toMatch(/useMemo/);
    expect(contents).toContain("formattedEntries");
    expect(contents).toContain("React.memo");
  });

  it("lets Board consume playerColorMap instead of rebuilding colors from seat order", () => {
    const contents = readCatanaFile("Board.js");
    expect(contents).toMatch(/buildPlayerViewMap\(G\.core,\s*playerColorMap\)/);
  });

  it("memo-wraps the board subtree so timer ticks do not re-render it", () => {
    const boardContents = readCatanaFile("Board.js");
    const screenContents = readCatanaFile("GameScreen.js");

    expect(boardContents).toContain(
      "export const MemoizedCatanBoard = React.memo(CatanBoard);"
    );
    expect(screenContents).toContain("MemoizedCatanBoard");
    expect(boardContents).not.toContain('console.log("board render ');
  });

  it("lazy-loads preview components so GSAP is not part of the initial board bundle", () => {
    const contents = readCatanaFile("Board.js");

    expect(contents).not.toContain(
      'import { RobberPlacementPreview } from "./RobberPlacementPreview";'
    );
    expect(contents).not.toContain(
      'import { BuildPlacementPreview } from "./BuildPlacementPreview";'
    );
    expect(contents).toContain('const RobberPlacementPreview = React.lazy(');
    expect(contents).toContain('const BuildPlacementPreview = React.lazy(');
    expect(contents).toContain("const loadBoardPreviewModules = () =>");
    expect(contents).toContain("requestIdleCallback");
    expect(contents).toContain("<React.Suspense fallback={null}>");
  });

  it("routes ActionNode building previews through the shared piece asset helper", () => {
    const contents = readCatanaFile("ActionNode.js");
    expect(contents).toContain("getPieceSvgFile");
  });
});
