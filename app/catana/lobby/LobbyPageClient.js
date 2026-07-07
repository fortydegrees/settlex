"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "../../ui/Banner";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Panel } from "../../ui/Panel";
import { Select } from "../../ui/Select";
import {
  getPlayerColorOption,
  normalizePlayerColorId
} from "../theme/playerColors";
import { CATANA_TABLE_BACKGROUND } from "../theme/backgrounds";
import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch
} from "../utils/activeMatchStorage";
import {
  clearPendingFriendChallenge,
  restorePendingFriendChallenge,
  writePendingFriendChallenge
} from "../utils/pendingFriendChallenge";
import { sanitizeDisplayName } from "../utils/playerIdentity";
import { FriendChallengeModal } from "./FriendChallengeModal";
import { IdentityModal } from "./IdentityModal";
import { VersionBadge } from "./VersionBadge";
import {
  EMOJI_OPTIONS,
  buildSuggestedGuestIdentity,
  readStoredPlayerIdentity,
  writeStoredPlayerIdentity
} from "./playerIdentityStorage";

const BOT_NAME_PREFIX = "Puffer";
const isDevEnvironment = process.env.NODE_ENV !== "production";

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
  throw new Error(message);
};

const appRequest = ({ route, init }) => apiRequest({ baseUrl: "", route, init });

function normalizeMatch(raw) {
  const playersObj = raw?.players || {};
  const players = Object.values(playersObj).sort(
    (a, b) => (a?.id ?? 0) - (b?.id ?? 0)
  );
  return {
    matchID: raw?.matchID,
    gameName: raw?.gameName,
    players,
  };
}

/* ─── Searching modal ─────────────────────────────────── */

