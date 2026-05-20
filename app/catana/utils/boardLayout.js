const SQRT3 = Math.sqrt(3);

export function computeDefaultSize({ width, height }) {
  const numLevels = 7;
  const maxSizeThatRespectsHeight = (4 * height) / (3 * numLevels + 1) / 2;
  const correspondingWidth = SQRT3 * maxSizeThatRespectsHeight;
  if (numLevels * correspondingWidth < width) {
    return maxSizeThatRespectsHeight;
  }
  return width / numLevels / SQRT3;
}

const DEFAULT_RESERVED_UI_HEIGHT = 144 + 38 + 40;

export function getBoardLayout({
  width,
  height,
  leftInset = 0,
  rightInset = 0,
  reservedUiHeight = DEFAULT_RESERVED_UI_HEIGHT,
}) {
  const safeReservedUiHeight =
    Number.isFinite(reservedUiHeight) ? Math.max(0, reservedUiHeight) : DEFAULT_RESERVED_UI_HEIGHT;
  const containerHeight = Math.max(0, height - safeReservedUiHeight);
  const safeLeftInset = Number.isFinite(leftInset) ? Math.max(0, leftInset) : 0;
  const safeRightInset = Number.isFinite(rightInset) ? Math.max(0, rightInset) : 0;
  const containerWidth = Math.max(0, width - safeLeftInset - safeRightInset);
  const size = computeDefaultSize({ width: containerWidth, height: containerHeight });
  // Size the board against the reserved UI height, but keep the board itself
  // centered in the playable area so persistent side UI does not make it feel
  // optically off-center.
  const center = [safeLeftInset + containerWidth / 2, height / 2];
  return { containerWidth, containerHeight, size, center };
}
