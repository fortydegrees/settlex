const navigationKeys = new Set([
  'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' ', 'Escape',
]);
const textInputTypes = new Set([
  'text', 'email', 'password', 'search', 'tel', 'url', 'number',
  'date', 'datetime-local', 'month', 'time', 'week',
]);

// One document-level owner covers controls in portals as well as the app tree.
// No focus/blur calls: pointer users keep their caret and control activation.
export function installFocusModality(document) {
  const root = document.documentElement;
  const attribute = 'data-settlehex-input';
  const previous = root.getAttribute(attribute);
  const onPointerDown = () => root.setAttribute(attribute, 'pointer');
  const onKeyDown = (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
    if (!navigationKeys.has(event.key)) return;
    const target = event.target;
    const editingText = target?.isContentEditable || target?.tagName === 'TEXTAREA'
      || (target?.tagName === 'INPUT' && textInputTypes.has(target.type || 'text'));
    // Typing/caret movement after a click should not bring the outline back.
    if (editingText && event.key !== 'Tab') return;
    root.setAttribute(attribute, 'keyboard');
  };

  onPointerDown();
  document.addEventListener('pointerdown', onPointerDown, { capture: true });
  document.addEventListener('keydown', onKeyDown, { capture: true });
  return () => {
    document.removeEventListener('pointerdown', onPointerDown, { capture: true });
    document.removeEventListener('keydown', onKeyDown, { capture: true });
    if (previous === null) root.removeAttribute(attribute);
    else root.setAttribute(attribute, previous);
  };
}
