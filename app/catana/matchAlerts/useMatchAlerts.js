"use client";

import { useContext } from "react";
import { MatchAlertContext } from "./MatchAlertProvider.js";

export function useMatchAlerts() {
  const context = useContext(MatchAlertContext);
  if (!context) {
    throw new Error("useMatchAlerts must be used within MatchAlertProvider.");
  }
  return context;
}
