export function getBoardUnderlayFrame({
  center,
  size,
  viewBox,
  designSize = 100,
}) {
  const [minX, minY, viewBoxWidth, viewBoxHeight] = viewBox;
  const scale = size / designSize;

  return {
    left: Math.round(center[0] + minX * scale),
    top: Math.round(center[1] + minY * scale),
    width: Math.round(viewBoxWidth * scale),
    height: Math.round(viewBoxHeight * scale),
  };
}
