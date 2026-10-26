"use client";

import React, { useEffect, useState } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cn } from './cn';

// Current-position action rows, not listbox options/tabs. Children may contain
// rich display content, but must not contain links, inputs or other controls.
export const SelectableRow = React.forwardRef(function SelectableRow({
  current = false,
  onActivate,
  disabled = false,
  density = 'normal',
  className,
  children,
}, ref) {
  const interactive = typeof onActivate === 'function';
  const [keyboardPressed, setKeyboardPressed] = useState(false);
  useEffect(() => { setKeyboardPressed(false); }, [disabled, interactive]);
  const sharedProps = {
    ref,
    className: cn('settlehex-ui-selectable-row type-body-small', interactive && 'settlehex-ui-focus', className),
    'data-density': density,
    'data-current': current ? 'true' : undefined,
    'aria-current': current || undefined,
  };
  if (!interactive) return <div {...sharedProps}>{children}</div>;

  return <BaseButton {...sharedProps} render={<div />} nativeButton={false}
    disabled={disabled} onClick={onActivate}
    data-keyboard-pressed={!disabled && keyboardPressed ? 'true' : undefined}
    onKeyDown={(event) => {
      if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
        setKeyboardPressed(true);
      }
    }}
    onKeyUp={(event) => {
      // Base UI supplies Space activation; only a press begun on this row may
      // complete it. Moving focus or disabling cancels the pending activation.
      if (event.key === ' ' && !keyboardPressed) event.preventBaseUIHandler();
      if (event.key === 'Enter' || event.key === ' ') setKeyboardPressed(false);
    }}
    onBlur={() => setKeyboardPressed(false)}>
    {children}
  </BaseButton>;
});
