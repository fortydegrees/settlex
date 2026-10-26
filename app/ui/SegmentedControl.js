"use client";

// A group of mutually exclusive action buttons, not tabs: selection does not
// create a tabpanel or introduce a second keyboard-navigation model.
export function SegmentedControl({ label, options, value, onValueChange, disabled = false, density = "normal" }) {
  const selectedIndex = options.findIndex(option => option.value === value);
  return (
    <div role="group" aria-label={label} className="settlehex-ui-inset settlehex-ui-segments rounded-pill p-ui-1" data-density={density}
      style={{ "--segment-count": Math.max(1, options.length), "--segment-index": selectedIndex }}>
      {selectedIndex >= 0 && <span aria-hidden="true" className="settlehex-ui-segment-indicator" />}
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          className={`settlehex-ui-segment settlehex-ui-focus min-h-[2.75rem] min-w-0 truncate rounded-pill py-ui-2 ${density === "compact" ? "px-ui-1 type-caption" : "px-ui-3 type-action-small"}`}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
