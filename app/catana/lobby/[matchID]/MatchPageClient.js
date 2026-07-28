"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { authClient } from "../../../../lib/client/authClient";
import {
  isFriendChallengeMatch,
  resolveFriendChallengeState,
} from "../../../../lib/server/matches/friendChallenge.js";
import { Catan } from "../../Game";
import { PostgameGameBoard } from "../../../replays/PostgameGameBoard";
import { GlassPillButton } from "../../components/GlassPillButton";
import { Banner } from "../../../ui/Banner";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { Panel } from "../../../ui/Panel";
import { Select } from "../../../ui/Select";
import { LiveMatchLoadingShell } from "./LiveMatchLoadingShell";
import { CATANA_TABLE_BACKGROUND } from "../../theme/backgrounds";
import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch
} from "../../utils/activeMatchStorage";
import { clearPendingFriendChallenge } from "../../utils/pendingFriendChallenge";
import { sanitizeDisplayName } from "../../utils/playerIdentity";
import {
  getGameServerOrigin,
} from "../../utils/serverOrigins";
import { isInterruptedCredentialedDuel } from "../interruptedDuel";

const BOT_NAME_PREFIX = "Puffer";
const PLAYER_NAME_STORAGE_KEY = "catana:lobby:playerName";
const PLAYER_EMOJI_STORAGE_KEY = "catana:lobby:playerEmoji";
const PLAYER_COLOR_STORAGE_KEY = "catana:lobby:playerColor";

const safeJson = async (res) => {
  try {
    return await res.json();
  } catch (err) {
    return null;
  }
};

const apiRequest = async ({ baseUrl, route, init }) => {
  const res = await fetch(`${baseUrl}${route}`, init);
  if (res.ok) return safeJson(res);

  const details = await safeJson(res);
  const message =
    details?.error || details?.message || `HTTP ${res.status} ${res.statusText}`;
  throw Object.assign(new Error(message), {
    status: res.status,
    code: details?.code,
  });
};

const appRequest = ({ route, init }) => apiRequest({ baseUrl: "", route, init });

function seatLabel(seat) {
  if (!seat) return "Seat";
  const id = Number.isFinite(Number(seat.id)) ? Number(seat.id) : null;
  if (!seat.name) return id != null ? `Open Seat ${id + 1}` : "Open Seat";
  return sanitizeDisplayName(seat.name) || seat.name;
}

function normalizeMatch(raw) {
  if (!raw) return null;
  const playersObj = raw?.players || {};
  const players = Object.values(playersObj).sort((a, b) => (a?.id ?? 0) - (b?.id ?? 0));
  return {
    matchID: raw?.matchID,
    gameName: raw?.gameName,
    metadata: raw?.metadata,
    setupData: raw?.setupData,
    players,
  };
}

function formatChallengeExpiry(expiresAt, nowMs) {
  if (!expiresAt) return "a few minutes";
  const expiresAtDate = new Date(expiresAt);
  if (Number.isNaN(expiresAtDate.getTime())) return "a few minutes";
  if (!Number.isFinite(nowMs)) return "soon";

  const remainingSeconds = Math.max(
    0,
    Math.ceil((expiresAtDate.getTime() - nowMs) / 1000)
  );
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function ChallengeExpiryCountdown({ expiresAt }) {
  const [nowMs, setNowMs] = useState(null);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const id = setInterval(updateNow, 1000);
    return () => clearInterval(id);
  }, []);

  if (nowMs == null) {
    return "This challenge expires soon.";
  }

  return `This challenge expires in ${formatChallengeExpiry(expiresAt, nowMs)}.`;
}

function findSeat(players, seatId) {
  return players?.find((seat) => String(seat?.id) === String(seatId)) ?? null;
}

function ChallengeSeat({ label, seat, fallback }) {
  const displayName = sanitizeDisplayName(seat?.name) || fallback;

  return (
    <div className="rounded-[1.05rem] border border-white/46 bg-white/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.48)]">
      <div className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 truncate text-base font-black text-slate-900">
        {displayName}
      </div>
    </div>
  );
}

