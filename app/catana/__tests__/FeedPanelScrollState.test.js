import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTO_SCROLL_IDLE_MS,
  createFeedPanelScrollState,
  forceFeedPanelAutoScroll,
  handleFeedPanelBlur,
  handleFeedPanelFocus,
  handleFeedPanelMouseEnter,
  handleFeedPanelMouseLeave,
  markFeedPanelManualScroll,
  runFeedPanelAutoScrollIfNeeded
} from "../components/FeedPanelScrollState";

afterEach(() => {
  vi.useRealTimers();
});

describe("FeedPanelScrollState", () => {
  it("resumes automatic scrolling after the pointer leaves and becomes idle", () => {
    vi.useFakeTimers();
    const state = createFeedPanelScrollState();
    const onIdleResume = vi.fn();

    markFeedPanelManualScroll(state);
    handleFeedPanelMouseEnter(state);
    handleFeedPanelMouseLeave(state, {
      idleMs: AUTO_SCROLL_IDLE_MS,
      onIdleResume
    });

    expect(state.isHoveringRef.current).toBe(false);
    expect(state.shouldAutoScrollRef.current).toBe(false);
    expect(onIdleResume).not.toHaveBeenCalled();

    vi.advanceTimersByTime(AUTO_SCROLL_IDLE_MS - 1);
    expect(state.shouldAutoScrollRef.current).toBe(false);

    vi.advanceTimersByTime(1);
    expect(state.shouldAutoScrollRef.current).toBe(true);
    expect(onIdleResume).toHaveBeenCalledOnce();
  });

  it("does not auto-scroll while hovering and scrolls when allowed", () => {
    const state = createFeedPanelScrollState();
    const scrollEl = {
      scrollHeight: 128,
      scrollTop: 0,
      scrollTo: vi.fn(function scrollTo(options) {
        this.scrollTop = options.top;
      })
    };
    const requestAnimationFrameFn = vi.fn((callback) => callback());

    state.isHoveringRef.current = true;
    expect(
      runFeedPanelAutoScrollIfNeeded(state, scrollEl, {
        requestAnimationFrameFn
      })
    ).toBe(false);
    expect(scrollEl.scrollTo).not.toHaveBeenCalled();

    state.isHoveringRef.current = false;
    expect(
      runFeedPanelAutoScrollIfNeeded(state, scrollEl, {
        requestAnimationFrameFn
      })
    ).toBe(true);
    expect(scrollEl.scrollTo).toHaveBeenCalledWith({
      top: 128,
      behavior: "smooth"
    });
    expect(state.isAutoScrollingRef.current).toBe(false);
  });

  it("jumps directly to the maximum offset for an instant resume", () => {
    const state = createFeedPanelScrollState();
    const scrollEl = {
      scrollHeight: 320,
      clientHeight: 80,
      scrollTop: 0,
      scrollTo: vi.fn()
    };

    expect(
      runFeedPanelAutoScrollIfNeeded(state, scrollEl, {
        requestAnimationFrameFn: (callback) => callback(),
        behavior: "auto"
      })
    ).toBe(true);
    expect(scrollEl.scrollTo).not.toHaveBeenCalled();
    expect(scrollEl.scrollTop).toBe(240);
  });

  it("can force automatic scrolling while chat interaction is active", () => {
    const state = createFeedPanelScrollState();
    const scrollEl = {
      scrollHeight: 256,
      scrollTop: 0,
      scrollTo: vi.fn(function scrollTo(options) {
        this.scrollTop = options.top;
      })
    };

    state.shouldAutoScrollRef.current = false;
    state.isHoveringRef.current = true;
    state.isFocusedRef.current = true;

    expect(
      forceFeedPanelAutoScroll(state, scrollEl, {
        requestAnimationFrameFn: (callback) => callback()
      })
    ).toBe(true);
    expect(state.shouldAutoScrollRef.current).toBe(true);
    expect(scrollEl.scrollTo).toHaveBeenCalledWith({
      top: 256,
      behavior: "smooth"
    });
  });

  it("resumes automatic scrolling after focus leaves and becomes idle", () => {
    vi.useFakeTimers();
    const state = createFeedPanelScrollState();
    const onIdleResume = vi.fn();

    markFeedPanelManualScroll(state);
    handleFeedPanelFocus(state);
    handleFeedPanelBlur(state, {
      setTimeoutFn: setTimeout,
      clearTimeoutFn: clearTimeout,
      idleMs: 12000,
      onIdleResume
    });

    expect(state.isFocusedRef.current).toBe(false);
    expect(state.shouldAutoScrollRef.current).toBe(false);

    vi.advanceTimersByTime(11999);
    expect(state.shouldAutoScrollRef.current).toBe(false);
    expect(onIdleResume).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(state.shouldAutoScrollRef.current).toBe(true);
    expect(onIdleResume).toHaveBeenCalledOnce();
  });
});
