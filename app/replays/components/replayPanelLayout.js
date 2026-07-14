const REPLAY_MOBILE_DOCK_BASE_CLASS_NAME =
  "fixed inset-x-3 z-[55] transition-[bottom] duration-200 motion-reduce:transition-none";
const REPLAY_MOBILE_BOARD_DOCK_CLASS_NAME = "bottom-3";
// Closed seated cockpit + clearance is 12.75rem (12.15rem at <=380px).
// The maximum single-row read-only dev tray adds 4.625rem: 3.125rem card,
// 0.25rem button padding, 0.5rem tray padding, 0.125rem borders,
// 0.375rem tray margin, and 0.25rem expander margin.
const REPLAY_MOBILE_SEATED_DOCK_CLASS_NAME =
  "bottom-[calc(17.375rem+env(safe-area-inset-bottom))] max-[380px]:bottom-[calc(16.775rem+env(safe-area-inset-bottom))]";

export const getReplayMobileDockClassName = (perspectiveId) =>
  `${REPLAY_MOBILE_DOCK_BASE_CLASS_NAME} ${
    perspectiveId == null
      ? REPLAY_MOBILE_BOARD_DOCK_CLASS_NAME
      : REPLAY_MOBILE_SEATED_DOCK_CLASS_NAME
  }`;
