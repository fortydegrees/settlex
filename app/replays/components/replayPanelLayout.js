const REPLAY_MOBILE_DOCK_BASE_CLASS_NAME =
  "fixed inset-x-3 z-[55] transition-[bottom] duration-200 motion-reduce:transition-none";
const REPLAY_MOBILE_BOARD_DOCK_CLASS_NAME = "bottom-3";
// Closed seated cockpit: 7.425rem inventory/action shell + 0.5rem gap +
// 3.85rem command row + 0.6rem safe-area padding, plus 0.375rem clearance.
const REPLAY_MOBILE_SEATED_DOCK_CLASS_NAME =
  "bottom-[calc(12.75rem+env(safe-area-inset-bottom))] max-[380px]:bottom-[calc(12.15rem+env(safe-area-inset-bottom))]";

export const getReplayMobileDockClassName = (perspectiveId) =>
  `${REPLAY_MOBILE_DOCK_BASE_CLASS_NAME} ${
    perspectiveId == null
      ? REPLAY_MOBILE_BOARD_DOCK_CLASS_NAME
      : REPLAY_MOBILE_SEATED_DOCK_CLASS_NAME
  }`;
