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

export function getBoardLayout({ width, height }) {
  const containerHeight = height - 144 - 38 - 40;
  const containerWidth = width;
  const size = computeDefaultSize({ width: containerWidth, height: containerHeight });
  // Size the board against the reserved UI height, but keep the board itself
  // centered in the viewport so the first load feels visually balanced.
  const center = [containerWidth / 2, height / 2];
  return { containerWidth, containerHeight, size, center };
}
