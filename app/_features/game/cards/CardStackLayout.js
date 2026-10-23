export const DEFAULT_STACK_MAX_WIDTH = 90;

export const getCardStackLayout = ({
  count,
  cardWidth,
  stackOffset,
  maxVisible,
  maxStackWidth,
  badgeMinCount = 3,
}) => {
  const safeCount = Math.max(0, count ?? 0);
  const isEmpty = safeCount === 0;
  const visibleCount = isEmpty
    ? 1
    : Math.min(safeCount, maxVisible ?? safeCount);
  const idealWidth = cardWidth + (visibleCount - 1) * stackOffset;
  const cappedWidth =
    maxStackWidth && idealWidth > maxStackWidth
      ? Math.max(cardWidth, maxStackWidth)
      : idealWidth;
  const offset =
    visibleCount > 1 ? (cappedWidth - cardWidth) / (visibleCount - 1) : 0;
  const showBadge = safeCount >= badgeMinCount;

  return {
    visibleCount,
    width: cappedWidth,
    offset,
    isEmpty,
    showBadge,
  };
};
