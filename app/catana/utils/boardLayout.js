const SQRT3 = Math.sqrt(3);

export function computeDefaultSize({ width, height }) {
  const numLevels = 6;
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
  const center = [containerWidth / 2, containerHeight / 2];
  return { containerWidth, containerHeight, size, center };
}
