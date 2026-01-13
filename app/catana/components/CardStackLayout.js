export const getCardStackLayout = ({
  count,
  cardWidth,
  stackOffset,
  maxVisible,
}) => {
  const safeCount = Math.max(0, count ?? 0);
  const isEmpty = safeCount === 0;
  const visibleCount = isEmpty
    ? 1
    : Math.min(safeCount, maxVisible ?? safeCount);
  const width = cardWidth + (visibleCount - 1) * stackOffset;
  const showBadge = safeCount > 2;

  return { visibleCount, width, isEmpty, showBadge };
};
