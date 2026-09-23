"use client";

// A group of mutually exclusive action buttons, not tabs: selection does not
// create a tabpanel or introduce a second keyboard-navigation model.
export function SegmentedControl({ label, options, value, onValueChange, disabled = false }) {
  return (
    <div role="group" aria-label={label} className="settlex-ui-inset flex gap-ui-1 rounded-pill p-ui-1">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          className="settlex-ui-segment settlex-ui-focus min-h-[2.75rem] min-w-0 flex-1 rounded-pill px-ui-3 py-ui-2 type-action-small"
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
