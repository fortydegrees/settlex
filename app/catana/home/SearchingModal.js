"use client";

import { useEffect, useState } from "react";
import { Button } from "../../ui/Button";
import { MatchAlertControl } from "../matchAlerts/MatchAlertControl";
import {
  getMatchmakingRescueStage,
  getSearchCancelPresentation,
} from "../matchmaking/matchmakingRescue.js";

export function SearchingModal({
  searchState,
  searchElapsedSeconds,
  matchAlertDisplay,
  matchAlertLoading = false,
  matchAlertError = "",
  isPufferTransitionPending,
  isSearchCancelPending = false,
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
  const cancelPresentation = getSearchCancelPresentation({
    isMatchFound,
    isPufferTransitionPending,
    isSearchCancelPending,
  });
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
    <div className="pointer-events-auto absolute inset-0 z-[60] grid place-items-center overflow-y-auto bg-surface-search-scrim p-ui-4 backdrop-blur-md">
      <div className="settlex-ui-pane max-h-full w-full max-w-sm overflow-y-auto p-ui-5 text-center sm:p-ui-6">
        <div className="mx-auto mb-ui-3 grid h-14 w-14 place-items-center rounded-control bg-surface-positive type-action text-ink-positive">
          Sx
        </div>
        <h2 className="type-title text-ink-primary">{title}</h2>
        <p className="mt-ui-1 type-action-small text-ink-secondary">{subtitle}</p>
        {showRescue ? (
          <div className="mt-ui-4 grid gap-ui-3">
            <p className="text-left type-body-small text-ink-secondary">
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
            className={`${showRescue ? "mt-ui-2" : "mt-ui-4"} w-full`}
            disabled={cancelPresentation.disabled}
            onClick={() => void onCancel()}
          >
            {cancelPresentation.label}
          </Button>
        ) : null}
        {searchState && !isMatchFound && rescueStage === "puffer" ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-ui-1 w-full"
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
