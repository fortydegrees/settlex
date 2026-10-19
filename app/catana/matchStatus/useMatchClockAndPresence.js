"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeTimerSnapshot } from "../utils/timerSnapshot";
import { getActiveDisconnectStateByPlayerId, readPresenceSnapshot } from "../utils/disconnectPresence";
import { getActiveIdleStateByPlayerId, readIdlePresenceSnapshot } from "../utils/idlePresence";
import { getLobbyServerOrigin } from "../utils/serverOrigins";

// Pushed snapshots are authoritative. Only a missing timer prop permits the
// one-time HTTP seed; an explicit null intentionally clears the timer.
export function useMatchClockAndPresence({
  matchID,
  isReplay,
  timerSnapshot: pushedTimerSnapshot,
  timerServerTimeMs,
  disconnectPresence: pushedDisconnectPresence,
  disconnectServerTimeMs,
  idlePresence: pushedIdlePresence,
  idleServerTimeMs
}) {
  const [timerSnapshot, setTimerSnapshot] = useState(null);
  const [timerSeeded, setTimerSeeded] = useState(false);
  const [disconnectPresence, setDisconnectPresence] = useState(null);
  const [idlePresence, setIdlePresence] = useState(null);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    setTimerSnapshot(null);
    setTimerSeeded(false);
    setDisconnectPresence(null);
    setIdlePresence(null);
  }, [matchID]);

  useEffect(() => {
    if (
      pushedTimerSnapshot === undefined &&
      timerServerTimeMs === undefined
    ) {
      return;
    }
    if (!pushedTimerSnapshot) {
      setTimerSnapshot(null);
      return;
    }
    setTimerSnapshot(
      normalizeTimerSnapshot(
        pushedTimerSnapshot,
        timerServerTimeMs
      )
    );
  }, [pushedTimerSnapshot, timerServerTimeMs]);

  useEffect(() => {
    if (
      pushedDisconnectPresence === undefined &&
      disconnectServerTimeMs === undefined
    ) {
      return;
    }

    setDisconnectPresence(
      readPresenceSnapshot(
        pushedDisconnectPresence,
        disconnectServerTimeMs
      )
    );
  }, [pushedDisconnectPresence, disconnectServerTimeMs]);

  useEffect(() => {
    if (
      pushedIdlePresence === undefined &&
      idleServerTimeMs === undefined
    ) {
      return;
    }

    setIdlePresence(
      readIdlePresenceSnapshot(
        pushedIdlePresence,
        idleServerTimeMs
      )
    );
  }, [pushedIdlePresence, idleServerTimeMs]);

  useEffect(() => {
    if (isReplay) return;
    if (!matchID || typeof window === "undefined") return;
    if (pushedTimerSnapshot !== undefined || timerSeeded) return;
    let cancelled = false;

    const fetchSeed = async () => {
      try {
        const baseUrl = getLobbyServerOrigin();
        const url = `${baseUrl}/timer/${matchID}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (!data?.timer) {
          setTimerSeeded(true);
          return;
        }
        setTimerSnapshot(
          normalizeTimerSnapshot(data.timer, data.serverTimeMs)
        );
        setTimerSeeded(true);
      } catch (err) {
        // ignore errors
      }
    };

    fetchSeed();
    return () => {
      cancelled = true;
    };
  }, [isReplay, matchID, timerSeeded, pushedTimerSnapshot]);

  const activeIdlePlayerId = idlePresence?.activeIdlePlayerId ?? null;
  const disconnectStateByPlayerId = useMemo(() => {
    return getActiveDisconnectStateByPlayerId(disconnectPresence, nowMs);
  }, [disconnectPresence, nowMs]);
  const idleStateByPlayerId = useMemo(() => {
    return getActiveIdleStateByPlayerId(idlePresence, nowMs);
  }, [idlePresence, nowMs]);
  const hasDisconnectCountdown =
    Object.keys(disconnectStateByPlayerId).length > 0;
  const hasIdleCountdown = Boolean(activeIdlePlayerId);

  useEffect(() => {
    if (!hasDisconnectCountdown && !hasIdleCountdown) return;
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, [hasDisconnectCountdown, hasIdleCountdown]);

  return {
    timerSnapshot,
    disconnectPresence,
    idlePresence,
    activeIdlePlayerId,
    disconnectStateByPlayerId,
    idleStateByPlayerId
  };
}
