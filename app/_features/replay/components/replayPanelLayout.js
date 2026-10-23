const REPLAY_MOBILE_DOCK_BASE_CLASS_NAME =
  "pointer-events-none fixed inset-x-3 bottom-[calc(0.6rem+env(safe-area-inset-bottom))] z-[55] mx-auto max-w-[28rem]";
const REPLAY_MOBILE_SEATED_DOCK_CLASS_NAME =
  "pl-[6.25rem] min-[400px]:pl-[6.75rem]";

export const REPLAY_RAIL_THUMB_PX = 17;

// The native thumb's centre travels from half a thumb inside the left edge to
// half a thumb short of the right one, so the fill and the turn ticks have to
// follow that inset travel instead of the raw percentage — otherwise they drift
// away from the knob by up to half a thumb at each end of the match.
export const getReplayRailOffset = (ratio) => {
  const clamped = Math.min(Math.max(Number(ratio) || 0, 0), 1);
  return `calc(${clamped * 100}% + ${
    (0.5 - clamped) * REPLAY_RAIL_THUMB_PX
  }px)`;
};

export const REPLAY_SEGMENTED_NAME_LIMIT = 14;

// Segments only survive a duel with short names. Three or four seats, or a
// username long enough to need truncating, go to the select instead — the
// design would rather wrap nothing than squeeze four ellipsised names into one
// row of a 21rem panel.
export const shouldUseSegmentedReplayPerspective = (players = []) =>
  players.length === 2 &&
  players.every(
    (player) => (player?.name?.length ?? 0) <= REPLAY_SEGMENTED_NAME_LIMIT
  );

// Board sits between the two seats, so the control reads as a spatial choice.
export const getSegmentedReplayPerspectiveOptions = (players = []) =>
  [players[0], { id: null, name: "Board" }, ...players.slice(1)].filter(
    Boolean
  );

export const getReplayMobileDockClassName = (perspectiveId) =>
  `${REPLAY_MOBILE_DOCK_BASE_CLASS_NAME}${
    perspectiveId == null ? "" : ` ${REPLAY_MOBILE_SEATED_DOCK_CLASS_NAME}`
  }`;
