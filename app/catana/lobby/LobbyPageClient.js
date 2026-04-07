"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  PLAYER_COLOR_OPTIONS,
  getPlayerColorOption,
  normalizePlayerColorId
} from "../theme/playerColors";
import {
  clearLastActiveMatch,
  getCredentialsStorageKey,
  readLastActiveMatch,
  writeLastActiveMatch
} from "../utils/activeMatchStorage";
import { sanitizeDisplayName } from "../utils/playerIdentity";
import { getLobbyServerOrigin } from "../utils/serverOrigins";

const GAME_NAME = "catan";
const BOT_NAME_PREFIX = "Puffer";
const isDevEnvironment = process.env.NODE_ENV !== "production";
const STORAGE_KEY_NAME = "catana:lobby:playerName";
const STORAGE_KEY_EMOJI = "catana:lobby:playerEmoji";
const STORAGE_KEY_COLOR = "catana:lobby:playerColor";

const getStored = (key) => {
  try {
    return window.localStorage.getItem(key) || "";
  } catch (err) {
    return "";
  }
};

const getStoredPlayerColor = () => normalizePlayerColorId(getStored(STORAGE_KEY_COLOR));

const EMOJI_OPTIONS = [
  "😀", "😃", "😄", "😁",
  "😆", "😎", "🤩", "🥳",
  "😏", "🤠", "🤓", "😈",
  "🥸", "😇", "🤑", "🤪",
];

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

/* ─── Identity modal ──────────────────────────────────── */

