// Observe layout dimensions, not transformed screen bounds. The wrapper owns
// interpolation; this subscription only reports changed intrinsic targets.
export function observeElementSize(element, axis, onSize) {
  if (typeof ResizeObserver === 'undefined') return () => {};
  let active = true;
  let previous;
  const measure = () => {
    if (!active) return;
    const size = axis === 'width' ? element.offsetWidth : element.offsetHeight;
    if (size !== previous) {
      previous = size;
      onSize(size);
    }
  };
  const observer = new ResizeObserver(measure);
  observer.observe(element);
  measure();
  return () => { active = false; observer.disconnect(); };
}
