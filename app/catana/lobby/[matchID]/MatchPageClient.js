"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Client } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { Catan } from "../../Game";
import { GameScreenWithEffects } from "../../GameScreen";
import { GlassPillButton } from "../../components/GlassPillButton";
import { LiveMatchLoadingShell } from "./LiveMatchLoadingShell";
import {
  getCredentialsStorageKey,
  writeLastActiveMatch
} from "../../utils/activeMatchStorage";
import { sanitizeDisplayName } from "../../utils/playerIdentity";
import {
  getGameServerOrigin,
} from "../../utils/serverOrigins";

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
  throw new Error(message);
};

const appRequest = ({ route, init }) => apiRequest({ baseUrl: "", route, init });

function GlassPanel({ title, right, children }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700">
        <div>{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function GlassInput({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70 focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
      {...props}
    />
  );
}

function GlassSelect({ className = "", ...props }) {
  return (
    <select
      className={`w-full rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70 focus-visible:ring-2 focus-visible:ring-white/70 ${className}`}
      {...props}
    />
  );
}

function PrimaryButton({ className = "", ...props }) {
  return (
    <button
      className={`rounded-lg bg-green-500 hover:bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm disabled:hover:scale-100 ${className}`}
      {...props}
    />
  );
}

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
  const [botFillPending, setBotFillPending] = useState(false);

  const gameServer = useMemo(() => getGameServerOrigin(), []);
  const CatanClient = useMemo(() => {
    return Client({
      game: Catan,
      board: GameScreenWithEffects,
      multiplayer: SocketIO({ server: gameServer }),
      loading: LiveMatchLoadingShell,
      debug: false,
    });
  }, [gameServer]);

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

  const upsertGuestIdentity = useCallback(async () => {
    const nextName = playerName.trim();
    if (!nextName) {
      throw new Error("Pick a player name first.");
    }

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
              return window.localStorage.getItem(PLAYER_COLOR_STORAGE_KEY) || "sky";
            } catch (err) {
              return "sky";
            }
          })(),
        }),
      },
    });
  }, [playerName]);

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

  const openSeats = useMemo(() => {
    if (!match?.players) return [];
    return match.players.filter((p) => !p?.name && p?.id != null);
  }, [match]);

  useEffect(() => {
    if (openSeats.length === 0) return;
    const openSeatIds = new Set(openSeats.map((seat) => String(seat.id)));
    const current = String(playerID || "");
    if (!current || !openSeatIds.has(current)) {
      setPlayerID(String(openSeats[0].id));
    }
  }, [playerID, openSeats]);

  const joinSeat = async (event) => {
    event.preventDefault();
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
      router.replace(`/g/${matchID}?playerID=${encodeURIComponent(playerID)}`);
      await refreshMatch();
    } catch (err) {
      setError(err?.message || "Failed to join.");
      await refreshMatch();
    } finally {
      setJoinPending(false);
    }
  };

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
              avatarColor: "sky",
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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600">
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm p-6 md:p-8">
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
              <GlassPillButton onClick={refreshMatch} disabled={isLoadingMatch}>
                {isLoadingMatch ? "Refreshing…" : "Refresh"}
              </GlassPillButton>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <GlassPanel title="Join Seat">
              <form className="space-y-3" onSubmit={joinSeat}>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-widest text-slate-700">
                    Player name
                  </label>
                  <div className="mt-2">
                    <GlassInput
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
                    <GlassSelect
                      value={playerID}
                      onChange={(e) => setPlayerID(e.target.value)}
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
                    </GlassSelect>
                  </div>
                </div>
                <PrimaryButton type="submit" disabled={joinPending || openSeats.length === 0}>
                  {joinPending ? "Joining…" : "Join & Play"}
                </PrimaryButton>
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
            </GlassPanel>

            <GlassPanel title="Seats">
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
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}
