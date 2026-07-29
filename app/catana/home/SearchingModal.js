"use client";

import { useEffect, useState } from "react";
import { Button } from "../../ui/Button";
import { MatchAlertControl } from "../matchAlerts/MatchAlertControl";
import { getMatchmakingRescueStage } from "../matchmaking/matchmakingRescue.js";

export function SearchingModal({
  searchState,
  searchElapsedSeconds,
  matchAlertDisplay,
  matchAlertLoading = false,
  matchAlertError = "",
  isPufferTransitionPending,
  onMatchAlertAction,
  onCancel,
  onPlayPuffer
}) {
  const [rescueExpanded, setRescueExpanded] = useState(true);

  useEffect(() => {
    setRescueExpanded(true);
  }, [searchState?.startedAt]);

  if (!searchState && !isPufferTransitionPending) return null;

  const mins = Math.floor(searchElapsedSeconds / 60);
  const secs = searchElapsedSeconds % 60;
  const timeStr =
    mins > 0
      ? `${mins}:${String(secs).padStart(2, "0")}`
      : `0:${String(secs).padStart(2, "0")}`;
  const isStartingPuffer = isPufferTransitionPending && !searchState;
  const isMatchFound = searchState?.phase === "matchFound";
  const rescueStage = getMatchmakingRescueStage(searchElapsedSeconds);
  const showRescue =
    Boolean(searchState) &&
    !isMatchFound &&
    rescueStage !== "waiting" &&
    rescueExpanded;
  const title = isStartingPuffer
    ? "Starting Puffer"
    : isMatchFound
      ? "Match found"
      : "Finding a table";
  const subtitle = isStartingPuffer
    ? "Setting up a bot duel..."
    : isMatchFound
      ? "Loading board..."
      : `1v1 · ${timeStr}`;

  return (
    <div className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center bg-sky-700/[0.18] p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-[1.45rem] border border-white/[0.42] bg-white/[0.76] p-5 text-center shadow-[0_28px_80px_-35px_rgba(15,23,42,0.65)] backdrop-blur-xl">
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[1.15rem] bg-lime-500 text-base font-black text-white shadow-[0_18px_38px_-28px_rgba(63,98,18,0.9)]">
          Sx
        </div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">{subtitle}</p>
        {showRescue ? (
          <div className="mt-4 grid gap-3">
            <p className="text-left text-xs font-medium leading-relaxed text-slate-600">
              SettleHex is still in beta, so it can take a little while to find
              another player. You can keep your place here, or turn on Match
              alerts and come back when someone is looking.
            </p>
            <MatchAlertControl
              display={matchAlertDisplay}
              loading={matchAlertLoading}
              error={matchAlertError}
              onAction={onMatchAlertAction}
            />
            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setRescueExpanded(false)}
            >
              Keep waiting
            </Button>
          </div>
        ) : null}
        {searchState ? (
          <Button
            variant="secondary"
            size="md"
            className={`${showRescue ? "mt-2" : "mt-4"} w-full`}
            disabled={isMatchFound || isPufferTransitionPending}
            onClick={() => void onCancel()}
          >
            {isMatchFound ? "Loading board..." : "Cancel"}
          </Button>
        ) : null}
        {searchState && !isMatchFound && rescueStage === "puffer" ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-xs text-slate-600"
            disabled={isPufferTransitionPending}
            onClick={onPlayPuffer}
          >
            Play Puffer
          </Button>
        ) : null}
      </div>
    </div>
  );
}