function EmojiPicker({ value, onChange, colorGradient }) {
  const [showGrid, setShowGrid] = useState(false);
  const [slideDir, setSlideDir] = useState(0); // -1 = left, 1 = right
  const [slideKey, setSlideKey] = useState(0);
  const gridRef = useRef(null);
  const idx = EMOJI_OPTIONS.indexOf(value);
  const currentIdx = idx >= 0 ? idx : 0;

  // Click outside to dismiss grid
  useEffect(() => {
    if (!showGrid) return;
    const handler = (e) => {
      if (gridRef.current && !gridRef.current.contains(e.target)) {
        setShowGrid(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showGrid]);

  const navigate = (dir) => {
    const next = (currentIdx + dir + EMOJI_OPTIONS.length) % EMOJI_OPTIONS.length;
    setSlideDir(dir);
    setSlideKey((k) => k + 1);
    onChange(EMOJI_OPTIONS[next]);
  };

  const slideAnim =
    slideDir > 0
      ? "emojiSlideFromRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
      : slideDir < 0
      ? "emojiSlideFromLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
      : "none";

  return (
    <div className="relative flex flex-col items-center">
      {/* Row: arrows aligned to center of avatar box */}
      <div className="relative flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-lg text-slate-600 ring-1 ring-white/50 transition hover:bg-white/60 hover:scale-105 active:scale-95"
        >
          &#8249;
        </button>

        <button
          type="button"
          onClick={() => setShowGrid((v) => !v)}
          className="group relative flex flex-col items-center"
        >
          {/* Colored box (stays still) */}
          <span
            className={`relative flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-t ring-4 ring-white shadow-lg overflow-hidden ${colorGradient || ""}`}
          >
            {/* Bounce wrapper — only the emoji bounces */}
            <span
              className="relative z-10 block"
              style={{ animation: "emojiBounce 2s ease-in-out infinite" }}
            >
              {/* Slide wrapper — re-mounts on slideKey to replay animation */}
              <span
                key={slideKey}
                className="block text-5xl"
                style={{ animation: slideAnim, display: "inline-block" }}
              >
                {value}
              </span>
            </span>
            {/* Shadow inside box, beneath emoji */}
            <div
              className="absolute bottom-2 inset-x-0 mx-auto h-2 w-10 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)",
                animation: "emojiShadow 2s ease-in-out infinite",
              }}
            />
          </span>
          <span className="mt-1.5 block text-[10px] font-medium text-slate-500 opacity-0 transition-opacity group-hover:opacity-100">
            tap to browse
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate(1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/40 text-lg text-slate-600 ring-1 ring-white/50 transition hover:bg-white/60 hover:scale-105 active:scale-95"
        >
          &#8250;
        </button>
      </div>

      {/* Expanded grid popup */}
      {showGrid && (
        <div
          ref={gridRef}
          className="absolute top-full z-10 mt-2 grid grid-cols-4 gap-1.5 rounded-xl bg-blue-200/95 p-3 shadow-xl ring-2 ring-slate-300"
        >
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onChange(e);
                setShowGrid(false);
              }}
              className={`rounded-lg px-1 py-1.5 text-2xl transition-all ${
                value === e
                  ? "bg-amber-400 shadow-md ring-2 ring-amber-300 scale-110"
                  : "hover:bg-white/50 hover:scale-105"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IdentityModal({ onSubmit, onClose, initialName, initialEmoji, initialColor }) {
  const [name, setName] = useState(initialName || "");
  const [emoji, setEmoji] = useState(
    () =>
      initialEmoji ||
      EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)]
  );
  const [color, setColor] = useState(
    () =>
      (initialColor ? normalizePlayerColorId(initialColor) : "") ||
      PLAYER_COLOR_OPTIONS[
        Math.floor(Math.random() * PLAYER_COLOR_OPTIONS.length)
      ].id
  );
  const inputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      emoji,
      color: normalizePlayerColorId(color)
    });
  };

  const handleBackdropClick = (e) => {
    if (formRef.current && !formRef.current.contains(e.target)) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="mx-4 w-full max-w-xs rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300"
      >
        <h2 className="text-center text-lg font-bold text-slate-800">
          Pick a username
        </h2>

        {/* Avatar picker */}
        <div className="mt-5">
          <EmojiPicker
            value={emoji}
            onChange={setEmoji}
            colorGradient={getPlayerColorOption(color).gradient}
          />
        </div>

        {/* Color swatches */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {PLAYER_COLOR_PICKER_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              className={`h-7 w-7 rounded-full ${c.swatch} transition-all ${
                color === c.id
                  ? "ring-2 ring-white ring-offset-2 ring-offset-blue-200 scale-110"
                  : "ring-1 ring-white/40 hover:scale-110"
              }`}
              aria-label={c.id}
            />
          ))}
        </div>

        {/* Name input */}
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="nickname"
          maxLength={28}
          className="mt-5 w-full rounded-lg bg-white/60 px-3 py-2.5 text-center text-sm font-semibold text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 focus:outline-none focus:ring-2 focus:ring-white/70"
        />

        {/* Submit */}
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-4 w-full rounded-lg bg-lime-500 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-lime-600 hover:scale-[1.01] disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
        >
          Let&apos;s go!
        </button>
      </form>

      <style>{`
        @keyframes emojiBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes emojiShadow {
          0%, 100% { transform: scaleX(1); opacity: 1; }
          50% { transform: scaleX(0.7); opacity: 0.5; }
        }
        @keyframes emojiSlideFromRight {
          0% { transform: translateX(24px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes emojiSlideFromLeft {
          0% { transform: translateX(-24px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
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
          <button
            onClick={onCancel}
            className="mt-6 rounded-lg bg-slate-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
          >
            Cancel
          </button>
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
        <button
          onClick={() =>
            onJoin({ matchID: match.matchID, playerID: String(firstOpenSeat.id) })
          }
          disabled={isPending}
          className="rounded-full bg-lime-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-lime-600 hover:scale-[1.02] disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
        >
          {isPending ? "Joining…" : "Join"}
        </button>
      )}
    </div>
  );
}

/* ─── Main lobby ──────────────────────────────────────── */

export function LobbyPageClient() {
  const router = useRouter();
  const lobbyBaseUrl = useMemo(() => getLobbyServerOrigin(), []);

  const [playerName, setPlayerName] = useState("");
  const [playerEmoji, setPlayerEmoji] = useState("");
  const [playerColor, setPlayerColor] = useState("");
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState("");

  // Identity gate
  const [showIdentity, setShowIdentity] = useState(false);
  const pendingActionRef = useRef(null);
  // Keep a synchronous ref so actions queued after identity submit read the fresh name
  const playerNameRef = useRef(playerName);
  playerNameRef.current = playerName;

  const hasIdentity = Boolean(playerName.trim());

  // Matchmaking
  const [searchState, setSearchState] = useState(null);

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

  const requireIdentity = (action) => {
    if (hasIdentity) {
      action();
      return;
    }
    pendingActionRef.current = action;
    setShowIdentity(true);
  };

  const handleIdentitySubmit = ({ name, emoji, color }) => {
    const normalizedColor = normalizePlayerColorId(color);
    setPlayerName(name);
    setPlayerEmoji(emoji);
    setPlayerColor(normalizedColor);
    playerNameRef.current = name;
    try {
      window.localStorage.setItem(STORAGE_KEY_NAME, name);
      window.localStorage.setItem(STORAGE_KEY_EMOJI, emoji);
      window.localStorage.setItem(STORAGE_KEY_COLOR, normalizedColor);
    } catch (err) {
      /* ignore */
    }
    setShowIdentity(false);
    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      // Run on next tick so state is settled
      setTimeout(action, 0);
    }
  };

  /* ── Data fetching ── */

  const refreshMatches = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}`,
      });
      const list = (data?.matches || []).map(normalizeMatch);
      setMatches(list.filter((m) => m.matchID));
    } catch (err) {
      /* silently fail for background refresh */
    } finally {
      setIsRefreshing(false);
    }
  }, [lobbyBaseUrl]);

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
    try {
      const storedName = window.localStorage.getItem(STORAGE_KEY_NAME);
      const storedEmoji = window.localStorage.getItem(STORAGE_KEY_EMOJI);
      const storedColor = window.localStorage.getItem(STORAGE_KEY_COLOR);
      if (storedName) {
        setPlayerName(storedName);
        playerNameRef.current = storedName;
      }
      if (storedEmoji) setPlayerEmoji(storedEmoji);
      if (storedColor) setPlayerColor(normalizePlayerColorId(storedColor));
    } catch (err) {
      /* ignore */
    }
    refreshMatches();
    fetchSavedScenarios();
  }, [fetchSavedScenarios, refreshMatches]);

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
        const data = await apiRequest({
          baseUrl: lobbyBaseUrl,
          route: `/games/${GAME_NAME}/${searchState.matchID}`,
        });
        const match = normalizeMatch(data);
        const allJoined = match.players.every((p) => p.name);
        if (allJoined) {
          setSearchState((current) =>
            current && current.matchID === searchState.matchID
              ? { ...current, phase: "matchFound" }
              : current
          );
          router.push(
            `/catana/lobby/${searchState.matchID}?playerID=${encodeURIComponent(searchState.playerID)}`
          );
        }
      } catch (err) {
        /* keep polling */
      }
    };

    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, [searchState, lobbyBaseUrl, router]);

  /* ── Actions (all read from playerNameRef for fresh value) ── */

  const joinRoom = async ({ matchID, playerID, onError }) => {
    if (!matchID) return;
    const name = playerNameRef.current;
    const emoji = getStored(STORAGE_KEY_EMOJI);
    const color = getStoredPlayerColor();

    setJoinPendingMatchID(matchID);
    setError("");
    try {
      const joined = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/${matchID}/join`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerID: String(playerID),
            playerName: name,
            data: { emoji, color },
          }),
        },
      });

      const credentials = joined?.playerCredentials;
      if (!credentials)
        throw new Error("Join succeeded but returned no credentials.");

      try {
        window.localStorage.setItem(
          getCredentialsStorageKey({ matchID, playerID }),
          credentials
        );
        writeLastActiveMatch(window.localStorage, {
          matchID,
          playerID: String(playerID),
          playerName: name
        });
      } catch (err) {
        /* ignore */
      }

      router.push(
        `/catana/lobby/${matchID}?playerID=${encodeURIComponent(playerID)}`
      );
    } catch (err) {
      setError(err?.message || "Failed to join room.");
      await refreshMatches();
      onError?.(err);
    } finally {
      setJoinPendingMatchID(null);
    }
  };

  const play = async () => {
    const name = playerNameRef.current;
    const startedAt = Date.now();
    setError("");
    setSearchState({
      matchID: null,
      playerID: null,
      startedAt,
      phase: "searching",
    });

    try {
      const data = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}`,
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

      const created = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/create`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numPlayers: 2 }),
        },
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");

      const emoji = getStored(STORAGE_KEY_EMOJI);
      const color = getStoredPlayerColor();
      const joined = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/${matchID}/join`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerID: "0",
            playerName: name,
            data: { emoji, color },
          }),
        },
      });

      const credentials = joined?.playerCredentials;
      if (credentials) {
        try {
          window.localStorage.setItem(
            getCredentialsStorageKey({ matchID, playerID: "0" }),
            credentials
          );
          writeLastActiveMatch(window.localStorage, {
            matchID,
            playerID: "0",
            playerName: name
          });
        } catch (err) {
          /* ignore */
        }
      }

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

  const playAgainstBot = async () => {
    const name = playerNameRef.current;
    setError("");

    try {
      const created = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/create`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numPlayers: 2 }),
        },
      });

      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");

      const emoji = getStored(STORAGE_KEY_EMOJI);
      const color = getStoredPlayerColor();
      const joined = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/${matchID}/join`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerID: "0",
            playerName: name,
            data: { emoji, color },
          }),
        },
      });

      const credentials = joined?.playerCredentials;
      if (credentials) {
        try {
          window.localStorage.setItem(
            getCredentialsStorageKey({ matchID, playerID: "0" }),
            credentials
          );
          writeLastActiveMatch(window.localStorage, {
            matchID,
            playerID: "0",
            playerName: name
          });
        } catch (err) {
          /* ignore */
        }
      }

      await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/${matchID}/join`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerID: "1",
            playerName: `${BOT_NAME_PREFIX} 2`,
            data: {
              bot: "puffer",
              isBot: true,
              emoji: "🤖",
              color: "sky",
            },
          }),
        },
      });

      router.push(`/catana/lobby/${matchID}?playerID=0`);
    } catch (err) {
      setError(err?.message || "Failed to start bot match.");
    }
  };

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
        await apiRequest({
          baseUrl: lobbyBaseUrl,
          route: `/games/${GAME_NAME}/${searchState.matchID}/leave`,
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
      const created = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/create`,
        init: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ numPlayers }),
        },
      });
      const matchID = created?.matchID;
      if (!matchID) throw new Error("Create succeeded but returned no matchID.");
      await refreshMatches();
      await joinRoom({ matchID, playerID: "0" });
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
      const created = await apiRequest({
        baseUrl: lobbyBaseUrl,
        route: `/games/${GAME_NAME}/create`,
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
      await refreshMatches();
      await joinRoom({ matchID, playerID: "0" });
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-12">
        {/* ── Hero ── */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-md">
            Catana
          </h1>
          <p className="mt-2 text-sm font-medium tracking-widest text-white/70">
            settle &middot; trade &middot; conquer
          </p>
        </div>

        {/* ── Identity pill (shown when logged in) ── */}
        {hasIdentity && (
          <button
            onClick={() => setShowIdentity(true)}
            className="mb-5 flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-1.5 text-sm font-semibold text-slate-700 shadow-lg ring-1 ring-white/60 backdrop-blur-sm transition hover:bg-white/85 hover:scale-[1.02]"
          >
            {playerColor && (
              <span
                className={`h-4 w-4 rounded-full ${getPlayerColorOption(playerColor).swatch}`}
              />
            )}
            <span>{playerEmoji || EMOJI_OPTIONS[0]}</span>
            <span>{playerName}</span>
          </button>
        )}

        {/* ── Error ── */}
        {error && (
          <div className="mb-4 w-full rounded-lg bg-rose-100 px-4 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* ── Main card ── */}
        <div className="w-full rounded-xl bg-white/25 p-6 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
          {/* Play button */}
          <button
            onClick={() => requireIdentity(play)}
            disabled={!!searchState}
            className="w-full rounded-lg bg-lime-500 px-6 py-3.5 text-lg font-bold text-white shadow-md transition-all hover:bg-lime-600 hover:scale-[1.01] motion-reduce:hover:scale-100 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm disabled:hover:scale-100"
          >
            Play
          </button>
          <p className="mt-1.5 text-center text-xs text-slate-600">
            1v1 &middot; instant matchmaking
          </p>
          <button
            onClick={() => requireIdentity(playAgainstBot)}
            disabled={!!searchState}
            className="mt-2 w-full rounded-lg bg-amber-400 px-6 py-3 text-base font-bold text-slate-800 shadow-md ring-1 ring-amber-300 transition-all hover:bg-amber-300 hover:scale-[1.01] motion-reduce:hover:scale-100 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm disabled:hover:scale-100"
          >
            Play Against Bot
          </button>
          <p className="mt-1 text-center text-xs text-slate-600">
            Solo match &middot; fills seat 2 with Puffer bot
          </p>

          {/* Join by code */}
          <div className="mt-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/40" />
            <span className="text-xs font-medium text-slate-600">
              have a room code?
            </span>
            <div className="h-px flex-1 bg-white/40" />
          </div>

          <form onSubmit={joinByCode} className="mt-4 flex gap-2">
            <input
              value={joinMatchID}
              onChange={(e) => setJoinMatchID(e.target.value)}
              placeholder="Room code"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70"
            />
            <select
              value={joinSeat}
              onChange={(e) => setJoinSeat(e.target.value)}
              className="w-20 rounded-lg bg-white/60 px-2 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              <option value="0">Seat 1</option>
              <option value="1">Seat 2</option>
              <option value="2">Seat 3</option>
              <option value="3">Seat 4</option>
            </select>
            <button
              type="submit"
              disabled={!joinMatchID.trim()}
              className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:bg-slate-300 disabled:text-slate-500"
            >
              Join
            </button>
          </form>
        </div>

        {/* ── Custom game toggle ── */}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-white/80 transition hover:text-white"
        >
          <span
            className="inline-block transition-transform"
            style={{ transform: showCustom ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            &#9656;
          </span>
          Host Custom Game
        </button>

        {/* ── Custom game section ── */}
         {showCustom && (
           <div className="mt-3 w-full space-y-4">
             <div className="rounded-xl bg-white/25 p-5 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
               <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                  Players
                </span>
                <div className="flex gap-1.5">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setCreateNumPlayers(n)}
                      className={`rounded-full px-3 py-1 text-sm font-semibold transition-all ${
                        createNumPlayers === n
                          ? "bg-amber-400 text-slate-800 shadow-md ring-1 ring-amber-300"
                          : "bg-white/40 text-slate-700 ring-1 ring-white/50 hover:bg-white/60"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => requireIdentity(createCustomRoom)}
                  disabled={createPending}
                  className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-lime-600 hover:scale-[1.02] disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
                >
                  {createPending ? "Creating…" : "Create & Join"}
                 </button>
               </div>
             </div>

             {isDevEnvironment && (
               <div className="rounded-xl bg-white/25 p-5 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
                 <div className="flex items-center justify-between gap-3">
                   <div>
                     <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                       Dev Scenario
                     </div>
                     <div className="mt-1 text-xs text-slate-600">
                       Start from scenario
                     </div>
                   </div>
                   <button
                     onClick={fetchSavedScenarios}
                     disabled={isLoadingScenarios}
                     className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-white/50 transition hover:bg-white/80 disabled:text-slate-400"
                   >
                     {isLoadingScenarios ? "…" : "Refresh"}
                   </button>
                 </div>
                 <div className="mt-3 flex items-center gap-2">
                   <select
                     value={selectedScenarioId}
                     onChange={(event) => setSelectedScenarioId(event.target.value)}
                     className="min-w-0 flex-1 rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70"
                   >
                     <option value="">
                       {isLoadingScenarios ? "Loading scenarios…" : "Choose a scenario"}
                     </option>
                     {savedScenarios.map((scenario) => (
                       <option key={scenario.id} value={scenario.id}>
                         {scenario.name}
                       </option>
                     ))}
                   </select>
                   <button
                     onClick={() => requireIdentity(startFromScenario)}
                     disabled={!selectedScenarioId || scenarioStartPending}
                     className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-lime-600 hover:scale-[1.02] disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100"
                   >
                     {scenarioStartPending ? "Starting…" : "Start from scenario"}
                   </button>
                 </div>
                 <div className="mt-2 text-xs text-slate-600">
                   {selectedScenario
                     ? `${selectedScenario.data?.core?.players?.length ?? "?"} players`
                     : "Saved scenarios start a room with their stored player count."}
                 </div>
               </div>
             )}

             {/* Open games list */}
             <div className="overflow-hidden rounded-xl bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-white/40 bg-white/50 px-4 py-2.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                  Open Games &middot; {matches.length} live
                </span>
                <button
                  onClick={refreshMatches}
                  disabled={isRefreshing}
                  className="rounded-full bg-white/60 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-white/50 transition hover:bg-white/80 disabled:text-slate-400"
                >
                  {isRefreshing ? "…" : "Refresh"}
                </button>
              </div>
              <div className="space-y-2 p-3">
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
              </div>
            </div>
          </div>
        )}
      </div>

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
