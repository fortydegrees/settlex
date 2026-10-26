"use client";

import React from 'react';
import { cn } from './cn';

// A labelled switch row. Native button semantics provide Space/Enter and
// disabled gating; callers own only the boolean and its application meaning.
export function Switch({ checked, onCheckedChange, disabled = false, children, className, ...props }) {
  return <button {...props} type="button" role="switch" aria-checked={checked} disabled={disabled}
    onClick={() => onCheckedChange?.(!checked)}
    className={cn('settlehex-ui-switch settlehex-ui-focus', className)}>
    <span className="type-action-small text-ink-primary">{children}</span>
    <span aria-hidden="true" className="settlehex-ui-switch-track"><span className="settlehex-ui-switch-thumb" /></span>
  </button>;
}