function ChallengeStatusBanner({ error, expiresAt }) {
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
      body={<ChallengeExpiryCountdown expiresAt={expiresAt} />}
      className="mt-4"
    />
  );
}

function PendingFriendChallengeScreen({
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
        <Panel bodyClassName="p-5 sm:p-6 md:p-8" className="w-full">
          <div className="grid gap-6 md:grid-cols-[1fr_1.05fr] md:items-center">
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-lime-700">
                Settlehex game
              </div>
              <h1 className="mt-2 text-3xl font-black leading-none text-slate-950 sm:text-4xl">
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
                />
              ) : error ? (
                <ChallengeStatusBanner error={error} />
              ) : null}
            </div>

            <div className="rounded-[1.25rem] border border-white/46 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-xl sm:p-5">
              {isInviter ? (
                <div className="grid gap-4">
                  <label className="grid gap-1.5 text-sm font-black text-slate-700">
                    Invite link
                    <div className="flex overflow-hidden rounded-[1rem] border border-white/58 bg-white/64 shadow-inner">
                      <input
                        readOnly
                        value={absoluteChallengeUrl}
                        className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-800 outline-none"
                        aria-label="Invite link"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        className="rounded-none border-0"
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
                  <label className="grid gap-1.5 text-sm font-black text-slate-700">
                    Username
                    <Input
                      value={playerName}
                      onChange={(event) => setPlayerName(event.target.value)}
                      placeholder="Player"
                      autoComplete="nickname"
                      maxLength={28}
                      className="text-center text-base font-black"
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

              <div className="mt-4 border-t border-white/58 pt-4 text-center text-[0.72rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                Game {matchID}
              </div>
            </div>
          </div>
        </Panel>
      </main>
    </div>
  );
}

