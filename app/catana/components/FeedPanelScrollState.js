export const AUTO_SCROLL_IDLE_MS = 3000;

const createRef = (value) => ({ current: value });

export const createFeedPanelScrollState = () => ({
  shouldAutoScrollRef: createRef(true),
  idleTimeoutRef: createRef(null),
  isAutoScrollingRef: createRef(false),
  isHoveringRef: createRef(false),
});

const clearFeedPanelIdleTimeout = (state, clearTimeoutFn = clearTimeout) => {
  if (!state.idleTimeoutRef.current) return;
  clearTimeoutFn(state.idleTimeoutRef.current);
  state.idleTimeoutRef.current = null;
};

export const markFeedPanelManualScroll = (state, clearTimeoutFn = clearTimeout) => {
  if (state.isAutoScrollingRef.current) return;
  state.shouldAutoScrollRef.current = false;
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
};

export const scheduleFeedPanelAutoScrollResume = (
  state,
  { setTimeoutFn = setTimeout, clearTimeoutFn = clearTimeout } = {}
) => {
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
  state.idleTimeoutRef.current = setTimeoutFn(() => {
    state.shouldAutoScrollRef.current = true;
  }, AUTO_SCROLL_IDLE_MS);
};

export const handleFeedPanelMouseEnter = (state, clearTimeoutFn = clearTimeout) => {
  state.isHoveringRef.current = true;
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
};

export const handleFeedPanelMouseLeave = (
  state,
  timers = {}
) => {
  state.isHoveringRef.current = false;
  scheduleFeedPanelAutoScrollResume(state, timers);
};

export const runFeedPanelAutoScrollIfNeeded = (
  state,
  scrollEl,
  {
    prefersReducedMotion = false,
    requestAnimationFrameFn =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (callback) => callback(),
  } = {}
) => {
  if (!scrollEl) return false;
  if (!state.shouldAutoScrollRef.current) return false;
  if (state.isHoveringRef.current) return false;

  state.isAutoScrollingRef.current = true;
  const targetTop = scrollEl.scrollHeight;

  if (!prefersReducedMotion && typeof scrollEl.scrollTo === "function") {
    try {
      scrollEl.scrollTo({ top: targetTop, behavior: "smooth" });
    } catch (error) {
      scrollEl.scrollTop = targetTop;
    }
  } else {
    scrollEl.scrollTop = targetTop;
  }

  requestAnimationFrameFn(() => {
    state.isAutoScrollingRef.current = false;
  });

  return true;
};

export const cleanupFeedPanelScrollState = (state, clearTimeoutFn = clearTimeout) => {
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
};
