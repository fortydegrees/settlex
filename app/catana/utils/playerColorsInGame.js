import {
  PLAYER_COLOR_OPTIONS,
  normalizePlayerColorId
} from "../theme/playerColors";

const PLAYER_COLOR_IDS = PLAYER_COLOR_OPTIONS.map((option) => option.id);

const PLAYER_COLOR_CONFLICTS = Object.freeze({
  lavender: Object.freeze(["violet", "purple", "magenta"]),
  purple: Object.freeze(["lavender", "violet", "magenta"]),
  violet: Object.freeze(["lavender", "purple"]),
  magenta: Object.freeze(["lavender", "purple"]),
  red: Object.freeze(["coral"]),
  coral: Object.freeze(["red"])
});

const normalizeLivePlayerColorId = (colorId) => {
  const normalizedColor = normalizePlayerColorId(colorId);
  return PLAYER_COLOR_IDS.includes(normalizedColor) ? normalizedColor : null;
};

export function colorsConflict(leftColor, rightColor) {
  const left = normalizeLivePlayerColorId(leftColor);
  const right = normalizeLivePlayerColorId(rightColor);

  if (!left || !right) return false;
  if (left === right) return true;

  return (
    PLAYER_COLOR_CONFLICTS[left]?.includes(right) ||
    PLAYER_COLOR_CONFLICTS[right]?.includes(left) ||
    false
  );
}

export function resolveEffectivePlayerColors({
  playerIds = [],
  preferredColorByPlayerId = {}
} = {}) {
  const resolved = {};
  const assignedColors = [];

  playerIds.map(String).forEach((playerId) => {
    const preferredColor = normalizeLivePlayerColorId(
      preferredColorByPlayerId?.[playerId]
    );
    const preferredIsAvailable =
      preferredColor &&
      !assignedColors.some((assignedColor) =>
        colorsConflict(assignedColor, preferredColor)
      );

    const nextColor =
      (preferredIsAvailable && preferredColor) ||
      PLAYER_COLOR_IDS.find(
        (candidateColor) =>
          !assignedColors.some((assignedColor) =>
            colorsConflict(assignedColor, candidateColor)
          )
      ) ||
      PLAYER_COLOR_IDS[0];

    resolved[playerId] = nextColor;
    assignedColors.push(nextColor);
  });

  return resolved;
}
