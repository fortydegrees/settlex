export const AUTO_SCROLL_IDLE_MS = 3000;

const createRef = (value) => ({ current: value });

export const createFeedPanelScrollState = () => ({
  shouldAutoScrollRef: createRef(true),
  idleTimeoutRef: createRef(null),
  isAutoScrollingRef: createRef(false),
  isHoveringRef: createRef(false),
  isFocusedRef: createRef(false),
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
  {
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    idleMs = AUTO_SCROLL_IDLE_MS,
    onIdleResume,
  } = {}
) => {
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
  state.idleTimeoutRef.current = setTimeoutFn(() => {
    state.shouldAutoScrollRef.current = true;
    onIdleResume?.();
  }, idleMs);
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
  if (state.isFocusedRef.current) return;
  scheduleFeedPanelAutoScrollResume(state, timers);
};

export const handleFeedPanelFocus = (
  state,
  clearTimeoutFn = clearTimeout
) => {
  state.isFocusedRef.current = true;
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
};

export const handleFeedPanelBlur = (
  state,
  timers = {}
) => {
  state.isFocusedRef.current = false;
  if (state.isHoveringRef.current) return;
  scheduleFeedPanelAutoScrollResume(state, timers);
};

export const runFeedPanelAutoScrollIfNeeded = (
  state,
  scrollEl,
  {
    force = false,
    behavior = "smooth",
    prefersReducedMotion = false,
    requestAnimationFrameFn =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (callback) => callback(),
  } = {}
) => {
  if (!scrollEl) return false;
  if (force) {
    state.shouldAutoScrollRef.current = true;
  }
  if (!state.shouldAutoScrollRef.current) return false;
  if (!force && state.isHoveringRef.current) return false;
  if (!force && state.isFocusedRef.current) return false;

  state.isAutoScrollingRef.current = true;
  const targetTop = Math.max(
    (scrollEl.scrollHeight ?? 0) - (scrollEl.clientHeight ?? 0),
    0
  );
  const shouldUseSmoothScroll =
    !prefersReducedMotion &&
    behavior === "smooth" &&
    typeof scrollEl.scrollTo === "function";

  if (shouldUseSmoothScroll) {
    try {
      scrollEl.scrollTo({ top: targetTop, behavior: "smooth" });
    } catch (error) {
      scrollEl.scrollTop = targetTop;
    }
  } else {
    const previousScrollBehavior =
      scrollEl.style && typeof scrollEl.style === "object"
        ? scrollEl.style.scrollBehavior
        : null;

    if (previousScrollBehavior != null) {
      scrollEl.style.scrollBehavior = "auto";
    }
    scrollEl.scrollTop = targetTop;
    if (previousScrollBehavior != null) {
      scrollEl.style.scrollBehavior = previousScrollBehavior;
    }
  }

  requestAnimationFrameFn(() => {
    state.isAutoScrollingRef.current = false;
  });

  return true;
};

export const forceFeedPanelAutoScroll = (
  state,
  scrollEl,
  {
    clearTimeoutFn = clearTimeout,
    ...options
  } = {}
) => {
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
  return runFeedPanelAutoScrollIfNeeded(state, scrollEl, {
    ...options,
    force: true,
  });
};

export const cleanupFeedPanelScrollState = (state, clearTimeoutFn = clearTimeout) => {
  clearFeedPanelIdleTimeout(state, clearTimeoutFn);
};
