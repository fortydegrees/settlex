"use client";

import React, { useEffect, useRef, useState } from 'react';
import { cn } from './cn';
import { observeElementSize } from './observeElementSize';

// Only geometry is retained. Children always reflect current application state,
// including immediate removal of hidden/private content. No exit snapshots.
export function ResizeRegion({ axis = 'height', children, className, style, ...props }) {
  const content = useRef(null);
  const [size, setSize] = useState(null);
  useEffect(() => observeElementSize(content.current, axis, setSize), [axis]);
  return <div {...props} className={cn('settlehex-ui-resize', className)} data-axis={axis}
    style={{ ...style, [axis]: size == null ? undefined : `${size}px` }}>
    <div ref={content} className="settlehex-ui-resize-content">{children}</div>
  </div>;
}
