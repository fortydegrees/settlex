"use client";
import { CatanBoard } from "./Board";
import {
  TransformWrapper,
  TransformComponent,
} from "../../react-zoom-pan-pinch";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { buildPlayerViewMap } from "./utils/playerView";
import { shouldCancelBuildAction } from "./utils/cancelBuildAction";
import { getGameStatus } from "./utils/gameStatus";
import {
  getBuildPickupPieceType,
  shouldResetPlayerAction
} from "./utils/playerAction";
import { resolveEffectivePlayerColors } from "./utils/playerColorsInGame";
import {
  mergePlayerMetadata,
  sanitizeDisplayName,
} from "./utils/playerIdentity";
import {
  getActiveDisconnectStateByPlayerId,
  mergeVisibleLogEntries,
  readPresenceSnapshot
} from "./utils/disconnectPresence";
import {
  getActiveIdleStateByPlayerId,
  readIdlePresenceSnapshot
} from "./utils/idlePresence";
import {
  canRenderDevPlayModal,
  shouldResetTradeModal
} from "./utils/turnUiState";

import { EffectsBoardWrapper } from "bgio-effects/react";

import { PlayerActionContainer } from "./components/PlayerActionContainer";
import { OpponentPlayerBox } from "./components/OpponentPlayerBox";
import { GlassPillButton } from "./components/GlassPillButton";
import { LeftMetaRail } from "./components/LeftMetaRail";
import { StatusBanner } from "./components/StatusBanner";
import { TradeDiscardModal } from "./components/TradeDiscardModal";
import { IdlePromptModal } from "./components/IdlePromptModal";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { GameOverModal } from "./components/GameOverModal";
import { PostgameOverlay } from "./components/PostgameOverlay";
import { DevCardPurchaseReveal } from "./DevCardPurchaseReveal";
import { GameEffects } from "./effects/GameEffects";
import { createResourceDistributionRunner } from "./effects/resourceDistribution";
import { createPiecePlacementRunner } from "./effects/placePiece";
import {
  getVisibleDevCardsDuringReveal,
} from "./utils/devCardPurchaseReveal";
import useWindowSize from "./utils/useWindowSize";
import { getBoardLayout } from "./utils/boardLayout";
import {
  DEFAULT_ROBBER_PLACEMENT_MOTION_MODE
} from "./utils/robberPlacementMotion";
import { Howler } from "howler";
import { getVictoryPoints } from "@settlex/game-core";
import {
  CATANA_THEME_STORAGE_KEY,
  resolveThemeId,
} from "./theme/themes";
import {
  clearLastActiveMatch,
  readLastActiveMatch
} from "./utils/activeMatchStorage";
import { shouldAutoReady } from "./utils/preGameReady";

const AUDIO_MUTE_STORAGE_KEY = "catana:audioMuted";

const readStoredMute = () => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUDIO_MUTE_STORAGE_KEY) === "true";
  } catch (err) {
    return false;
  }
};

const readStoredThemeId = () => {
  if (typeof window === "undefined") return resolveThemeId(null);
  try {
    return resolveThemeId(
      window.localStorage.getItem(CATANA_THEME_STORAGE_KEY)
    );
  } catch (err) {
    return resolveThemeId(null);
  }
};

const getApiBaseUrl = () => {
  if (typeof window === "undefined") return "http://localhost:8080";
  return `${window.location.protocol}//${window.location.hostname}:8080`;
};

const copyRect = (rect) => {
  if (!rect) return null;
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
};

const getGameOverReasonCopy = (reason) => {
  if (reason === "victoryPoints" || !reason) return "Victory Points";
  if (reason === "Resignation") return "Resignation";
  if (reason === "Disconnect Forfeit") return "Disconnect Forfeit";
  if (reason === "AFK Forfeit") return "AFK Forfeit";
  return String(reason);
};