export function MatchPageClient({
  matchID,
  initialPlayerID,
  initialCredentials,
  initialLiveMatch,
}) {
  const router = useRouter();

  const [playerName, setPlayerName] = useState("Visitor");
  const [match, setMatch] = useState(() => normalizeMatch(initialLiveMatch));
  const [isLoadingMatch, setIsLoadingMatch] = useState(false);
  const [error, setError] = useState("");

  const [playerID, setPlayerID] = useState(initialPlayerID ?? "");
  const [credentials, setCredentials] = useState(initialCredentials ?? null);
  const [joinPending, setJoinPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [botFillPending, setBotFillPending] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState(false);

  const gameServer = useMemo(() => getGameServerOrigin(), []);
  const challengeUrl = `/g/${matchID}`;
  const CatanClient = useMemo(() => {
    return Client({
      game: Catan,
      board: PostgameGameBoard,
      multiplayer: SocketIO({ server: gameServer }),
      loading: LiveMatchLoadingShell,
      debug: false,
    });
  }, [gameServer]);
  const isFriendChallenge = useMemo(
    () => Boolean(match && isFriendChallengeMatch(match)),
    [match]
  );
  const friendChallengeState = useMemo(() => {
    if (!match || !isFriendChallenge) return null;
    return resolveFriendChallengeState(match, { now: new Date() });
  }, [isFriendChallenge, match]);
  const pendingChallengeState =
    friendChallengeState?.status === "pending" ? friendChallengeState : null;
  const expiredChallengeState =
    friendChallengeState?.status === "expired" ? friendChallengeState : null;
  const pendingChallengeMatchID = pendingChallengeState?.matchID ?? null;
  const isChallengeInviter = Boolean(
    pendingChallengeState &&
      credentials &&
      String(playerID) === String(pendingChallengeState.inviterSeatId)
  );

  const refreshMatch = useCallback(async () => {
    setIsLoadingMatch(true);
    setError("");
    try {
      const data = await appRequest({
        route: `/api/matches/${matchID}`,
      });
      setMatch(normalizeMatch(data));
    } catch (err) {
      setError(err?.message || "Failed to load match.");
      setMatch(null);
    } finally {
      setIsLoadingMatch(false);
    }
  }, [matchID]);

  const ensureBetterAuthSession = useCallback(async () => {
    const current = await authClient.getSession();
    if (current?.data?.user?.id) {
      return current.data;
    }

    const created = await authClient.signIn.anonymous();
    if (created?.error) {
      throw new Error(created.error.message || "Failed to start guest session.");
    }

    if (!created?.data?.user?.id) {
      throw new Error("Failed to start guest session.");
    }

    return created.data;
  }, []);

  const upsertGuestIdentity = useCallback(async () => {
    const nextName = playerName.trim();
    if (!nextName) {
      throw new Error("Pick a player name first.");
    }

    await ensureBetterAuthSession();

    return appRequest({
      route: "/api/account/guest",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: nextName,
          avatarEmoji: (() => {
            try {
              return window.localStorage.getItem(PLAYER_EMOJI_STORAGE_KEY) || "😀";
            } catch (err) {
              return "😀";
            }
          })(),
          avatarColor: (() => {
            try {
              return window.localStorage.getItem(PLAYER_COLOR_STORAGE_KEY) || "royal";
            } catch (err) {
              return "royal";
            }
          })(),
        }),
      },
    });
  }, [ensureBetterAuthSession, playerName]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PLAYER_NAME_STORAGE_KEY);
      if (stored) setPlayerName(stored);
    } catch (err) {
      // ignore
    }
    appRequest({ route: "/api/account/me" })
      .then((response) => {
        if (response?.account?.currentUsername) {
          setPlayerName(response.account.currentUsername);
        }
      })
      .catch(() => {
        /* ignore */
      });
    refreshMatch();
  }, [refreshMatch]);

  useEffect(() => {
    if (!playerID) return;
    if (credentials) return;
    try {
      const storedCreds = window.localStorage.getItem(
        getCredentialsStorageKey({ matchID, playerID })
      );
      if (storedCreds) setCredentials(storedCreds);
    } catch (err) {
      // ignore
    }
  }, [credentials, matchID, playerID]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
    } catch (err) {
      // ignore
    }
  }, [playerName]);

  useEffect(() => {
    if (!credentials) return;
    if (playerID == null || playerID === "") return;

    const seatedPlayer = match?.players?.find(
      (seat) => String(seat?.id) === String(playerID)
    );
    const persistedName =
      sanitizeDisplayName(seatedPlayer?.name) ||
      sanitizeDisplayName(playerName) ||
      undefined;

    writeLastActiveMatch(window.localStorage, {
      matchID,
      playerID: String(playerID),
      playerName: persistedName
    });
  }, [credentials, match, matchID, playerID, playerName]);

  useEffect(() => {
    if (!pendingChallengeMatchID) return undefined;

    const id = setInterval(() => {
      void refreshMatch();
    }, 1500);
    return () => clearInterval(id);
  }, [pendingChallengeMatchID, refreshMatch]);

  const openSeats = useMemo(() => {
    if (!match?.players) return [];
    return match.players.filter((p) => !p?.name && p?.id != null);
  }, [match]);
  const hasTakenSeats = useMemo(
    () => Boolean(match?.players?.some((seat) => seat?.name)),
    [match]
  );
  const isFullMatch = Boolean(match?.players?.length) && openSeats.length === 0;
  const isSpectating = !credentials && (spectatorMode || isFullMatch);
  const interruptedDuel = isInterruptedCredentialedDuel({
    match,
    playerID,
    credentials,
  });

  useEffect(() => {
    if (pendingChallengeState) return;
    if (spectatorMode) return;
    if (credentials) return;
    if (openSeats.length === 0) return;
    const openSeatIds = new Set(openSeats.map((seat) => String(seat.id)));
    const current = String(playerID || "");
    if (!current || !openSeatIds.has(current)) {
      setPlayerID(String(openSeats[0].id));
    }
  }, [credentials, pendingChallengeState, playerID, openSeats, spectatorMode]);

  const acceptFriendChallenge = async (event) => {
    event.preventDefault();
    if (!pendingChallengeState?.inviteeSeatId) {
      setError("This challenge is no longer available.");
      return;
    }
    if (!playerName || !playerName.trim()) {
      setError("Pick a player name first.");
      return;
    }

    setSpectatorMode(false);
    setJoinPending(true);
    setError("");
    try {
      const accountResponse = await upsertGuestIdentity();
      const accepted = await appRequest({
        route: `/api/challenges/${matchID}/accept`,
        init: {
          method: "POST",
        },
      });

      const nextPlayerID = String(
        accepted?.playerID ?? pendingChallengeState.inviteeSeatId
      );
      const nextCreds = accepted?.playerCredentials;
      if (!nextCreds) {
        throw new Error("Join succeeded but returned no credentials.");
      }

      const account = accountResponse?.account ?? null;
      const nextPlayerName =
        sanitizeDisplayName(account?.currentUsername) ||
        sanitizeDisplayName(playerName) ||
        undefined;

      try {
        window.localStorage.setItem(
          getCredentialsStorageKey({ matchID, playerID: nextPlayerID }),
          nextCreds
        );
        writeLastActiveMatch(window.localStorage, {
          matchID,
          playerID: nextPlayerID,
          playerName: nextPlayerName,
        });
        clearPendingFriendChallenge(window.localStorage);
      } catch (err) {
        // ignore
      }

      setPlayerID(nextPlayerID);
      setCredentials(nextCreds);
      if (nextPlayerName) {
        setPlayerName(nextPlayerName);
      }
      router.replace(`/g/${matchID}`);
      await refreshMatch();
    } catch (err) {
      setError(err?.message || "Failed to join challenge.");
      await refreshMatch();
    } finally {
      setJoinPending(false);
    }
  };

  const cancelFriendChallenge = useCallback(async () => {
    if (!pendingChallengeState?.inviterSeatId) return;

    setCancelPending(true);
    setError("");
    try {
      const inviterSeatId = String(pendingChallengeState.inviterSeatId);
      let inviterCredentials = credentials;

      try {
        inviterCredentials =
          inviterCredentials ||
          window.localStorage.getItem(
            getCredentialsStorageKey({ matchID, playerID: inviterSeatId })
          );
      } catch (err) {
        // ignore
      }

      if (!inviterCredentials) {
        throw new Error("Missing challenge credentials. Refresh and try again.");
      }

      await appRequest({
        route: `/api/challenges/${matchID}/cancel`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credentials: inviterCredentials,
          }),
        },
      });

      try {
        clearPendingFriendChallenge(window.localStorage);
        window.localStorage.removeItem(
          getCredentialsStorageKey({ matchID, playerID: inviterSeatId })
        );
        const activeMatch = readLastActiveMatch(window.localStorage);
        if (
          activeMatch?.matchID === matchID &&
          activeMatch?.playerID === inviterSeatId
        ) {
          clearLastActiveMatch(window.localStorage);
        }
      } catch (err) {
        // ignore
      }

      router.replace("/");
    } catch (err) {
      setError(err?.message || "Failed to cancel challenge.");
      await refreshMatch();
    } finally {
      setCancelPending(false);
    }
  }, [credentials, matchID, pendingChallengeState, refreshMatch, router]);

  const goBackToLobby = useCallback(() => {
    router.push("/");
  }, [router]);

  const joinSeat = async (event) => {
    event.preventDefault();
    setSpectatorMode(false);
    if (!playerName || !playerName.trim()) {
      setError("Pick a player name first.");
      return;
    }
    if (!playerID && playerID !== "0") {
      setError("Pick an open seat.");
      return;
    }

    setJoinPending(true);
    setError("");
    try {
      const account = await upsertGuestIdentity();
      const joined = await appRequest({
        route: "/api/matches/join",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchID,
            playerID: String(playerID),
          }),
        },
      });

      const nextCreds = joined?.playerCredentials;
      if (!nextCreds) throw new Error("Join succeeded but returned no credentials.");

      try {
        window.localStorage.setItem(
          getCredentialsStorageKey({ matchID, playerID }),
          nextCreds
        );
      } catch (err) {
        // ignore
      }

      setCredentials(nextCreds);
      if (account?.account?.currentUsername) {
        setPlayerName(account.account.currentUsername);
      }
      router.replace(`/g/${matchID}`);
      await refreshMatch();
    } catch (err) {
      setError(err?.message || "Failed to join.");
      await refreshMatch();
    } finally {
      setJoinPending(false);
    }
  };

  const spectateMatch = useCallback(() => {
    setError("");
    setCredentials(null);
    setPlayerID("");
    setSpectatorMode(true);
    router.replace(`/g/${matchID}`);
  }, [matchID, router]);

  const fillOpenSeatsWithBots = async () => {
    if (openSeats.length === 0) return;
    setBotFillPending(true);
    setError("");

    try {
      await upsertGuestIdentity();
      for (const seat of openSeats) {
        await appRequest({
          route: "/api/matches/join",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchID,
              playerID: String(seat.id),
              participantType: "bot",
              botKey: "puffer",
              botName: `${BOT_NAME_PREFIX} ${Number(seat.id) + 1}`,
              avatarEmoji: "🤖",
              avatarColor: "royal",
            }),
          },
        });
      }
      await refreshMatch();
    } catch (err) {
      setError(err?.message || "Failed to fill open seats with bots.");
      await refreshMatch();
    } finally {
      setBotFillPending(false);
    }
  };

  const leaveInterruptedDuel = async ({ lookAgain = false } = {}) => {
    setRecoveryPending(true);
    setError("");
    try {
      await appRequest({
        route: "/api/matches/leave",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchID,
            playerID,
            credentials,
            intent: "matchmaking_cancel",
          }),
        },
      });

      try {
        window.localStorage.removeItem(
          getCredentialsStorageKey({ matchID, playerID })
        );
        const activeMatch = readLastActiveMatch(window.localStorage);
        if (
          activeMatch?.matchID === matchID &&
          activeMatch?.playerID === String(playerID)
        ) {
          clearLastActiveMatch(window.localStorage);
        }
      } catch (err) {
        /* Local cleanup is best-effort after the server releases the seat. */
      }

      setCredentials(null);
      router.replace(lookAgain ? "/?playOnline=1" : "/");
    } catch (error) {
      if (error?.code === "MATCH_FOUND") {
        await refreshMatch();
        return;
      }
      setError(error?.message || "Failed to leave the interrupted duel.");
    } finally {
      setRecoveryPending(false);
    }
  };

  if (pendingChallengeState || expiredChallengeState) {
    return (
      <PendingFriendChallengeScreen
        mode={
          expiredChallengeState
            ? "expired"
            : isChallengeInviter
            ? "inviter"
            : "invitee"
        }
        matchID={matchID}
        challengeUrl={challengeUrl}
        match={match}
        challengeState={pendingChallengeState ?? expiredChallengeState}
        playerName={playerName}
        setPlayerName={setPlayerName}
        joinPending={joinPending}
        cancelPending={cancelPending}
        isLoadingMatch={isLoadingMatch}
        error={error}
        onJoin={acceptFriendChallenge}
        onCancel={cancelFriendChallenge}
        onRefresh={refreshMatch}
        onBackToLobby={goBackToLobby}
      />
    );
  }

  if (interruptedDuel) {
    return (
      <div
        className="min-h-screen"
        style={{ background: CATANA_TABLE_BACKGROUND }}
      >
        <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
          <Panel bodyClassName="p-6 md:p-8">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-700">
              Match update
            </div>
            <h1 className="mt-3 text-3xl font-bold text-slate-900 drop-shadow-sm">
              Duel interrupted
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              The other player left before the duel could begin. You can return
              to the lobby or look for another opponent now.
            </p>
            {error ? (
              <Banner
                variant="danger"
                title="Couldn’t leave the duel"
                body={error}
                className="mt-5"
              />
            ) : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                className="w-full"
                disabled={recoveryPending}
                onClick={() => leaveInterruptedDuel()}
              >
                Return to lobby
              </Button>
              <Button
                className="w-full"
                disabled={recoveryPending}
                onClick={() => leaveInterruptedDuel({ lookAgain: true })}
              >
                {recoveryPending ? "Checking duel…" : "Look again"}
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (credentials && playerID) {
    return (
      <CatanClient
        matchID={matchID}
        playerID={playerID}
        credentials={credentials}
        matchMetadata={match?.players ?? []}
      />
    );
  }

  if (isSpectating) {
    return (
      <CatanClient
        matchID={matchID}
        playerID={null}
        matchMetadata={match?.players ?? []}
      />
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <Panel bodyClassName="p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-700">
                Settlehex Room
              </div>
              <h1 className="mt-2 text-2xl font-bold text-slate-900 drop-shadow-sm">
                {matchID}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="text-sm font-semibold text-slate-800 underline decoration-white/60 hover:decoration-white"
                >
                  Back to lobby
                </Link>
                <Link
                  href="/account"
                  className="text-sm font-semibold text-slate-800 underline decoration-white/60 hover:decoration-white"
                >
                  Account
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {hasTakenSeats ? (
                <GlassPillButton onClick={spectateMatch}>
                  Spectate
                </GlassPillButton>
              ) : null}
              <GlassPillButton onClick={refreshMatch} disabled={isLoadingMatch}>
                {isLoadingMatch ? "Refreshing…" : "Refresh"}
              </GlassPillButton>
            </div>
          </div>

          {error ? (
            <Banner
              variant="danger"
              title="Match error"
              body={error}
              className="mt-4"
            />
          ) : null}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Panel title="Join Seat">
              <form className="space-y-3" onSubmit={joinSeat}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-700">
                    Player name
                  </label>
                  <div className="mt-2">
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Visitor"
                      autoComplete="nickname"
                      maxLength={28}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-700">
                    Seat
                  </label>
                  <div className="mt-2">
                    <Select
                      value={playerID}
                      onChange={(e) => {
                        setSpectatorMode(false);
                        setPlayerID(e.target.value);
                      }}
                      disabled={openSeats.length === 0}
                    >
                      {openSeats.length === 0 ? (
                        <option value="">No open seats</option>
                      ) : null}
                      {openSeats.map((seat) => (
                        <option key={seat.id} value={String(seat.id)}>
                          {seatLabel(seat)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={joinPending || openSeats.length === 0}
                  className="w-full"
                >
                  {joinPending ? "Joining…" : "Join & Play"}
                </Button>
                <GlassPillButton
                  type="button"
                  onClick={fillOpenSeatsWithBots}
                  disabled={botFillPending || joinPending || openSeats.length === 0}
                >
                  {botFillPending ? "Adding Bots…" : "Fill Open Seats With Bots"}
                </GlassPillButton>
                <div className="text-xs text-slate-700/80">
                  Game server: <span className="font-mono">{gameServer}</span>
                </div>
              </form>
            </Panel>

            <Panel title="Seats">
              {isLoadingMatch && !match ? (
                <div className="h-24 rounded-lg bg-white/40 ring-1 ring-white/40 animate-pulse motion-reduce:animate-none" />
              ) : null}

              {match?.players ? (
                <div className="space-y-2">
                  {match.players.map((seat) => {
                    const taken = Boolean(seat.name);
                    const displayName = sanitizeDisplayName(seat.name) || seat.name;
                    return (
                      <div
                        key={seat.id}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ring-1 ${
                          taken
                            ? "bg-white/60 text-slate-800 ring-white/60"
                            : "bg-white/40 text-slate-700 ring-white/40"
                        }`}
                      >
                        <div className="text-sm font-semibold">
                          Seat {Number(seat.id) + 1}
                        </div>
                        <div className="text-sm">{taken ? displayName : "Open"}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg bg-white/40 p-4 text-sm text-slate-700">
                  Match details unavailable.
                </div>
              )}
            </Panel>
          </div>
        </Panel>
      </div>
    </div>
  );
}
