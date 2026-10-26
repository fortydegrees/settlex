"use client";

import React, { useEffect, useRef } from 'react';
import { Collapsible } from '@base-ui/react/collapsible';
import { cn } from './cn';

// Base UI owns presence/measurement/reversal; our recipe owns the feel.
// Children remain live during exit, so privacy/state updates are never frozen.
export function Disclosure({ open, onOpenChange, trigger, header, children, className, contentClassName }) {
  const triggerRef = useRef(null);
  const contentRef = useRef(null);
  useEffect(() => {
    if (!open && contentRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus();
    }
  }, [open]);
  // Compose sibling header actions without nesting buttons or replacing the trigger.
  const control = <Collapsible.Trigger ref={triggerRef} render={trigger} />;
  return <Collapsible.Root open={open} onOpenChange={onOpenChange} className={cn('settlehex-ui-disclosure', className)}>
    {header ? header(control) : control}
    <Collapsible.Panel className="settlehex-ui-disclosure-panel">
      <div ref={contentRef} inert={open ? undefined : ''} aria-hidden={open ? undefined : true} className={contentClassName}>
        {children}
      </div>
    </Collapsible.Panel>
  </Collapsible.Root>;
}
