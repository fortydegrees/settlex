"use client";

import React, { Suspense, useState } from 'react';

// Delay the import until first use, then retain the dialog owner so Base UI can
// finish/reverse exits. Disposable form state belongs inside its popup subtree.
// Children always receive current props, including permission/privacy changes.
export function LazyDialog({ component: Component, open, ...props }) {
  const [activated, setActivated] = useState(Boolean(open));
  if (open && !activated) setActivated(true);
  if (!open && !activated) return null;
  return <Suspense fallback={null}><Component {...props} open={Boolean(open)} /></Suspense>;
}
