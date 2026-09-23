"use client";

import { useEffect, useState } from "react";
import { Banner } from "../../../ui/Banner";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Panel } from "../../../ui/Panel";
import { CATANA_TABLE_BACKGROUND } from "../../theme/backgrounds";
import { sanitizeDisplayName } from "../../utils/playerIdentity";
import {
  getChallengeCountdownPresentation,
  startChallengeExpiryTicker,
} from "./friendChallengeCountdown";

function ChallengeExpiryCountdown({ expiresAt, nowMs }) {
  const [liveNowMs, setLiveNowMs] = useState(null);
  const presentation = getChallengeCountdownPresentation({
    expiresAt,
    nowMs,
    liveNowMs,
  });

  useEffect(
    () =>
      startChallengeExpiryTicker({
        enabled: presentation.tickerEnabled,
        onTick: setLiveNowMs,
      }),
    [presentation.tickerEnabled]
  );

  return presentation.text;
}

function findSeat(players, seatId) {
  return players?.find((seat) => String(seat?.id) === String(seatId)) ?? null;
}

function ChallengeSeat({ label, seat, fallback }) {
  const displayName = sanitizeDisplayName(seat?.name) || fallback;

  return (
    <div className="settlex-ui-inset min-w-0 px-ui-4 py-ui-3">
      <div className="settlex-ui-label">
        {label}
      </div>
      <div className="mt-ui-1 break-words type-action text-ink-primary">
        {displayName}
      </div>
    </div>
  );
}

function ChallengeStatusBanner({ error, expiresAt, nowMs }) {
  if (error) {
    return (
      <Banner
        variant="danger"
        title="Challenge error"
        body={error}
        className="mt-ui-4"
      />
    );
  }

  return (
    <Banner
      variant="neutral"
      title="Private invite"
      body={<ChallengeExpiryCountdown expiresAt={expiresAt} nowMs={nowMs} />}
      className="mt-ui-4"
    />
  );
}

export function PendingFriendChallengeScreen({
  mode,
  matchID,
  challengeUrl,
  match,
  challengeState,
  playerName,
  setPlayerName,
  joinPending,
  cancelPending,
  isLoadingMatch,
  error,
  nowMs,
  onJoin,
  onCancel,
  onRefresh,
  onBackToLobby,
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const players = match?.players ?? [];
  const inviterSeat = findSeat(players, challengeState?.inviterSeatId);
  const inviteeSeat = findSeat(players, challengeState?.inviteeSeatId);
  const [absoluteChallengeUrl, setAbsoluteChallengeUrl] = useState(challengeUrl);

  useEffect(() => {
    setAbsoluteChallengeUrl(
      new URL(challengeUrl, window.location.origin).toString()
    );
  }, [challengeUrl]);

  const isInviter = mode === "inviter";
  const isExpired = mode === "expired";
  const title = isExpired
    ? "Challenge expired"
    : isInviter
    ? "Challenge created"
    : "Friend challenge";
  const subtitle = isExpired
    ? "This invite is no longer available."
    : isInviter
    ? "Share this link. The game starts here as soon as your friend joins."
    : "Pick a username, then join this game.";

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(absoluteChallengeUrl);
      setCopyStatus("Copied");
    } catch (err) {
      setCopyStatus("Copy failed");
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden text-ink-primary"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div
        className="absolute inset-0 opacity-35 blur-[1px]"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 aspect-square w-[min(82vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-pill border-[length:var(--settlex-ui-space-8)] border-decoration-ring shadow-[0_0_0_1px_rgba(255,255,255,0.36),0_28px_90px_-40px_rgba(15,23,42,0.62)]" />
        <div className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-panel border border-decoration-edge bg-decoration-fill" />
      </div>
      <div className="absolute inset-0 bg-decoration-wash backdrop-blur-[2px]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-ui-4 py-ui-8">
        <Panel bodyClassName="p-ui-5 sm:p-ui-6" className="w-full">
          <div className="grid gap-ui-6 md:grid-cols-[1fr_1.05fr] md:items-center">
            <div>
              <div className="settlex-ui-label">
                Settlehex game
              </div>
              <h1 className="mt-ui-2 type-title text-ink-primary">
                {title}
              </h1>
              <p className="mt-ui-3 max-w-md type-body-small text-ink-secondary">
                {subtitle}
              </p>

              <div className="mt-ui-5 grid gap-ui-3 sm:grid-cols-2">
                <ChallengeSeat
                  label="Host"
                  seat={inviterSeat}
                  fallback="Waiting host"
                />
                <ChallengeSeat
                  label="Friend"
                  seat={inviteeSeat}
                  fallback="Open seat"
                />
              </div>

              {!isExpired ? (
                <ChallengeStatusBanner
                  error={error}
                  expiresAt={challengeState?.expiresAt}
                  nowMs={nowMs}
                />
              ) : error ? (
                <ChallengeStatusBanner error={error} />
              ) : null}
            </div>

            <div className="min-w-0 border-t border-edge-subtle pt-ui-6 md:border-l md:border-t-0 md:pl-ui-6 md:pt-0">
              {isInviter ? (
                <div className="grid gap-ui-4">
                  <label className="grid gap-ui-2 type-label text-ink-secondary">
                    Invite link
                    <div className="flex gap-ui-2">
                      <input
                        readOnly
                        value={absoluteChallengeUrl}
                        className="settlex-ui-field min-w-0 flex-1"
                        aria-label="Invite link"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        className="shrink-0"
                        onClick={copyInvite}
                      >
                        {copyStatus || "Copy"}
                      </Button>
                    </div>
                  </label>
                  <Button
                    type="button"
                    size="lg"
                    variant="danger"
                    className="w-full"
                    disabled={cancelPending}
                    onClick={onCancel}
                  >
                    {cancelPending ? "Canceling..." : "Cancel challenge"}
                  </Button>
                </div>
              ) : isExpired ? (
                <div className="grid gap-ui-3">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={onBackToLobby}
                  >
                    Back to lobby
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="w-full"
                    disabled={isLoadingMatch}
                    onClick={onRefresh}
                  >
                    {isLoadingMatch ? "Refreshing..." : "Refresh"}
                  </Button>
                </div>
              ) : (
                <form className="grid gap-ui-4" onSubmit={onJoin}>
                  <label className="grid gap-ui-2 type-label text-ink-secondary">
                    Username
                    <Input
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      placeholder="Player"
                      autoComplete="nickname"
                      maxLength={28}
                      pattern="[A-Za-z0-9_]+"
                      title="Use English letters, numbers, and underscores only."
                      required
                      className="text-center"
                    />
                  </label>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={joinPending || !playerName.trim()}
                  >
                    {joinPending ? "Joining..." : "Join game"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    className="w-full"
                    onClick={onBackToLobby}
                  >
                    Back to lobby
                  </Button>
                </form>
              )}

              <div className="mt-ui-4 break-all border-t border-edge-subtle pt-ui-4 text-center type-caption text-ink-secondary">
                Game {matchID}
              </div>
            </div>
          </div>
        </Panel>
      </main>
    </div>
  );
}