function SearchingModal({ onCancel, startedAt, phase = "searching" }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")}`
    : `0:${String(secs).padStart(2, "0")}`;
  const isMatchFound = phase === "matchFound";
  const title = isMatchFound ? "Match found!" : "Finding opponent…";
  const subtitle = isMatchFound ? "Loading board…" : `1v1 · ${timeStr}`;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xs rounded-xl bg-blue-200/95 p-8 text-center shadow-2xl ring-2 ring-slate-300">
        <div className="mb-4 flex items-center justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-3 w-3 rounded-full bg-lime-400"
              style={{
                animation: "searchPulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>

        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

        {onCancel && (
          <Button onClick={onCancel} variant="secondary" className="mt-6">
            Cancel
          </Button>
        )}
      </div>

      <style>{`
        @keyframes searchPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ─── Room row (for custom games) ─────────────────────── */

function SeatDots({ players }) {
  return (
    <div className="flex gap-1">
      {players.map((seat) => {
        const displayName = sanitizeDisplayName(seat.name);
        return (
          <span
            key={seat.id}
            className={`h-2.5 w-2.5 rounded-full ${
              seat.name
                ? "bg-lime-400 ring-1 ring-lime-300"
                : "bg-white/40 ring-1 ring-white/50"
            }`}
            title={seat.name ? displayName || `Player ${seat.id}` : "Open"}
          />
        );
      })}
    </div>
  );
}

function RoomRow({ match, onJoin, isPending }) {
  const openSeats = match.players.filter((p) => !p?.name && p?.id != null);
  const takenNames = match.players
    .filter((p) => p?.name)
    .map((p) => sanitizeDisplayName(p.name) || p.name);
  const firstOpenSeat = openSeats[0];
  const isFull = openSeats.length === 0;

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/40 px-4 py-3 ring-1 ring-white/50">
      <SeatDots players={match.players} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-slate-800">
            {takenNames.length}/{match.players.length}
          </span>
          {takenNames.length > 0 && (
            <span className="truncate text-xs text-slate-600">
              {takenNames.join(", ")}
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          {match.matchID}
        </span>
      </div>
      {isFull ? (
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-500">
          Full
        </span>
      ) : (
        <Button
          onClick={() =>
            onJoin({ matchID: match.matchID, playerID: String(firstOpenSeat.id) })
          }
          variant="secondary"
          disabled={isPending}
          size="sm"
          className="rounded-full px-4 py-1.5 text-xs"
        >
          {isPending ? "Joining…" : "Join"}
        </Button>
      )}
    </div>
  );
}

/* ─── Main lobby ──────────────────────────────────────── */

export function LobbyPageClient() {
  const router = useRouter();

  const [playerName, setPlayerName] = useState("");
  const [playerEmoji, setPlayerEmoji] = useState("");
  const [playerColor, setPlayerColor] = useState("");
  const [currentAccount, setCurrentAccount] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");

  // Identity gate
  const [showIdentity, setShowIdentity] = useState(false);
  const pendingActionRef = useRef(null);
  // Keep a synchronous ref so actions queued after identity submit read the fresh name
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const hasIdentity = Boolean(currentAccount?.currentUsername?.trim());

  // Matchmaking
  const [searchState, setSearchState] = useState(null);
  const [challengeState, setChallengeState] = useState(null);

  // Custom game
  const [showCustom, setShowCustom] = useState(false);
  const [createNumPlayers, setCreateNumPlayers] = useState(4);
  const [createPending, setCreatePending] = useState(false);
  const [scenarioStartPending, setScenarioStartPending] = useState(false);
  const [joinMatchID, setJoinMatchID] = useState("");
  const [joinSeat, setJoinSeat] = useState("0");
  const [joinPendingMatchID, setJoinPendingMatchID] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  /* ── Identity gate ── */

  const applyAccountIdentity = useCallback((account) => {
    if (!account) {
      setCurrentAccount(null);
      return;
    }

    const nextName = account.currentUsername ?? "";
    const nextEmoji = account.avatarEmoji ?? "";
    const nextColor = normalizePlayerColorId(account.avatarColor ?? "");

    setCurrentAccount(account);
    setPlayerName(nextName);
    setPlayerEmoji(nextEmoji);
    setPlayerColor(nextColor);
    playerNameRef.current = nextName;

    writeStoredPlayerIdentity(window.localStorage, {
      name: nextName,
      emoji: nextEmoji,
      color: nextColor,
    });
  }, []);

  const upsertGuestIdentity = useCallback(
    async ({ name, emoji, color, usernameSource = "custom" }) => {
      const normalizedColor = normalizePlayerColorId(color);
      const response = await appRequest({
        route: "/api/account/guest",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: name,
            usernameSource,
            avatarEmoji: emoji,
            avatarColor: normalizedColor,
          }),
        },
      });

      if (response?.account) {
        applyAccountIdentity(response.account);
      }

      return response?.account ?? null;
    },
    [applyAccountIdentity]
  );

  const restoreOrCreateAccount = useCallback(async () => {
    try {
      const current = await appRequest({ route: "/api/account/me" });
      if (current?.account) {
        applyAccountIdentity(current.account);
        return current.account;
      }
    } catch (err) {
      /* ignore */
    }

    const storedIdentity = readStoredPlayerIdentity(window.localStorage);
    if (!storedIdentity.name) {
      return null;
    }

    try {
      const suggestedIdentity = buildSuggestedGuestIdentity();
      return await upsertGuestIdentity({
        name: storedIdentity.name,
        emoji: storedIdentity.emoji || suggestedIdentity.emoji,
        color: storedIdentity.color || suggestedIdentity.color,
      });
    } catch (err) {
      return null;
    }
  }, [applyAccountIdentity, upsertGuestIdentity]);

  const createGeneratedGuestAccount = useCallback(async () => {
    const suggestedIdentity = buildSuggestedGuestIdentity();
    return upsertGuestIdentity({
      name: suggestedIdentity.name,
      usernameSource: "generated",
      emoji: suggestedIdentity.emoji,
      color: suggestedIdentity.color,
    });
  }, [upsertGuestIdentity]);

  const requireIdentity = (action) => {
    if (hasIdentity) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setShowIdentity(true);
  };

  const handleIdentitySubmit = async ({ name, emoji, color, usernameSource }) => {
    try {
      await upsertGuestIdentity({ name, emoji, color, usernameSource });
      setShowIdentity(false);
      if (pendingActionRef.current) {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        setTimeout(action, 0);
      }
    } catch (err) {
      setError(err?.message || "Failed to save account.");
    }
  };

  /* ── Data fetching ── */

  const refreshMatches = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await appRequest({
        route: "/api/matches/open",
      });
      const list = (data?.matches || []).map(normalizeMatch);
      setMatches(list.filter((m) => m.matchID));
    } catch (err) {
      /* silently fail for background refresh */
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const fetchSavedScenarios = useCallback(async () => {
    if (!isDevEnvironment) return;
    setIsLoadingScenarios(true);
    try {
      const res = await fetch("/api/scenarios", { cache: "no-store" });
      const json = await res.json();
      const scenarios = json?.scenarios || [];
      setSavedScenarios(scenarios);
      setSelectedScenarioId((current) => current || scenarios[0]?.id || "");
    } catch (err) {
      /* ignore */
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  useEffect(() => {
    const storedIdentity = readStoredPlayerIdentity(window.localStorage);
    if (storedIdentity.name) {
      setPlayerName(storedIdentity.name);
      playerNameRef.current = storedIdentity.name;
    }
    if (storedIdentity.emoji) setPlayerEmoji(storedIdentity.emoji);
    if (storedIdentity.color) setPlayerColor(storedIdentity.color);
    restoreOrCreateAccount();
    refreshMatches();
    fetchSavedScenarios();
  }, [fetchSavedScenarios, refreshMatches, restoreOrCreateAccount]);

  useEffect(() => {
    let cancelled = false;

    const restorePendingChallengeState = async () => {
      const restored = await restorePendingFriendChallenge({
        storage: window.localStorage,
        fetchImpl: fetch
      });

      if (cancelled || !restored) {
        return;
      }

      if (restored.status === "pending") {
        setChallengeState((current) => current ?? restored.challengeState);
        return;
      }

      if (restored.status === "accepted") {
        router.push(restored.href);
      }
    };

    void restorePendingChallengeState();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Auto-refresh when custom section is open
  useEffect(() => {
    if (!showCustom) return;
    const id = setInterval(refreshMatches, 2000);
    return () => clearInterval(id);
  }, [showCustom, refreshMatches]);

  useEffect(() => {
    if (!showCustom || !isDevEnvironment) return;
    fetchSavedScenarios();
  }, [fetchSavedScenarios, showCustom]);

  /* ── Matchmaking poll ── */

  useEffect(() => {
    if (!searchState?.matchID || searchState.playerID == null) return;

    const poll = async () => {
      try {
        const data = await appRequest({
          route: `/api/matches/${searchState.matchID}`,
        });
        const match = normalizeMatch(data);
        const allJoined = match.players.every((p) => p.name);
        if (allJoined) {
          setSearchState((current) =>
            current && current.matchID === searchState.matchID
              ? { ...current, phase: "matchFound" }
              : current
          );
          router.push(`/g/${searchState.matchID}`);
        }
      } catch (err) {
        /* keep polling */
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [router, searchState]);

  useEffect(() => {
    if (!challengeState?.matchID || challengeState.phase !== "waiting") return;

    const poll = async () => {
      try {
        const challenge = await appRequest({
          route: `/api/challenges/${challengeState.matchID}`,
        });

        if (challenge?.status === "accepted") {
          clearPendingFriendChallenge(window.localStorage);
          router.push(`/g/${challengeState.matchID}`);
          return;
        }

        if (challenge?.status === "expired") {
          try {
            if (challengeState.playerCredentials) {
              await appRequest({
                route: `/api/challenges/${challengeState.matchID}/cancel`,
                init: {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    credentials: challengeState.playerCredentials,
                  }),
                },
              });
            }
          } catch (err) {
            /* ignore cleanup errors */
          }

          clearPendingFriendChallenge(window.localStorage);
          const activeMatch = readLastActiveMatch(window.localStorage);
          if (
            activeMatch?.matchID === challengeState.matchID &&
            activeMatch?.playerID === String(challengeState.playerID)
          ) {
            clearLastActiveMatch(window.localStorage);
          }

          setChallengeState((current) =>
            current && current.matchID === challengeState.matchID
              ? { ...current, phase: "expired" }
              : current
          );
        }
      } catch (err) {
        /* keep polling */
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [challengeState, router]);

  /* ── Actions (all read from playerNameRef for fresh value) ── */

  const persistJoinedSeat = useCallback(
    ({ matchID, playerID, credentials, playerName: nextPlayerName }) => {
      if (!credentials) return;

      try {
        window.localStorage.setItem(
          getCredentialsStorageKey({ matchID, playerID }),
          credentials
        );
        writeLastActiveMatch(window.localStorage, {
          matchID,
          playerID: String(playerID),
          playerName:
            nextPlayerName ??
            currentAccount?.currentUsername ??
            playerNameRef.current,
        });
      } catch (err) {
        /* ignore */
      }
    },
    [currentAccount]
  );

  const ensureAccountSession = useCallback(async () => {
    if (currentAccount?.id) {
      return currentAccount;
    }

    return restoreOrCreateAccount();
  }, [currentAccount, restoreOrCreateAccount]);

  const ensureGeneratedGuestAccount = useCallback(async () => {
    const account = await ensureAccountSession();
    if (account?.id) {
      return account;
    }

    return createGeneratedGuestAccount();
  }, [createGeneratedGuestAccount, ensureAccountSession]);

  const joinRoom = async ({ matchID, playerID, onError }) => {
    if (!matchID) return;

    setJoinPendingMatchID(matchID);
    setError("");
    try {
      const account = await ensureAccountSession();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

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

      const credentials = joined?.playerCredentials;
      if (!credentials)
        throw new Error("Join succeeded but returned no credentials.");

      persistJoinedSeat({
        matchID,
        playerID: String(playerID),
        credentials,
        playerName: account.currentUsername,
      });

      router.push(`/g/${matchID}`);
    } catch (err) {
      setError(err?.message || "Failed to join room.");
      await refreshMatches();
      onError?.(err);
    } finally {
      setJoinPendingMatchID(null);
    }
  };

  const play = async () => {
    const startedAt = Date.now();
    setError("");
    setSearchState({
      matchID: null,
      playerID: null,
      startedAt,
      phase: "searching",
    });

    try {
      const data = await appRequest({
        route: "/api/matches/open?modeId=duel",
      });
      const allMatches = (data?.matches || []).map(normalizeMatch);
      const openMatch = allMatches.find(
        (m) =>
          m.players.length === 2 &&
          m.players.some((p) => p.name) &&
          m.players.some((p) => !p.name)
      );

      if (openMatch) {
        const openSeat = openMatch.players.find((p) => !p.name);
        await joinRoom({
          matchID: openMatch.matchID,
          playerID: String(openSeat.id),
          onError: () => setSearchState(null),
        });
        return;
      }

      const account = await ensureAccountSession();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/matches/create",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeId: "duel" }),
        },
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");

      persistJoinedSeat({
        matchID,
        playerID: "0",
        credentials: created?.playerCredentials,
        playerName: account.currentUsername,
      });

      setSearchState({
        matchID,
        playerID: "0",
        startedAt,
        phase: "searching",
      });
    } catch (err) {
      setSearchState(null);
      setError(err?.message || "Matchmaking failed.");
    }
  };

  const createFriendChallenge = async () => {
    setError("");

    try {
      const account = await ensureAccountSession();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/challenges/create",
        init: {
          method: "POST",
        },
      });

      if (!created?.matchID) {
        throw new Error("Create succeeded but returned no matchID.");
      }

      if (!created?.playerCredentials) {
        throw new Error("Create succeeded but returned no credentials.");
      }

      persistJoinedSeat({
        matchID: created.matchID,
        playerID: created.playerID,
        credentials: created.playerCredentials,
        playerName: account.currentUsername,
      });
      writePendingFriendChallenge(window.localStorage, {
        matchID: created.matchID,
        playerID: created.playerID
      });

      setChallengeState({
        ...created,
        phase: "waiting",
      });
    } catch (err) {
      setError(err?.message || "Failed to create challenge.");
    }
  };

  const playAgainstBot = async () => {
    setError("");

    try {
      const account = await ensureGeneratedGuestAccount();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/matches/create",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modeId: "duel" }),
        },
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");

      persistJoinedSeat({
        matchID,
        playerID: "0",
        credentials: created?.playerCredentials,
        playerName: account.currentUsername,
      });

      await appRequest({
        route: "/api/matches/join",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchID,
            playerID: "1",
            participantType: "bot",
            botKey: "puffer",
            botName: `${BOT_NAME_PREFIX} 2`,
            avatarEmoji: "🤖",
            avatarColor: "royal",
          }),
        },
      });

      router.push(`/g/${matchID}`);
    } catch (err) {
      setError(err?.message || "Failed to start bot match.");
    }
  };

  const cancelChallengeInvite = useCallback(async () => {
    if (!challengeState) {
      return;
    }

    try {
      if (challengeState.playerCredentials) {
        await appRequest({
          route: `/api/challenges/${challengeState.matchID}/cancel`,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              credentials: challengeState.playerCredentials,
            }),
          },
        });
      }
    } catch (err) {
      /* ignore cleanup errors */
    }

    clearPendingFriendChallenge(window.localStorage);

    const activeMatch = readLastActiveMatch(window.localStorage);
    if (
      activeMatch?.matchID === challengeState.matchID &&
      activeMatch?.playerID === String(challengeState.playerID)
    ) {
      clearLastActiveMatch(window.localStorage);
    }

    setChallengeState(null);
  }, [challengeState]);

  const cancelSearch = async () => {
    if (!searchState) return;
    if (!searchState.matchID || searchState.playerID == null) {
      setSearchState(null);
      return;
    }

    try {
      const credentials = window.localStorage.getItem(
        getCredentialsStorageKey({
          matchID: searchState.matchID,
          playerID: searchState.playerID,
        })
      );
      if (credentials) {
        await appRequest({
          route: "/api/matches/leave",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              matchID: searchState.matchID,
              playerID: searchState.playerID,
              credentials,
            }),
          },
        });
      }
    } catch (err) {
      /* ignore */
    }

    const activeMatch = readLastActiveMatch(window.localStorage);
    if (
      activeMatch?.matchID === searchState.matchID &&
      activeMatch?.playerID === String(searchState.playerID)
    ) {
      clearLastActiveMatch(window.localStorage);
    }

    setSearchState(null);
  };

  const createCustomRoom = async () => {
    const numPlayers = Number(createNumPlayers);
    if (!Number.isFinite(numPlayers) || numPlayers < 2 || numPlayers > 4) {
      setError("Choose 2–4 players.");
      return;
    }

    setCreatePending(true);
    setError("");
    try {
      const account = await ensureAccountSession();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/matches/create",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numPlayers }),
        },
      });
      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");
      persistJoinedSeat({
        matchID,
        playerID: created?.playerID ?? "0",
        credentials: created?.playerCredentials,
        playerName: account.currentUsername,
      });
      await refreshMatches();
      router.push(`/g/${matchID}`);
    } catch (err) {
      setError(err?.message || "Failed to create room.");
    } finally {
      setCreatePending(false);
    }
  };

  const startFromScenario = async () => {
    const selectedScenario = savedScenarios.find(
      (scenario) => scenario.id === selectedScenarioId
    );
    const scenarioState = selectedScenario?.data;
    const numPlayers = scenarioState?.core?.players?.length;

    if (!selectedScenario || !scenarioState) {
      setError("Choose a saved scenario.");
      return;
    }

    if (!Number.isFinite(numPlayers) || numPlayers < 2 || numPlayers > 4) {
      setError("Scenario player count is invalid.");
      return;
    }

    setScenarioStartPending(true);
    setError("");
    try {
      const account = await ensureAccountSession();
      if (!account?.id) {
        throw new Error("Pick a username first.");
      }

      const created = await appRequest({
        route: "/api/matches/create",
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            numPlayers,
            setupData: {
              devScenarioState: scenarioState
            }
          }),
        },
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");
      persistJoinedSeat({
        matchID,
        playerID: created?.playerID ?? "0",
        credentials: created?.playerCredentials,
        playerName: account.currentUsername,
      });
      await refreshMatches();
      router.push(`/g/${matchID}`);
    } catch (err) {
      setError(err?.message || "Failed to start scenario room.");
    } finally {
      setScenarioStartPending(false);
    }
  };

  const joinByCode = async (event) => {
    event.preventDefault();
    const matchID = joinMatchID.trim();
    if (!matchID) return;
    requireIdentity(() => joinRoom({ matchID, playerID: joinSeat }));
  };

  /* ── Render ── */

  const selectedScenario = savedScenarios.find(
    (scenario) => scenario.id === selectedScenarioId
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        {/* ── Hero ── */}
        <div className="mb-8 w-full text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-md sm:text-6xl">
            Settlehex
          </h1>
          <p className="mt-3 text-sm font-medium tracking-[0.32em] text-white/72 sm:text-base">
            settle &middot; trade &middot; conquer
          </p>
        </div>

        {/* ── Identity pill (shown when logged in) ── */}
        {hasIdentity && (
          <div className="mb-6 flex w-full flex-wrap justify-center gap-3">
            <Button
              onClick={() => setShowIdentity(true)}
              variant="secondary"
              className="min-w-[15rem] justify-start rounded-full px-5"
            >
              {playerColor && (
                <span
                  className={`h-4 w-4 rounded-full ${getPlayerColorOption(playerColor).swatch}`}
                />
              )}
              <span>{playerEmoji || EMOJI_OPTIONS[0]}</span>
              <span className="truncate">{playerName}</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/account")}
              className="rounded-full px-5"
            >
              Account
            </Button>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <Banner
            variant="danger"
            title="Lobby error"
            body={error}
            className="mb-4 w-full"
          />
        )}

        {/* ── Main card ── */}
        <Panel className="w-full" bodyClassName="p-5 sm:p-6">
          <div className="text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Matchmaking
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-800 sm:text-[2rem]">
              Choose how you want to play.
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Jump into ranked matchmaking, open a private challenge, or fill the
              second seat with Puffer for a quick solo game.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <div>
              <Button
                onClick={() => requireIdentity(play)}
                disabled={!!searchState || !!challengeState}
                size="xl"
                sheen
                className="w-full"
              >
                Play
              </Button>
              <p className="mt-2 text-center text-sm text-slate-500">
                1v1 &middot; instant matchmaking
              </p>
            </div>

            <div>
              <Button
                onClick={() => requireIdentity(createFriendChallenge)}
                variant="secondary"
                size="lg"
                disabled={!!searchState || !!challengeState}
                className="w-full"
              >
                Play a Friend
              </Button>
              <p className="mt-2 text-center text-sm text-slate-500">
                Private link &middot; share to challenge a friend
              </p>
            </div>

            <div>
              <Button
                onClick={playAgainstBot}
                variant="accent"
                size="lg"
                disabled={!!searchState || !!challengeState}
                className="w-full"
              >
                Play Against Bot
              </Button>
              <p className="mt-2 text-center text-sm text-slate-500">
                Solo match &middot; fills seat 2 with Puffer bot
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.35rem] border border-white/35 bg-white/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
            <div className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Have a room code?
            </div>

            <form
              onSubmit={joinByCode}
              className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_7.5rem_auto]"
            >
              <Input
                value={joinMatchID}
                onChange={(e) => setJoinMatchID(e.target.value)}
                aria-label="Room code"
                placeholder="Room code"
                autoComplete="off"
                className="min-w-0"
              />
              <Select
                value={joinSeat}
                onChange={(e) => setJoinSeat(e.target.value)}
                aria-label="Seat"
                className="w-full"
              >
                <option value="0">Seat 1</option>
                <option value="1">Seat 2</option>
                <option value="2">Seat 3</option>
                <option value="3">Seat 4</option>
              </Select>
              <Button
                type="submit"
                variant="secondary"
                disabled={!joinMatchID.trim()}
                className="w-full"
              >
                Join
              </Button>
            </form>
          </div>
        </Panel>

        {/* ── Custom game toggle ── */}
        <Button
          onClick={() => setShowCustom((v) => !v)}
          variant="secondary"
          className="mt-5 rounded-full px-5"
        >
          <span
            className="inline-block transition-transform"
            style={{ transform: showCustom ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            &#9656;
          </span>
          Host Custom Game
        </Button>

        {/* ── Custom game section ── */}
         {showCustom && (
           <div className="mt-3 w-full space-y-4">
             <Panel title="Custom Room" bodyClassName="p-5">
               <div className="flex flex-wrap items-center gap-3">
                 <span className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                   Players
                 </span>
                 <div className="flex gap-1.5">
                   {[2, 3, 4].map((n) => (
                     <Button
                       key={n}
                       variant={createNumPlayers === n ? "accent" : "subtle"}
                       size="sm"
                       onClick={() => setCreateNumPlayers(n)}
                     >
                       {n}
                     </Button>
                   ))}
                 </div>
                 <div className="flex-1" />
                 <Button
                   onClick={() => requireIdentity(createCustomRoom)}
                   disabled={createPending}
                 >
                   {createPending ? "Creating…" : "Create & Join"}
                 </Button>
               </div>
             </Panel>

             {isDevEnvironment && (
               <Panel
                 title="Dev Scenario"
                 bodyClassName="p-5"
                 right={
                   <Button
                     variant="secondary"
                     size="sm"
                     onClick={fetchSavedScenarios}
                     disabled={isLoadingScenarios}
                     className="px-2 py-0.5 text-xs"
                   >
                     {isLoadingScenarios ? "…" : "Refresh"}
                   </Button>
                 }
               >
                 <div className="text-xs text-slate-600">Start from scenario</div>
                 <div className="mt-3 flex items-center gap-2">
                   <Select
                     value={selectedScenarioId}
                     onChange={(event) => setSelectedScenarioId(event.target.value)}
                     className="min-w-0 flex-1"
                   >
                     <option value="">
                       {isLoadingScenarios ? "Loading scenarios…" : "Choose a scenario"}
                     </option>
                     {savedScenarios.map((scenario) => (
                       <option key={scenario.id} value={scenario.id}>
                         {scenario.name}
                       </option>
                     ))}
                   </Select>
                   <Button
                     onClick={() => requireIdentity(startFromScenario)}
                     disabled={!selectedScenarioId || scenarioStartPending}
                   >
                     {scenarioStartPending ? "Starting…" : "Start from scenario"}
                   </Button>
                 </div>
                 <div className="mt-2 text-xs text-slate-600">
                   {selectedScenario
                     ? `${selectedScenario.data?.core?.players?.length ?? "?"} players`
                     : "Saved scenarios start a room with their stored player count."}
                 </div>
               </Panel>
             )}

             {/* Open games list */}
             <Panel
              title={`Open Games · ${matches.length} live`}
              bodyClassName="space-y-2 p-3"
              right={
                 <Button
                   variant="secondary"
                   size="sm"
                   onClick={refreshMatches}
                   disabled={isRefreshing}
                  className="px-2 py-0.5 text-xs"
                >
                  {isRefreshing ? "…" : "Refresh"}
                </Button>
              }
             >
                {matches.length === 0 && (
                  <div className="rounded-lg bg-white/30 px-4 py-5 text-center text-sm text-slate-600">
                    No games yet — create one above!
                  </div>
                )}
                {matches.map((match) => (
                  <RoomRow
                    key={match.matchID}
                    match={match}
                    onJoin={({ matchID, playerID }) =>
                      requireIdentity(() => joinRoom({ matchID, playerID }))
                    }
                    isPending={joinPendingMatchID === match.matchID}
                  />
                ))}
            </Panel>
          </div>
        )}
      </div>
      <VersionBadge />

      {/* ── Identity modal ── */}
      {showIdentity && (
        <IdentityModal
          onSubmit={handleIdentitySubmit}
          onClose={() => {
            pendingActionRef.current = null;
            setShowIdentity(false);
          }}
          initialName={playerName}
          initialEmoji={playerEmoji}
          initialColor={playerColor}
        />
      )}

      {/* ── Friend challenge modal ── */}
      {challengeState && (
        <FriendChallengeModal
          phase={challengeState.phase}
          challengeUrl={challengeState.challengeUrl}
          expiresAt={challengeState.expiresAt}
          onClose={cancelChallengeInvite}
        />
      )}

      {/* ── Searching modal ── */}
      {searchState && (
        <SearchingModal
          onCancel={
            searchState.phase !== "matchFound" &&
            searchState.matchID &&
            searchState.playerID != null
              ? cancelSearch
              : null
          }
          startedAt={searchState.startedAt}
          phase={searchState.phase}
        />
      )}
    </div>
  );
}
