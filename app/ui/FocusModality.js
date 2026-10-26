"use client";

import { useEffect } from 'react';
import { installFocusModality } from './focusInputMode';

export function FocusModality() {
  useEffect(() => installFocusModality(document), []);
  return null;
}