export function GameScreen(bgioProps) {
  //playerAction is things that appear to the user (not spectator)
  //e.g. placeRoad, placeSettle, placeCity, moveRobber, trading
  //but i think we want this controlled by server/gameState
    //e.g. if disconnect after placing one road of RB, reconnect will want to prompt to place second road
  const [playerAction, setPlayerAction] = useState(null);
  const [buildPickup, setBuildPickup] = useState(null);
  const [pendingDevCardReveal, setPendingDevCardReveal] = useState(null);
  const [activeDevCardReveal, setActiveDevCardReveal] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradePresetResource, setTradePresetResource] = useState(null);
  const [timerSnapshot, setTimerSnapshot] = useState(null);
  const [timerSeeded, setTimerSeeded] = useState(false);
  const [disconnectPresence, setDisconnectPresence] = useState(null);
  const [idlePresence, setIdlePresence] = useState(null);
  const [idleAckError, setIdleAckError] = useState(null);
  const [isAcknowledgingIdle, setIsAcknowledgingIdle] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [readySent, setReadySent] = useState(false);
  const [isMuted, setIsMuted] = useState(readStoredMute);
  const [themeId] = useState(readStoredThemeId);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showPostgame, setShowPostgame] = useState(false);
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [boardViewportScale, setBoardViewportScale] = useState(1);
  const robberPlacementMotionMode = DEFAULT_ROBBER_PLACEMENT_MOTION_MODE;
  const gameOverSeenRef = useRef(false);
  const winnerConfettiSeenRef = useRef(false);
  const hasSeenTransportConnectionRef = useRef(false);
  const boardRef = useRef(null);
  const placementLayerRef = useRef(null);
  const placementRoadLayerRef = useRef(null);
  const devCardDisplayRef = useRef(null);
  const pendingDevCardRevealRef = useRef(null);
  const { width, height } = useWindowSize();
  const moves = bgioProps.moves;

  //get the active playerID of who's watching
  //can be null for spectator?
  //TODO: handle null/spectator
  const playerID = bgioProps.playerID;
  const matchID = bgioProps.matchID ?? "default";

  const core = bgioProps.G.core;
  const coreTurn = core?.turn;
  const gameOverState = bgioProps.ctx?.gameover ?? core?.gameOver;
  const isGameOver = Boolean(gameOverState);
  const rawGameStatus = getGameStatus(core, bgioProps.ctx, playerAction);
  const gameStatus = isGameOver
    ? { text: "Game Over", statusType: rawGameStatus.statusType, activePlayerId: null }
    : rawGameStatus;
  const devPlay = bgioProps.G.devCardPlay;
  const devPlayMode =
    devPlay?.type === "yearOfPlenty"
      ? "dev-yop"
      : devPlay?.type === "monopoly"
      ? "dev-monopoly"
      : null;
  const mergedMatchData = useMemo(
    () =>
      mergePlayerMetadata(
        Array.isArray(bgioProps.matchData) ? bgioProps.matchData : [],
        Array.isArray(bgioProps.matchMetadata) ? bgioProps.matchMetadata : []
      ),
    [bgioProps.matchData, bgioProps.matchMetadata]
  );
  const shouldCloseTradeModal = shouldResetTradeModal({
    showTradeModal,
    playerID,
    ctx: bgioProps.ctx,
    corePhase: core?.phase,
    isGameOver
  });
  const tradeModalVisible = showTradeModal && !shouldCloseTradeModal;
  const devPlayModalVisible =
    Boolean(devPlayMode) &&
    canRenderDevPlayModal({
      devPlay,
      playerID,
      ctx: bgioProps.ctx,
      corePhase: core?.phase,
      isGameOver
    });
  const { nameMap, emojiMap, colorMap } = useMemo(() => {
    const names = {};
    const emojis = {};
    const colors = {};
    if (Array.isArray(mergedMatchData)) {
      mergedMatchData.forEach((player) => {
        if (player?.id == null) return;
        const cleanName = sanitizeDisplayName(player.name);
        names[player.id] = cleanName || `Player ${player.id}`;
        if (player.data?.emoji) emojis[player.id] = player.data.emoji;
        if (player.data?.color) colors[player.id] = player.data.color;
      });
    }
    return { nameMap: names, emojiMap: emojis, colorMap: colors };
  }, [mergedMatchData]);
  const seatOrderKey = useMemo(
    () => (Array.isArray(core?.players) ? core.players.map(String).join("|") : ""),
    [core?.players]
  );
  const seatPlayerIds = useMemo(
    () => (seatOrderKey ? seatOrderKey.split("|") : []),
    [seatOrderKey]
  );
  const effectiveColorByPlayerId = useMemo(
    () =>
      resolveEffectivePlayerColors({
        playerIds: seatPlayerIds,
        preferredColorByPlayerId: colorMap
      }),
    [seatPlayerIds, colorMap]
  );
  const playerViewMap = useMemo(
    () => buildPlayerViewMap(core, effectiveColorByPlayerId),
    [core, effectiveColorByPlayerId]
  );
  const rawPlayer = playerViewMap[playerID];
  const player = rawPlayer
    ? { ...rawPlayer, name: nameMap[rawPlayer.id], emoji: emojiMap[rawPlayer.id] }
    : null;
  const winnerId = gameOverState?.winnerId ?? gameOverState?.winner ?? null;
  const winnerName =
    winnerId != null
      ? nameMap[winnerId] ?? `Player ${winnerId}`
      : "Unknown";
  const isWinner =
    winnerId != null && playerID != null && String(winnerId) === String(playerID);
  const winnerVP =
    winnerId != null && core ? getVictoryPoints(core, String(winnerId)) : null;

  const scoreboard = useMemo(() => {
    if (!core) return [];
    return Object.values(playerViewMap)
      .map((view) => ({
        id: view.id,
        name: nameMap[view.id] ?? view.name ?? `Player ${view.id}`,
        vp: getVictoryPoints(core, view.id),
        color: view.color,
        isWinner: String(view.id) === String(winnerId)
      }))
      .sort((a, b) => b.vp - a.vp);
  }, [core, playerViewMap, nameMap, winnerId]);

  const logPlayerMap = useMemo(() => {
    const ids = new Set([
      ...seatPlayerIds,
      ...Object.keys(nameMap ?? {}),
      ...Object.keys(emojiMap ?? {}),
      ...Object.keys(colorMap ?? {}),
      ...Object.keys(effectiveColorByPlayerId ?? {})
    ]);
    const map = {};
    ids.forEach((id) => {
      map[id] = {
        name: nameMap[id] ?? `Player ${id}`,
        emoji: emojiMap[id] ?? null,
        color: effectiveColorByPlayerId[id] ?? "red"
      };
    });
    return map;
  }, [seatPlayerIds, nameMap, emojiMap, colorMap, effectiveColorByPlayerId]);
  const visibleLogEntries = useMemo(
    () =>
      mergeVisibleLogEntries(
        bgioProps.G?.gameLog ?? [],
        [
          ...(disconnectPresence?.events ?? []),
          ...(idlePresence?.events ?? [])
        ]
      ),
    [bgioProps.G?.gameLog, disconnectPresence, idlePresence]
  );
  const activeIdlePlayerId = idlePresence?.activeIdlePlayerId ?? null;
  const disconnectStateByPlayerId = useMemo(() => {
    return getActiveDisconnectStateByPlayerId(disconnectPresence, nowMs);
  }, [disconnectPresence, nowMs]);
  const idleStateByPlayerId = useMemo(() => {
    return getActiveIdleStateByPlayerId(idlePresence, nowMs);
  }, [idlePresence, nowMs]);
  const gameOverReasonText = getGameOverReasonCopy(gameOverState?.reason);

  const postgameSummary = useMemo(() => {
    if (!isGameOver) return [];
    return [
      { label: "Winner", value: winnerName },
      { label: "Reason", value: gameOverReasonText },
      { label: "Final VP", value: winnerVP != null ? `${winnerVP}` : "—" }
    ];
  }, [isGameOver, winnerName, gameOverReasonText, winnerVP]);
  const showResultsButton =
    isGameOver && !showGameOverModal && !showPostgame;
  const clearBuildPickup = useCallback(() => {
    setBuildPickup(null);
  }, []);
  const handleDevCardPurchaseStart = useCallback((snapshot) => {
    pendingDevCardRevealRef.current = snapshot;
    setPendingDevCardReveal(snapshot);
  }, []);
  const startDevCardRevealFromEffect = useCallback((payload) => {
    if (!payload?.cardType) {
      pendingDevCardRevealRef.current = null;
      setPendingDevCardReveal(null);
      return;
    }

    const pendingReveal = pendingDevCardRevealRef.current;
    if (!pendingReveal) return;
    if (String(pendingReveal.playerId) !== String(payload.playerId)) return;

    const destinationRect = copyRect(
      devCardDisplayRef.current?.getBoundingClientRect?.()
    );
    if (!destinationRect) {
      pendingDevCardRevealRef.current = null;
      setPendingDevCardReveal(null);
      return;
    }

    pendingDevCardRevealRef.current = null;
    setActiveDevCardReveal({
      playerId: payload.playerId,
      cardType: payload.cardType,
      beforeCards: pendingReveal.beforeCards,
      vpSnapshot: pendingReveal.vpSnapshot ?? null,
      triggerRect: pendingReveal.triggerRect,
      destinationRect,
      launchDelayMs: pendingReveal.preLaunchDelayMs ?? 0,
      startedAtMs: pendingReveal.startedAtMs ?? Date.now(),
    });
    setPendingDevCardReveal(null);
  }, []);

  useEffect(() => {
    if (!isGameOver) {
      gameOverSeenRef.current = false;
      winnerConfettiSeenRef.current = false;
      setShowGameOverModal(false);
      setShowPostgame(false);
      return;
    }
    if (!gameOverSeenRef.current) {
      gameOverSeenRef.current = true;
      setShowGameOverModal(true);
      setShowPostgame(false);
      setPlayerAction(null);
      clearBuildPickup();
      pendingDevCardRevealRef.current = null;
      setPendingDevCardReveal(null);
      setActiveDevCardReveal(null);
      setShowTradeModal(false);
      setTradePresetResource(null);
    }
  }, [clearBuildPickup, isGameOver]);

  useEffect(() => {
    if (!isGameOver || !matchID || typeof window === "undefined") return;
    if (playerID == null || playerID === "") return;

    const activeMatch = readLastActiveMatch(window.localStorage);
    if (!activeMatch) return;
    if (activeMatch.matchID !== matchID) return;
    if (String(activeMatch.playerID) !== String(playerID)) return;

    clearLastActiveMatch(window.localStorage);
  }, [isGameOver, matchID, playerID]);

  useEffect(() => {
    setTimerSnapshot(null);
    setTimerSeeded(false);
    setDisconnectPresence(null);
    setIdlePresence(null);
    setIdleAckError(null);
    setIsAcknowledgingIdle(false);
    setReadySent(false);
    setShowConnectionBanner(false);
    pendingDevCardRevealRef.current = null;
    setPendingDevCardReveal(null);
    setActiveDevCardReveal(null);
    hasSeenTransportConnectionRef.current = false;
  }, [matchID]);

  useEffect(() => {
    pendingDevCardRevealRef.current = pendingDevCardReveal;
  }, [pendingDevCardReveal]);

  useEffect(() => {
    if (bgioProps.isConnected) {
      hasSeenTransportConnectionRef.current = true;
      setShowConnectionBanner(false);
      return;
    }

    if (!hasSeenTransportConnectionRef.current || isGameOver) {
      setShowConnectionBanner(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      setShowConnectionBanner(true);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [bgioProps.isConnected, isGameOver]);

  useEffect(() => {
    if (
      bgioProps.timerSnapshot === undefined &&
      bgioProps.timerServerTimeMs === undefined
    ) {
      return;
    }
    if (!bgioProps.timerSnapshot) {
      setTimerSnapshot(null);
      return;
    }
    const receivedAtMs = Date.now();
    const serverDelayMs = bgioProps.timerServerTimeMs
      ? Math.max(0, receivedAtMs - bgioProps.timerServerTimeMs)
      : 0;
    setTimerSnapshot({
      ...bgioProps.timerSnapshot,
      receivedAtMs,
      serverDelayMs
    });
  }, [bgioProps.timerSnapshot, bgioProps.timerServerTimeMs]);

  useEffect(() => {
    if (
      bgioProps.disconnectPresence === undefined &&
      bgioProps.disconnectServerTimeMs === undefined
    ) {
      return;
    }

    setDisconnectPresence(
      readPresenceSnapshot(
        bgioProps.disconnectPresence,
        bgioProps.disconnectServerTimeMs
      )
    );
  }, [bgioProps.disconnectPresence, bgioProps.disconnectServerTimeMs]);

  useEffect(() => {
    if (
      bgioProps.idlePresence === undefined &&
      bgioProps.idleServerTimeMs === undefined
    ) {
      return;
    }

    setIdlePresence(
      readIdlePresenceSnapshot(
        bgioProps.idlePresence,
        bgioProps.idleServerTimeMs
      )
    );
  }, [bgioProps.idlePresence, bgioProps.idleServerTimeMs]);

  useEffect(() => {
    if (!matchID || typeof window === "undefined") return;
    if (bgioProps.timerSnapshot !== undefined || timerSeeded) return;
    let cancelled = false;

    const fetchSeed = async () => {
      try {
        const baseUrl = getApiBaseUrl();
        const url = `${baseUrl}/timer/${matchID}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (!data?.timer) {
          setTimerSeeded(true);
          return;
        }
        const receivedAtMs = Date.now();
        const serverDelayMs = data.serverTimeMs
          ? Math.max(0, receivedAtMs - data.serverTimeMs)
          : 0;
        setTimerSnapshot({
          ...data.timer,
          receivedAtMs,
          serverDelayMs
        });
        setTimerSeeded(true);
      } catch (err) {
        // ignore errors
      }
    };

    fetchSeed();
    return () => {
      cancelled = true;
    };
  }, [matchID, timerSeeded, bgioProps.timerSnapshot]);

  useEffect(() => {
    if (
      !shouldAutoReady({
        readySent,
        playerID,
        phase: bgioProps.ctx?.phase,
        hasReadyMove: typeof moves?.readyUp === "function",
        isMultiplayer: bgioProps.isMultiplayer,
        isConnected: bgioProps.isConnected,
        matchData: bgioProps.matchData,
        readyByPlayerId: bgioProps.G?.preGame?.readyByPlayerId
      })
    ) {
      return;
    }

    moves.readyUp();
    setReadySent(true);
  }, [
    readySent,
    playerID,
    moves,
    bgioProps.ctx?.phase,
    bgioProps.isMultiplayer,
    bgioProps.isConnected,
    bgioProps.matchData,
    bgioProps.G?.preGame?.readyByPlayerId
  ]);

  useEffect(() => {
    Howler.mute(isMuted);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, String(isMuted));
    } catch (err) {
      // ignore storage errors
    }
  }, [isMuted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(CATANA_THEME_STORAGE_KEY, themeId);
    } catch (err) {
      // ignore storage errors
    }
  }, [themeId]);

  const timerMs = timerSnapshot
    ? Math.max(
        0,
        timerSnapshot.remainingMs -
          (nowMs - timerSnapshot.receivedAtMs) -
          (timerSnapshot.serverDelayMs ?? 0)
      )
    : null;
  const hideTimer = isGameOver || timerSnapshot?.stageKey?.startsWith("preGame:");
  const visibleTimerMs = hideTimer ? null : timerMs;
  const hasDisconnectCountdown =
    Object.keys(disconnectStateByPlayerId).length > 0;
  const hasIdleCountdown = Boolean(activeIdlePlayerId);

  useEffect(() => {
    if (!timerSnapshot || hideTimer) {
      if (!hasDisconnectCountdown && !hasIdleCountdown) return;
    }
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timerSnapshot, hideTimer, hasDisconnectCountdown, hasIdleCountdown]);

  useEffect(() => {
    if (isGameOver || activeIdlePlayerId == null) {
      setIdleAckError(null);
      setIsAcknowledgingIdle(false);
    }
  }, [activeIdlePlayerId, isGameOver]);

  useEffect(() => {
    if (devPlay?.type === "roadBuilding" && devPlay.playerId === playerID) {
      if (playerAction !== "roadBuilding") {
        setPlayerAction("roadBuilding");
      }
      return;
    }
    if (playerAction === "roadBuilding") {
      setPlayerAction(null);
    }
  }, [devPlay, playerID, playerAction]);

  useEffect(() => {
    if (
      shouldResetPlayerAction({
        playerAction,
        playerID,
        ctx: bgioProps.ctx,
        core,
        coreTopology: bgioProps.G?.coreTopology,
        corePhase: core?.phase,
        isGameOver
      })
    ) {
      setPlayerAction(null);
      clearBuildPickup();
    }
  }, [
    clearBuildPickup,
    playerAction,
    playerID,
    bgioProps.ctx,
    bgioProps.G?.coreTopology,
    core,
    core?.phase,
    isGameOver
  ]);

  useEffect(() => {
    if (buildPickup == null) return;
    if (getBuildPickupPieceType(playerAction) != null) return;
    clearBuildPickup();
  }, [buildPickup, clearBuildPickup, playerAction]);

  useEffect(() => {
    if (!shouldCloseTradeModal) {
      return;
    }

    setShowTradeModal(false);
    setTradePresetResource(null);
  }, [shouldCloseTradeModal]);

  useEffect(() => {
    if (!pendingDevCardReveal) return undefined;

    const timeoutId = window.setTimeout(() => {
      setPendingDevCardReveal((current) => {
        if (current !== pendingDevCardReveal) return current;
        pendingDevCardRevealRef.current = null;
        return null;
      });
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [pendingDevCardReveal]);

  const playerDevCards = player?.devCards ?? null;
  const playerRevealId = player?.id ?? null;
  const displayDevCards = getVisibleDevCardsDuringReveal({
    pendingReveal: pendingDevCardReveal,
    activeReveal: activeDevCardReveal,
    playerId: playerRevealId,
    playerDevCards: playerDevCards ?? [],
  });
  const frozenVpSnapshot =
    activeDevCardReveal?.vpSnapshot ?? pendingDevCardReveal?.vpSnapshot ?? null;
  const revealInFlight =
    (pendingDevCardReveal &&
      String(pendingDevCardReveal.playerId) === String(playerRevealId)) ||
    (activeDevCardReveal &&
      String(activeDevCardReveal.playerId) === String(playerRevealId));
  const displayPlayer = !player
    ? player
    : {
        ...player,
        devCards: displayDevCards,
      };

  // Discard Logic
  // Check if pendingDiscards list includes the current player
  // NOTE: We used to check bgioProps.ctx.phase === 'robberDiscard' but sometimes
  // the client-side derived ctx.phase might lag or differ if the game engine isn't strictly mapping G to ctx phases 1:1.
  // Relying on G.core.turn.pendingDiscards is more robust because that IS the source of truth for "who needs to discard".
  // Also, G.core.turn.phase should be 'robberDiscard' if pendingDiscards > 0, but let's be safe.
  const needsToDiscard =
    !isGameOver && (coreTurn?.pendingDiscards?.includes(playerID) ?? false);
  
  const discardCount = needsToDiscard ? Math.floor(player.resources.length / 2) : 0;

  const handleDiscardConfirm = (resourcesToDiscard) => {
    bgioProps.moves.discardResources(resourcesToDiscard);
    // Modal will auto-close when phase/state updates
  };

  const handleTradeConfirm = (tradeData) => {
    // console.log("Trade:", tradeData);
    // Connect to actual move:
    bgioProps.moves.maritimeTrade(tradeData);
    // For now just close
    setShowTradeModal(false);
    setTradePresetResource(null);
  };

  const handleDevPlayConfirm = (payload) => {
    bgioProps.moves.confirmDevCardPlay(payload);
  };

  const handleDevPlayCancel = () => {
    bgioProps.moves.cancelDevCardPlay();
  };

  const handleTradeOpen = (resource) => {
    setTradePresetResource(resource ?? null);
    setShowTradeModal(true);
  };

  const handleDevCardRevealComplete = useCallback(() => {
    setActiveDevCardReveal(null);
  }, []);

  const handleResign = () => {
    if (isGameOver) return;
    if (typeof moves.resign !== "function") return;
    if (typeof window !== "undefined") {
      const didConfirm = window.confirm(
        "Resign this match? You will immediately lose."
      );
      if (!didConfirm) return;
    }
    moves.resign();
  };

  const handleAcknowledgeIdle = async () => {
    if (isAcknowledgingIdle) return;
    if (!matchID || playerID == null) return;
    if (typeof window === "undefined") return;
    if (!bgioProps.credentials) {
      setIdleAckError("Missing player credentials.");
      return;
    }

    setIsAcknowledgingIdle(true);
    setIdleAckError(null);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/idle/${matchID}/ack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerID,
          credentials: bgioProps.credentials
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to clear idle warning.");
      }

      setIdleAckError(null);
    } catch (error) {
      setIdleAckError(error?.message ?? "Unable to clear idle warning.");
    } finally {
      setIsAcknowledgingIdle(false);
    }
  };

  const canRoll = Boolean(
    !isGameOver &&
      playerID &&
      bgioProps.ctx.currentPlayer === playerID &&
      bgioProps.ctx.activePlayers?.[playerID] === "preRoll" &&
      core?.phase === "normal" &&
      coreTurn?.phase === "preRoll"
  );

  const canEnd = Boolean(
    !isGameOver &&
      playerID &&
      bgioProps.ctx.currentPlayer === playerID &&
      bgioProps.ctx.activePlayers?.[playerID] === "postRoll" &&
      core?.phase === "normal" &&
      coreTurn?.hasRolled &&
      coreTurn?.phase === "postRoll" &&
      (coreTurn?.pendingDiscards?.length ?? 0) === 0
  );

  const hasModalOpen =
    tradeModalVisible ||
    needsToDiscard ||
    devPlayModalVisible ||
    showGameOverModal ||
    showPostgame;

  //TODO: this will return multiple for non 1v1 games. handle in UI appropriately
  //const opponentID = bgioProps.G.players.map(p=>(p.id !== playerID) ? p.id : null).filter(p=>p!== null)[0]
  const opponents = Object.values(playerViewMap)
    .filter((view) => view.id !== playerID)
    .map((view) => ({
      ...view,
      name: nameMap[view.id],
      emoji: emojiMap[view.id]
    }));
  const localIdlePresence =
    playerID != null ? idleStateByPlayerId[playerID] ?? null : null;
  const showIdlePrompt =
    !isGameOver &&
    playerID != null &&
    activeIdlePlayerId != null &&
    String(activeIdlePlayerId) === String(playerID) &&
    disconnectStateByPlayerId[playerID] == null &&
    localIdlePresence != null;

  //const otherPlayerCards = bgioProps.G.players[opponentID].resourceCards; //TODO: horrible, clean up. might need to check if playerID exists (e.g. what about spectator)

  //we get a username here, being 'playerID' currently..

  const handleScreenClickCapture = (event) => {
    const target = event?.target;
    const targetIsActionCircle = Boolean(
      target?.closest?.('[data-action-circle="true"]')
    );
    if (
      shouldCancelBuildAction({
        playerAction,
        phase: bgioProps.ctx.phase,
        targetIsActionCircle
      })
    ) {
      setPlayerAction(null);
      clearBuildPickup();
    }
  };
  const allowInteractionSelector = '[data-allow-interaction="true"]';
  const handleContextMenu = (event) => {
    // Opt-in for future log/chat/status containers.
    if (event?.target?.closest?.(allowInteractionSelector)) return;
    event.preventDefault();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.code === "Escape") {
        if (getBuildPickupPieceType(playerAction) == null) return;
        event.preventDefault();
        setPlayerAction(null);
        clearBuildPickup();
        return;
      }
      if (event.code !== "Space") return;
      if (event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const targetElement = event.target instanceof Element ? event.target : null;
      const isEditable = targetElement?.closest?.(
        "input, textarea, select, [contenteditable]"
      );
      if (isEditable) return;
      if (hasModalOpen) return;
      if (isGameOver) return;

      event.preventDefault();

      if (canRoll) {
        moves.rollDice();
        return;
      }
      if (canEnd) {
        setPlayerAction(null);
        clearBuildPickup();
        moves.endTurn();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canRoll,
    canEnd,
    clearBuildPickup,
    hasModalOpen,
    isGameOver,
    moves,
    playerAction
  ]);

  const effects = useMemo(() => {
    return {
      resourceDistribution: ({ layerRef, boardRef, emitCue }) => {
        const runner = createResourceDistributionRunner({
          getLayerEl: () => layerRef.current,
          getLayout: () => {
            if (!width || !height) return null;
            return getBoardLayout({ width, height });
          },
          getBoardRect: () =>
            boardRef?.current?.getBoundingClientRect() ?? new DOMRect(),
          emitCue,
          themeId
        });

        return (event) => runner(event?.payload);
      },
      piecePlacement: ({ layerRef, boardRef, emitCue }) => {
        const runner = createPiecePlacementRunner({
          getLayerEl: (payload) =>
            payload?.pieceType === "road"
              ? placementRoadLayerRef.current
              : placementLayerRef.current,
          getLayout: () => {
            if (!width || !height) return null;
            return getBoardLayout({ width, height });
          },
          getBoardRect: () =>
            boardRef?.current?.getBoundingClientRect() ?? new DOMRect(),
          getTiles: () => bgioProps.G?.tiles ?? [],
          getPlayerColor: (playerId) => effectiveColorByPlayerId[playerId] ?? "red",
          emitCue,
          useBoardSpace: true,
          themeId
        });

        return (event) => runner(event?.payload);
      },
      devCardReveal: () => {
        return (event) => {
          const payload = event?.payload;
          if (!payload) return;
          if (String(payload.playerId) !== String(playerID)) return;
          startDevCardRevealFromEffect(payload);
        };
      }
    };
  }, [
    width,
    height,
    bgioProps.G,
    effectiveColorByPlayerId,
    playerID,
    startDevCardRevealFromEffect,
    themeId
  ]);
  // console.log('p', player)
  // console.log('opps', opponents)
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };
  const handleBoardTransformed = useCallback((_ref, state) => {
    const nextScale =
      Number.isFinite(state?.scale) && state.scale > 0 ? state.scale : 1;

    setBoardViewportScale((currentScale) =>
      Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale
    );
  }, []);
  return (
    <div
      className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600 select-none"
      style={{
        width: "100vw", // Use viewport width to take the full screen width
        height: "100vh", // Use viewport height to take the full screen height
        overflow: "hidden", // Prevent scrollbars on the page
        position: "fixed", // Fix the object in place
        top: 0,
        left: 0,
      }}
      onClickCapture={handleScreenClickCapture}
      onContextMenu={handleContextMenu}
    >
      {/* board in zoom/pan/pinch wrapper  */}
      <TransformWrapper
        minPositionX={-500}
        minPositionY={-200}
        maxPositionX={500}
        maxPositionY={500}
        maxScale={6}
        minScale={0.3}
        disablePadding={true}
        doubleClick={{ mode: "toggle" }}
        onTransformed={handleBoardTransformed}
      >
        <TransformComponent>
          <CatanBoard
            boardRef={boardRef}
            placementLayerRef={placementLayerRef}
            placementRoadLayerRef={placementRoadLayerRef}
            boardViewportScale={boardViewportScale}
            playerAction={playerAction}
            setPlayerAction={setPlayerAction}
            buildPickup={buildPickup}
            setBuildPickup={setBuildPickup}
            playerColorMap={effectiveColorByPlayerId}
            robberPlacementMotionMode={robberPlacementMotionMode}
            themeId={themeId}
            {...bgioProps}
          />
        </TransformComponent>
      </TransformWrapper>

      <DevCardPurchaseReveal
        reveal={activeDevCardReveal}
        onComplete={handleDevCardRevealComplete}
      />

      <button
        type="button"
        onClick={handleToggleMute}
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-slate-700 shadow-lg ring-1 ring-white/50 backdrop-blur-sm transition hover:bg-white/80"
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        data-allow-interaction="true"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5"
          fill="currentColor"
        >
          <path d="M11 4.5 6.8 8H4.5A1.5 1.5 0 0 0 3 9.5v5A1.5 1.5 0 0 0 4.5 16h2.3L11 19.5a1 1 0 0 0 1.6-.8V5.3A1 1 0 0 0 11 4.5Z" />
          {isMuted ? (
            <path d="m19.5 7.5-1-1-13 13 1 1 13-13Z" />
          ) : (
            <path d="M15.5 8.2a1 1 0 0 1 1.4 0c.9.9 1.4 2.1 1.4 3.3s-.5 2.4-1.4 3.3a1 1 0 1 1-1.4-1.4c.6-.6.9-1.3.9-1.9s-.3-1.3-.9-1.9a1 1 0 0 1 0-1.4Z" />
          )}
        </svg>
      </button>

      {!isGameOver && !!player && (
        <GlassPillButton
          className="fixed right-4 top-4 z-40"
          onClick={handleResign}
          aria-label="Resign match"
          data-allow-interaction="true"
        >
          <span>Resign</span>
        </GlassPillButton>
      )}

      {showResultsButton && (
        <GlassPillButton
          className="fixed right-4 top-4 z-40"
          onClick={() => setShowGameOverModal(true)}
          aria-label="Open game results"
          data-allow-interaction="true"
        >
          <span aria-hidden="true">🏆</span>
          <span>Results</span>
        </GlassPillButton>
      )}

      <LeftMetaRail
        entries={visibleLogEntries}
        logPlayerMap={logPlayerMap}
        themeId={themeId}
        playerID={playerID}
        bgioProps={bgioProps}
      />

      <GameEffects
        boardRef={boardRef}
        effects={effects}
        currentPlayerId={bgioProps.ctx?.currentPlayer}
        playerID={playerID}
        phase={bgioProps.ctx?.phase}
        gameOverState={gameOverState}
        isWinner={isWinner}
      />

      {/* our cards and action dock 
TODO: accurately colour it
*/}
      {!!player && (
        <PlayerActionContainer
          setPlayerAction={setPlayerAction}
          buildPickup={buildPickup}
          setBuildPickup={setBuildPickup}
          bgioProps={bgioProps}
          //playerID={bgioProps.playerID} //for multiplayer
          player={displayPlayer} //for testing/dev
          presence={disconnectStateByPlayerId[player.id] ?? idleStateByPlayerId[player.id] ?? null}
          onDevCardPurchaseStart={handleDevCardPurchaseStart}
          devCardDisplayRef={devCardDisplayRef}
          displayDevCards={displayPlayer?.devCards ?? null}
          keepDevCardShellMounted={Boolean(revealInFlight)}
          vpDisplayOverride={frozenVpSnapshot}
          onTradeClick={handleTradeOpen}
          isActive={!isGameOver && gameStatus.activePlayerId === player.id}
          statusType={gameStatus.statusType}
          gameStatus={gameStatus}
          canRoll={canRoll}
          canEnd={canEnd}
          timerMs={visibleTimerMs}
          themeId={themeId}
        />
      )}

      {/* MODALS */}
      {/* 1. Force Discard Modal */}
      {!!player && needsToDiscard && !isGameOver && (
        <TradeDiscardModal
          mode="discard"
          player={player}
          requiredDiscardCount={discardCount}
          onConfirm={handleDiscardConfirm}
          themeId={themeId}
          // No cancel for forced discard
        />
      )}

      {/* 2. Manual Trade Modal */}
      {!!player && tradeModalVisible && !needsToDiscard && !isGameOver && (
        <TradeDiscardModal
          mode="trade"
          player={player}
                onConfirm={handleTradeConfirm}
                onCancel={() => {
                  setShowTradeModal(false);
                  setTradePresetResource(null);
                  clearBuildPickup();
                }}
          G={bgioProps.G}
          tradePresetResource={tradePresetResource}
          themeId={themeId}
        />
      )}

      {!!player && devPlayModalVisible && !needsToDiscard && !isGameOver && (
        <TradeDiscardModal
          mode={devPlayMode}
          player={player}
          onConfirm={handleDevPlayConfirm}
          onCancel={handleDevPlayCancel}
          G={bgioProps.G}
          themeId={themeId}
        />
      )}

      {showIdlePrompt ? (
        <IdlePromptModal
          remainingMs={localIdlePresence?.remainingMs ?? null}
          onAcknowledge={handleAcknowledgeIdle}
          isSubmitting={isAcknowledgingIdle}
          error={idleAckError}
        />
      ) : null}

      {(opponents.length > 0 || showConnectionBanner) && (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-30 flex flex-col items-center gap-3 px-4">
          {opponents.length > 0 && (
            <div className="pointer-events-auto flex items-start gap-4">
              {opponents.map((opponent) => (
                <OpponentPlayerBox
                  key={opponent.id}
                  player={opponent}
                  presence={disconnectStateByPlayerId[opponent.id] ?? idleStateByPlayerId[opponent.id] ?? null}
                  core={bgioProps.G.core}
                  coreTopology={bgioProps.G.coreTopology}
                  isActive={!isGameOver && gameStatus.activePlayerId === opponent.id}
                  statusType={gameStatus.statusType}
                />
              ))}
            </div>
          )}

          {showConnectionBanner ? (
            <StatusBanner
              variant="danger"
              title="Connection lost. Trying to reconnect…"
              className="pointer-events-auto max-w-lg"
            />
          ) : null}
        </div>
      )}

      {showGameOverModal && (
        <GameOverOverlay>
          <GameOverModal
            title={isWinner ? "You win!" : `${winnerName} wins!`}
            subtitle={
              gameOverState?.reason === "victoryPoints"
                ? winnerVP != null
                  ? `Victory Points: ${winnerVP}`
                  : "Victory Points"
                : gameOverReasonText
            }
            scoreboard={scoreboard}
            isWinner={isWinner}
            shouldFireConfetti={isWinner && !winnerConfettiSeenRef.current}
            onConfettiFired={() => {
              winnerConfettiSeenRef.current = true;
            }}
            onViewPostgame={() => {
              setShowPostgame(true);
              setShowGameOverModal(false);
            }}
            onRematch={() => {}}
            onLobby={() => {
              window.location.href = "/catana";
            }}
            onClose={() => setShowGameOverModal(false)}
          />
        </GameOverOverlay>
      )}

      {showPostgame && (
        <PostgameOverlay
          summary={postgameSummary}
          scoreboard={scoreboard}
          onClose={() => {
            setShowPostgame(false);
            setShowGameOverModal(true);
          }}
        />
      )}
    </div>
  );
}

export const GameScreenWithEffects = EffectsBoardWrapper(GameScreen, {
  // Wait until all effects have finished before updating state.
  updateStateAfterEffects: true,
});
