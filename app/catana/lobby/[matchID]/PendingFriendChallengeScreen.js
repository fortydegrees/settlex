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
    <div className="settlex-ui-inset min-w-0 px-4 py-3">
      <div className="settlex-ui-label">
        {label}
      </div>
      <div className="mt-1 break-words text-base font-semibold text-slate-900">
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
        className="mt-4"
      />
    );
  }

  return (
    <Banner
      variant="neutral"
      title="Private invite"
      body={<ChallengeExpiryCountdown expiresAt={expiresAt} nowMs={nowMs} />}
      className="mt-4"
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
      className="relative min-h-screen overflow-hidden text-slate-900"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div
        className="absolute inset-0 opacity-35 blur-[1px]"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 aspect-square w-[min(82vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2rem] border-white/28 shadow-[0_0_0_1px_rgba(255,255,255,0.36),0_28px_90px_-40px_rgba(15,23,42,0.62)]" />
        <div className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2.2rem] border border-white/38 bg-white/18" />
      </div>
      <div className="absolute inset-0 bg-white/[0.08] backdrop-blur-[2px]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8">
        <Panel bodyClassName="p-5 sm:p-6" className="w-full">
          <div className="grid gap-6 md:grid-cols-[1fr_1.05fr] md:items-center">
            <div>
              <div className="settlex-ui-label">
                Settlehex game
              </div>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-700">
                {subtitle}
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

            <div className="min-w-0 border-t border-blue-100 pt-6 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              {isInviter ? (
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Invite link
                    <div className="flex gap-2">
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
                <div className="grid gap-3">
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
                <form className="grid gap-4" onSubmit={onJoin}>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
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
                      className="text-center text-base font-semibold"
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

              <div className="mt-4 break-all border-t border-blue-100 pt-4 text-center text-xs font-medium text-slate-600">
                Game {matchID}
              </div>
            </div>
          </div>
        </Panel>
      </main>
    </div>
  );
}
