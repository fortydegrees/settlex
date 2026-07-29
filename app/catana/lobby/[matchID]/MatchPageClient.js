"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { InterruptedDuelRecovery } from "./InterruptedDuelRecovery";
import { LiveMatchLoadingShell } from "./LiveMatchLoadingShell";
import { OpenMatchRoom } from "./OpenMatchRoom";
import { PendingFriendChallengeScreen } from "./PendingFriendChallengeScreen";
import { provisionFriendChallengeGuestIdentity } from "./friendChallengeClient";
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
import {
  buildInterruptedDuelLeavePayload,
  buildPufferBotJoinPayload,
  resolveInterruptedDuelLeaveFailure,
  resolveLiveMatchClientMode,
  resolveOpenSeatSelection,
} from "../matchRoomState";

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

    return provisionFriendChallengeGuestIdentity({
      ensureAnonymousSession: ensureBetterAuthSession,
      upsertGuestIdentity: () =>
        appRequest({
          route: "/api/account/guest",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: nextName,
              avatarEmoji: (() => {
                try {
                  return (
                    window.localStorage.getItem(PLAYER_EMOJI_STORAGE_KEY) || "😀"
                  );
                } catch (err) {
                  return "😀";
                }
              })(),
              avatarColor: (() => {
                try {
                  return (
                    window.localStorage.getItem(PLAYER_COLOR_STORAGE_KEY) ||
                    "royal"
                  );
                } catch (err) {
                  return "royal";
                }
              })(),
            }),
          },
        }),
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
  const clientMode = resolveLiveMatchClientMode({
    interruptedDuel,
    credentials,
    playerID,
    isSpectating,
  });

  useEffect(() => {
    const nextPlayerID = resolveOpenSeatSelection({
      credentials,
      pendingChallengeState,
      spectatorMode,
      openSeats,
      playerID,
    });
    if (nextPlayerID !== playerID) setPlayerID(nextPlayerID);
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
            body: JSON.stringify(
              buildPufferBotJoinPayload({ matchID, seat })
            ),
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
          body: JSON.stringify(buildInterruptedDuelLeavePayload({
            matchID,
            playerID,
            credentials,
          })),
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
      const failure = resolveInterruptedDuelLeaveFailure(error);
      if (failure.refreshMatch) {
        await refreshMatch();
        return;
      }
      setError(failure.message);
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

  if (clientMode === "interrupted") {
    return (
      <InterruptedDuelRecovery
        pending={recoveryPending}
        error={error}
        onReturnToLobby={() => leaveInterruptedDuel()}
        onLookAgain={() => leaveInterruptedDuel({ lookAgain: true })}
      />
    );
  }

  if (clientMode === "player") {
    return (
      <CatanClient
        matchID={matchID}
        playerID={playerID}
        credentials={credentials}
        matchMetadata={match?.players ?? []}
      />
    );
  }

  if (clientMode === "spectator") {
    return (
      <CatanClient
        matchID={matchID}
        playerID={null}
        matchMetadata={match?.players ?? []}
      />
    );
  }

  return (
    <OpenMatchRoom
      matchID={matchID}
      gameServer={gameServer}
      match={match}
      openSeats={openSeats}
      hasTakenSeats={hasTakenSeats}
      playerName={playerName}
      playerID={playerID}
      isLoadingMatch={isLoadingMatch}
      joinPending={joinPending}
      botFillPending={botFillPending}
      error={error}
      onPlayerNameChange={setPlayerName}
      onSeatChange={(nextPlayerID) => {
        setSpectatorMode(false);
        setPlayerID(nextPlayerID);
      }}
      onJoin={joinSeat}
      onSpectate={spectateMatch}
      onRefresh={refreshMatch}
      onFillBots={fillOpenSeatsWithBots}
    />
  );
}
