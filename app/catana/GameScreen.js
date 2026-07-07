"use client";
import { MemoizedCatanBoard } from "./Board";
import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";

import { shouldCancelBuildAction } from "./utils/cancelBuildAction";
import { getGameStatus, shouldShowGameStatusTimer } from "./utils/gameStatus";
import {
  getBuildPickupPieceType,
  shouldResetPlayerAction
} from "./utils/playerAction";
import { buildGameScreenDisplayModel } from "./utils/gameScreenDisplayModel";
import {
  getActiveDisconnectStateByPlayerId,
  mergeVisibleLogEntries,
  readPresenceSnapshot
} from "./utils/disconnectPresence";
import {
  classifyIncomingGameLogEntries,
  flushDeferredGameLogEntries
} from "./utils/gameLogPresentation";
import {
  buildDevCardBuyTransfer,
  buildDiscardTransfers,
  buildMaritimeTradeTransfers,
  buildRobberStealTransfers
} from "./utils/cardTransferPayloads";
import {
  getActiveIdleStateByPlayerId,
  readIdlePresenceSnapshot
} from "./utils/idlePresence";
import {
  getDiscardRequirement,
  getHasBlockingModal,
  getTurnCommandState,
  getVisibleDiceRoll
} from "./utils/gameScreenCommandState";
import {
  getTimerRemainingMs,
  normalizeTimerSnapshot
} from "./utils/timerSnapshot";
import {
  canRenderDevPlayModal,
  shouldResetTradeModal
} from "./utils/turnUiState";

import { EffectsBoardWrapper } from "bgio-effects/react";

import { PlayerActionContainer } from "./components/PlayerActionContainer";
import { MobilePlayerCockpit } from "./components/MobilePlayerCockpit";
import { MobileMatchMenu } from "./components/MobileMatchMenu";
import { OpponentPlayerBox } from "./components/OpponentPlayerBox";
import { GlassPillButton } from "./components/GlassPillButton";
import { LeftMetaRail } from "./components/LeftMetaRail";
import { StatusBanner } from "./components/StatusBanner";
import { TradeDiscardModal } from "./components/TradeDiscardModal";
import { IdlePromptModal } from "./components/IdlePromptModal";
import { ResignConfirmDialog } from "./components/ResignConfirmDialog";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { GameOverModal } from "./components/GameOverModal";
import { PostgameOverlay } from "./components/PostgameOverlay";
import { DevCardPurchaseReveal } from "./DevCardPurchaseReveal";
import { GameEffects } from "./effects/GameEffects";
import { createEffectBus } from "./effects/EffectBus";
import { createResourceDistributionRunner } from "./effects/resourceDistribution";
import { createPiecePlacementRunner } from "./effects/placePiece";
import { createDevCardPlayRunner } from "./effects/devCardPlay";
import {
  createCardTransferRunner,
  getRobberStealVisibleResource
} from "./effects/cardTransfer";
import { createRobberMoveRunner } from "./effects/robberMove";
import { createAwardClaimRunner } from "./effects/awardClaim";
import {
  getDevCardPlayMotionPolicy,
  getDevCardPlayPerspective
} from "./effects/devCardPlayPerspective";
import {
  getVisibleDevCardsDuringReveal,
} from "./utils/devCardPurchaseReveal";
import {
  createKnightDisplayOverride,
  removeKnightDisplayOverride,
  upsertKnightDisplayOverride
} from "./utils/devCardPlayPresentation";
import useWindowSize from "./utils/useWindowSize";
import { getBoardLayout } from "./utils/boardLayout";
import {
  getLobbyServerOrigin,
} from "./utils/serverOrigins";
import {
  DEFAULT_ROBBER_PLACEMENT_MOTION_MODE
} from "./utils/robberPlacementMotion";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { IconButton } from "../ui/IconButton";
import { Tooltip, TooltipProvider } from "../ui/Tooltip";
import { Howler } from "howler";
import {
  CATANA_THEME_STORAGE_KEY,
  resolveThemeId,
} from "./theme/themes";
import { CATANA_TABLE_BACKGROUND } from "./theme/backgrounds";
import {
  clearLastActiveMatch,
  readLastActiveMatch
} from "./utils/activeMatchStorage";
import { shouldAutoReady } from "./utils/preGameReady";
import {
  buildSandboxAwardClaimPayload,
  buildSandboxDevCardPlayPayload,
  buildSandboxRobberMovePayload
} from "./dev/sandbox/effectPayloads";

const AUDIO_MUTE_STORAGE_KEY = "catana:audioMuted";
const topUtilityButtonClassName =
  "h-10 w-10 border-white/[0.32] bg-white/[0.24] text-slate-700/90 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.38)] backdrop-blur-md hover:border-white/[0.42] hover:bg-white/[0.34] hover:text-slate-800 sm:h-12 sm:w-12 [&_svg]:opacity-[0.85] hover:[&_svg]:opacity-100";

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

const runAfterNextPaint = (callback) => {
  if (typeof window === "undefined") {
    callback();
    return;
  }
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }
  window.setTimeout(callback, 0);
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
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [showGameSettings, setShowGameSettings] = useState(false);
  const [showGameRules, setShowGameRules] = useState(false);
  const [mobileMetaPanel, setMobileMetaPanel] = useState(null);
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [presentedGameLogEntries, setPresentedGameLogEntries] = useState([]);
  const [deferredLogEntries, setDeferredLogEntries] = useState([]);
  const [knightDisplayOverrideByPlayerId, setKnightDisplayOverrideByPlayerId] =
    useState({});
  const [lastSeenGameLogId, setLastSeenGameLogId] = useState(0);
  const [boardViewportScale, setBoardViewportScale] = useState(1);
  const robberPlacementMotionMode = DEFAULT_ROBBER_PLACEMENT_MOTION_MODE;
  const gameOverSeenRef = useRef(false);
  const winnerConfettiSeenRef = useRef(false);
  const hasSeenTransportConnectionRef = useRef(false);
  const previousIsConnectedRef = useRef(bgioProps.isConnected);
  const bypassNextGameLogDelayRef = useRef(false);
  const boardRef = useRef(null);
  const placementLayerRef = useRef(null);
  const placementRoadLayerRef = useRef(null);
  const devCardDisplayRef = useRef(null);
  const devCardDisplayRectRef = useRef(null);
  const devCardPlayActorStoreRef = useRef(new Map());
  const pendingDevCardRevealRef = useRef(null);
  const latestPlayerViewMapRef = useRef({});
  const previousResourcesByPlayerIdRef = useRef(new Map());
  const deferredLogEntriesRef = useRef([]);
  const effectsBus = useMemo(() => createEffectBus(), []);
  const { width, height } = useWindowSize();
  const isPhoneLayout = width > 0 && width < 640;
  const boardLayoutReservedHeight = isPhoneLayout ? 0 : undefined;
  const leftMetaRailLayoutInset = 0;
  const playfieldCenterOffsetX = 0;
  const moves = bgioProps.moves;
  const isReplay = bgioProps.isReplay === true;

  useEffect(() => {
    if (isPhoneLayout) return;
    setMobileMetaPanel(null);
  }, [isPhoneLayout]);

  //get the active playerID of who's watching
  //can be null for spectator?
  //TODO: handle null/spectator
  const playerID = bgioProps.playerID;
  const matchID = bgioProps.matchID ?? "default";

  const core = bgioProps.G.core;
  const ruleset = core?.ruleset ?? {};
  const coreTurn = core?.turn;
  const gameOverState = bgioProps.ctx?.gameover ?? core?.gameOver;
  const isGameOver = Boolean(gameOverState);
  const devPlay = bgioProps.G.devCardPlay;
  const devPlayMode =
    devPlay?.type === "yearOfPlenty"
      ? "dev-yop"
      : devPlay?.type === "monopoly"
      ? "dev-monopoly"
      : null;
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
  const {
    nameMap,
    emojiMap,
    effectiveColorByPlayerId,
    playerViewMap,
    player,
    winnerName,
    isWinner,
    winnerVP,
    scoreboard,
    logPlayerMap,
    gameOverReasonText,
    postgameSummary
  } = useMemo(
    () =>
      buildGameScreenDisplayModel({
        core,
        playerID,
        gameOverState,
        isGameOver,
        matchData: bgioProps.matchData,
        matchMetadata: bgioProps.matchMetadata
      }),
    [
      core,
      playerID,
      gameOverState,
      isGameOver,
      bgioProps.matchData,
      bgioProps.matchMetadata
    ]
  );
  const rawGameStatus = getGameStatus(core, bgioProps.ctx, {
    playerAction,
    viewerPlayerId: playerID,
    playerMap: nameMap
  });
  latestPlayerViewMapRef.current = playerViewMap;

  useEffect(() => {
    const next = new Map();
    Object.values(playerViewMap).forEach((view) => {
      if (view?.id == null) return;
      next.set(String(view.id), [...(view.resources ?? [])]);
    });
    previousResourcesByPlayerIdRef.current = next;
  }, [playerViewMap]);

  const canonicalGameLogEntries = useMemo(
    () => (Array.isArray(bgioProps.G?.gameLog) ? bgioProps.G.gameLog : []),
    [bgioProps.G?.gameLog]
  );
  const canDelayGameLogPresentation =
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? true
      : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visibleLogEntries = useMemo(
    () =>
      mergeVisibleLogEntries(
        presentedGameLogEntries,
        [
          ...(disconnectPresence?.events ?? []),
          ...(idlePresence?.events ?? [])
        ]
      ),
    [presentedGameLogEntries, disconnectPresence, idlePresence]
  );
  const activeIdlePlayerId = idlePresence?.activeIdlePlayerId ?? null;
  const disconnectStateByPlayerId = useMemo(() => {
    return getActiveDisconnectStateByPlayerId(disconnectPresence, nowMs);
  }, [disconnectPresence, nowMs]);
  const idleStateByPlayerId = useMemo(() => {
    return getActiveIdleStateByPlayerId(idlePresence, nowMs);
  }, [idlePresence, nowMs]);
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
  const handleResourceDistributionComplete = useCallback(() => {
    const readyToReveal = flushDeferredGameLogEntries(deferredLogEntriesRef.current);
    if (readyToReveal.length === 0) return;
    setPresentedGameLogEntries((currentEntries) => [
      ...currentEntries,
      ...readyToReveal
    ]);
    setDeferredLogEntries([]);
  }, []);
  const clearDevCardPlayActors = useCallback(() => {
    devCardPlayActorStoreRef.current.forEach((actor) => {
      actor?.el?.remove?.();
    });
    devCardPlayActorStoreRef.current.clear();
    setKnightDisplayOverrideByPlayerId({});
  }, []);
  const freezeKnightDisplayFromPayload = useCallback((payload) => {
    const override = createKnightDisplayOverride(payload);
    if (!override) return;
    setKnightDisplayOverrideByPlayerId((current) =>
      upsertKnightDisplayOverride(current, {
        ...override,
        playerId: String(override.playerId)
      })
    );
  }, []);
  const releaseKnightDisplayFromPayload = useCallback((payload) => {
    if (!payload?.playerId) return;
    setKnightDisplayOverrideByPlayerId((current) =>
      removeKnightDisplayOverride(current, String(payload.playerId))
    );
  }, []);
  const emitLargestArmyAwardFromPayload = useCallback((payload) => {
    if (payload?.cardType !== "knight") return;
    const nextOwnerId = payload.nextLargestArmyOwnerId;
    if (!nextOwnerId) return;
    if (String(nextOwnerId) !== String(payload.playerId)) return;
    if (String(nextOwnerId) === String(payload.previousLargestArmyOwnerId)) return;

    const baseEffectId = payload.effectId ?? `award:largest-army:${nextOwnerId}`;
    effectsBus.emit({
      type: "award:claim",
      payload: {
        effectId: `${baseEffectId}:largest-army`,
        awardType: "largestArmy",
        playerId: nextOwnerId,
        previousOwnerId: payload.previousLargestArmyOwnerId ?? null,
        playerColorId: effectiveColorByPlayerId[nextOwnerId],
        debugReplay: Boolean(payload.debugReplay)
      }
    });
  }, [effectsBus, effectiveColorByPlayerId]);
  const handleDevCardPlayResolveComplete = useCallback((payload) => {
    releaseKnightDisplayFromPayload(payload);
    emitLargestArmyAwardFromPayload(payload);
  }, [emitLargestArmyAwardFromPayload, releaseKnightDisplayFromPayload]);

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
      clearDevCardPlayActors();
      setShowTradeModal(false);
      setTradePresetResource(null);
    }
  }, [clearBuildPickup, clearDevCardPlayActors, isGameOver]);

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
    setPresentedGameLogEntries([]);
    setDeferredLogEntries([]);
    setLastSeenGameLogId(0);
    pendingDevCardRevealRef.current = null;
    deferredLogEntriesRef.current = [];
    setPendingDevCardReveal(null);
    setActiveDevCardReveal(null);
    clearDevCardPlayActors();
    hasSeenTransportConnectionRef.current = false;
    bypassNextGameLogDelayRef.current = false;
  }, [clearDevCardPlayActors, matchID]);

  useEffect(() => {
    pendingDevCardRevealRef.current = pendingDevCardReveal;
  }, [pendingDevCardReveal]);

  useEffect(() => {
    const rect = copyRect(devCardDisplayRef.current?.getBoundingClientRect?.());
    if (rect) {
      devCardDisplayRectRef.current = rect;
    }
  });

  useEffect(() => {
    deferredLogEntriesRef.current = deferredLogEntries;
  }, [deferredLogEntries]);

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
    const justReconnected =
      bgioProps.isConnected && previousIsConnectedRef.current === false;

    if (justReconnected) {
      const readyToReveal = flushDeferredGameLogEntries(deferredLogEntriesRef.current);
      bypassNextGameLogDelayRef.current = true;
      if (readyToReveal.length > 0) {
        setPresentedGameLogEntries((currentEntries) => [
          ...currentEntries,
          ...readyToReveal
        ]);
      }
      setDeferredLogEntries([]);
    }

    previousIsConnectedRef.current = bgioProps.isConnected;
  }, [bgioProps.isConnected]);

  useEffect(() => {
    const isInitialBackfill =
      lastSeenGameLogId === 0 &&
      presentedGameLogEntries.length === 0 &&
      deferredLogEntries.length === 0 &&
      canonicalGameLogEntries.length > 0;
    const isBackfill =
      bypassNextGameLogDelayRef.current || isInitialBackfill;
    const classification = classifyIncomingGameLogEntries({
      entries: canonicalGameLogEntries,
      lastSeenId: lastSeenGameLogId,
      canDelay: canDelayGameLogPresentation,
      isBackfill,
      hasPendingDeferred: deferredLogEntriesRef.current.length > 0
    });

    if (classification.visibleNow.length > 0) {
      setPresentedGameLogEntries((currentEntries) => [
        ...currentEntries,
        ...classification.visibleNow
      ]);
    }

    if (classification.deferred.length > 0) {
      setDeferredLogEntries((currentEntries) => [
        ...currentEntries,
        ...classification.deferred
      ]);
    }

    if (classification.nextLastSeenId !== lastSeenGameLogId) {
      setLastSeenGameLogId(classification.nextLastSeenId);
    }

    if (isBackfill) {
      bypassNextGameLogDelayRef.current = false;
    }
  }, [
    canonicalGameLogEntries,
    lastSeenGameLogId,
    canDelayGameLogPresentation,
    presentedGameLogEntries.length,
    deferredLogEntries.length
  ]);

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
    setTimerSnapshot(
      normalizeTimerSnapshot(
        bgioProps.timerSnapshot,
        bgioProps.timerServerTimeMs
      )
    );
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
    if (isReplay) return;
    if (!matchID || typeof window === "undefined") return;
    if (bgioProps.timerSnapshot !== undefined || timerSeeded) return;
    let cancelled = false;

    const fetchSeed = async () => {
      try {
        const baseUrl = getLobbyServerOrigin();
        const url = `${baseUrl}/timer/${matchID}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (!data?.timer) {
          setTimerSeeded(true);
          return;
        }
        setTimerSnapshot(
          normalizeTimerSnapshot(data.timer, data.serverTimeMs)
        );
        setTimerSeeded(true);
      } catch (err) {
        // ignore errors
      }
    };

    fetchSeed();
    return () => {
      cancelled = true;
    };
  }, [isReplay, matchID, timerSeeded, bgioProps.timerSnapshot]);

  useEffect(() => {
    if (isReplay) return;
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
    isReplay,
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

  const timerMs = getTimerRemainingMs(timerSnapshot, nowMs);
  const hideTimer =
    isGameOver ||
    !shouldShowGameStatusTimer(rawGameStatus, timerSnapshot);
  const visibleTimerMs = hideTimer ? null : timerMs;
  const gameStatus = isGameOver
    ? {
        ...rawGameStatus,
        kind: "game_over",
        title: "Game Over",
        text: "Game Over",
        activePlayerId: null,
        showTimer: false
      }
    : {
        ...rawGameStatus,
        showTimer: !hideTimer
      };
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
  const displayDevCardsDuringReveal = getVisibleDevCardsDuringReveal({
    pendingReveal: pendingDevCardReveal,
    activeReveal: activeDevCardReveal,
    playerId: playerRevealId,
    playerDevCards: playerDevCards ?? [],
  });
  const localParkedDevCardType =
    devPlay?.playerId != null &&
    String(devPlay.playerId) === String(playerRevealId) &&
    ["roadBuilding", "yearOfPlenty", "monopoly"].includes(devPlay.type)
      ? devPlay.type
      : null;
  const displayDevCards = localParkedDevCardType
    ? displayDevCardsDuringReveal.filter((card, index) => {
        if (card !== localParkedDevCardType) return true;
        return displayDevCardsDuringReveal.indexOf(card) !== index;
      })
    : displayDevCardsDuringReveal;
  const frozenVpSnapshot =
    activeDevCardReveal?.vpSnapshot ?? pendingDevCardReveal?.vpSnapshot ?? null;
  const revealInFlight =
    (pendingDevCardReveal &&
      String(pendingDevCardReveal.playerId) === String(playerRevealId)) ||
    (activeDevCardReveal &&
      String(activeDevCardReveal.playerId) === String(playerRevealId));
  const localKnightPlayInFlight =
    playerRevealId != null &&
    Boolean(knightDisplayOverrideByPlayerId[String(playerRevealId)]);
  const localDevCardPlayInFlight =
    localKnightPlayInFlight || Boolean(localParkedDevCardType);
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
  const { needsToDiscard, discardCount } = getDiscardRequirement({
    isGameOver,
    coreTurn,
    playerID,
    player
  });

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
    setShowResignConfirm(true);
  };

  const handleConfirmResign = () => {
    setShowResignConfirm(false);
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
      const baseUrl = getLobbyServerOrigin();
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

  const { canRoll, canEnd } = getTurnCommandState({
    isGameOver,
    playerID,
    ctx: bgioProps.ctx,
    core,
    coreTurn
  });

  const hasModalOpen = getHasBlockingModal({
    tradeModalVisible,
    needsToDiscard,
    devPlayModalVisible,
    showGameOverModal,
    showPostgame,
    showGameSettings,
    showGameRules
  });

  //TODO: this will return multiple for non 1v1 games. handle in UI appropriately
  //const opponentID = bgioProps.G.players.map(p=>(p.id !== playerID) ? p.id : null).filter(p=>p!== null)[0]
  const opponents = useMemo(
    () =>
      Object.values(playerViewMap)
        .filter((view) => view.id !== playerID)
        .map((view) => ({
          ...view,
          name: nameMap[view.id],
          emoji: emojiMap[view.id]
        })),
    [emojiMap, nameMap, playerID, playerViewMap]
  );
  const displayedOpponents = useMemo(
    () => (isPhoneLayout ? opponents.slice(0, 1) : opponents),
    [isPhoneLayout, opponents]
  );
  const localIdlePresence =
    playerID != null ? idleStateByPlayerId[playerID] ?? null : null;
  const activePlayerName =
    gameStatus.activePlayerId != null
      ? nameMap[gameStatus.activePlayerId] ?? `Player ${gameStatus.activePlayerId}`
      : null;
  const mobileCommandDiceRoll = getVisibleDiceRoll(bgioProps.G);
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
    if (isReplay) return;
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
    isReplay,
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
            return getBoardLayout({
              width,
              height,
              leftInset: leftMetaRailLayoutInset,
              reservedUiHeight: boardLayoutReservedHeight,
            });
          },
          getBoardRect: () =>
            boardRef?.current?.getBoundingClientRect() ?? new DOMRect(),
          emitCue,
          onComplete: handleResourceDistributionComplete,
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
            return getBoardLayout({
              width,
              height,
              leftInset: leftMetaRailLayoutInset,
              reservedUiHeight: boardLayoutReservedHeight,
            });
          },
          getBoardRect: () =>
            boardRef?.current?.getBoundingClientRect() ?? new DOMRect(),
          getTiles: () => bgioProps.G?.tiles ?? [],
          getPlayerColor: (playerId) => effectiveColorByPlayerId[playerId] ?? "red",
          getViewerPlayerId: () => playerID,
          emitCue,
          useBoardSpace: true,
          themeId
        });

        return (event) => runner(event?.payload);
      },
      devCardReveal: ({ layerRef, emitCue }) => {
        const transferRunner = createCardTransferRunner({
          getLayerEl: () => layerRef.current,
          resolveTransfers: (payload) => payload.transfers ?? [],
          emitCue,
          themeId
        });

        return (event) => {
          const payload = event?.payload;
          if (!payload) return;
          if (String(payload.playerId) === String(playerID)) {
            startDevCardRevealFromEffect(payload);
            return;
          }
          transferRunner({
            ...payload,
            transfers: buildDevCardBuyTransfer(payload)
          });
        };
      },
      cardTransfer: ({ layerRef, emitCue }) => {
        const runner = createCardTransferRunner({
          getLayerEl: () => layerRef.current,
          resolveTransfers: (payload) => payload.transfers ?? [],
          emitCue,
          themeId
        });

        return (event) => {
          const payload = event?.payload;
          if (!payload) return;

          if (event.type === "resource:maritime-trade") {
            runner({
              ...payload,
              transfers: buildMaritimeTradeTransfers(payload)
            });
            return;
          }

          if (event.type === "resource:discard") {
            runner({
              ...payload,
              transfers: buildDiscardTransfers(payload)
            });
            return;
          }

          if (event.type === "resource:robber-steal") {
            runAfterNextPaint(() => {
              const visibleResource = getRobberStealVisibleResource({
                payload,
                viewerPlayerId: playerID,
                previousResourcesByPlayerId: previousResourcesByPlayerIdRef.current,
                currentPlayerViewMap: latestPlayerViewMapRef.current
              });
              runner({
                ...payload,
                transfers: buildRobberStealTransfers({ payload, visibleResource })
              });
            });
          }
        };
      },
      robberMove: ({ emitCue }) => {
        const runner = createRobberMoveRunner({
          getLayerEl: () => placementLayerRef.current,
          getLayout: () => {
            if (!width || !height) return null;
            return getBoardLayout({
              width,
              height,
              leftInset: leftMetaRailLayoutInset,
              reservedUiHeight: boardLayoutReservedHeight,
            });
          },
          getTiles: () => bgioProps.G?.tiles ?? [],
          viewerPlayerId: playerID,
          emitCue,
          themeId
        });

        return (event) => runner(event?.payload);
      },
      awardClaim: ({ layerRef, emitCue }) => {
        const runner = createAwardClaimRunner({
          getLayerEl: () => layerRef.current,
          getRoadsByEdgeId: () => bgioProps.G?.core?.roadsByEdgeId ?? {},
          getPlayerColor: (playerId) => effectiveColorByPlayerId[playerId],
          getTargetEl: (_payload, id) => document.getElementById(id),
          emitCue
        });

        return (event) => runner(event?.payload);
      },
      devCardPlay: ({ layerRef, emitCue }) => {
        const runner = createDevCardPlayRunner({
          getLayerEl: () => layerRef.current,
          getSourceEl: (payload, id) => {
            const sourceEl = document.getElementById(id);
            if (sourceEl) return sourceEl;
            if (String(payload?.playerId) !== String(playerID)) return null;
            const cachedRect = devCardDisplayRectRef.current;
            if (!cachedRect) return null;
            return {
              getBoundingClientRect: () => cachedRect
            };
          },
          getTargetEl: (_payload, id) => document.getElementById(id),
          getPerspective: (payload) =>
            getDevCardPlayPerspective({
              viewerPlayerId: playerID,
              actorPlayerId: payload.playerId
            }),
          getMotionPolicy: () =>
            getDevCardPlayMotionPolicy({
              reducedMotion:
                typeof window !== "undefined" &&
                typeof window.matchMedia === "function" &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
            }),
          actorStore: devCardPlayActorStoreRef,
          emitCue,
          onStart: freezeKnightDisplayFromPayload,
          onResolveComplete: handleDevCardPlayResolveComplete,
          themeId
        });

        return (event) => runner(event);
      }
    };
  }, [
    width,
    height,
    boardLayoutReservedHeight,
    bgioProps.G,
    effectiveColorByPlayerId,
    handleResourceDistributionComplete,
    handleDevCardPlayResolveComplete,
    freezeKnightDisplayFromPayload,
    leftMetaRailLayoutInset,
    playerID,
    startDevCardRevealFromEffect,
    themeId
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (matchID !== "dev-sandbox") return undefined;

    const handleDevSandboxDevCardPlay = (event) => {
      const detail = event?.detail ?? {};
      if (detail.action === "reset") {
        clearDevCardPlayActors();
        return;
      }
      const phase = detail.phase === "resolve" ? "resolve" : "start";
      effectsBus.emit({
        type: phase === "resolve" ? "devcard:play:resolve" : "devcard:play:start",
        payload: buildSandboxDevCardPlayPayload({
          playerId: detail.playerId,
          cardType: detail.cardType,
          phase,
          fallbackPlayerId: opponents[0]?.id,
          viewerPlayerId: playerID,
          playerViewMap,
          largestArmyOwnerId: core?.awards?.largestArmyOwnerId ?? null
        })
      });
    };
    const handleDevSandboxRobberMove = (event) => {
      const detail = event?.detail ?? {};
      effectsBus.emit({
        type: "robber:move",
        payload: buildSandboxRobberMovePayload({
          detail,
          fallbackActorId: opponents[0]?.id,
          viewerPlayerId: playerID
        })
      });
    };
    const handleDevSandboxAwardClaim = (event) => {
      const detail = event?.detail ?? {};
      effectsBus.emit({
        type: "award:claim",
        payload: buildSandboxAwardClaimPayload({
          detail,
          effectiveColorByPlayerId
        })
      });
    };

    window.addEventListener(
      "catana:dev-sandbox:devcard-play",
      handleDevSandboxDevCardPlay
    );
    window.addEventListener(
      "catana:dev-sandbox:robber-move",
      handleDevSandboxRobberMove
    );
    window.addEventListener(
      "catana:dev-sandbox:award-claim",
      handleDevSandboxAwardClaim
    );
    return () => {
      window.removeEventListener(
        "catana:dev-sandbox:devcard-play",
        handleDevSandboxDevCardPlay
      );
      window.removeEventListener(
        "catana:dev-sandbox:robber-move",
        handleDevSandboxRobberMove
      );
      window.removeEventListener(
        "catana:dev-sandbox:award-claim",
        handleDevSandboxAwardClaim
      );
    };
  }, [
    clearDevCardPlayActors,
    core?.awards?.largestArmyOwnerId,
    effectsBus,
    effectiveColorByPlayerId,
    matchID,
    opponents,
    playerID,
    playerViewMap
  ]);
  // console.log('p', player)
  // console.log('opps', opponents)
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);
  const handleBoardTransformed = useCallback((_ref, state) => {
    const nextScale =
      Number.isFinite(state?.scale) && state.scale > 0 ? state.scale : 1;

    setBoardViewportScale((currentScale) =>
      Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale
    );
  }, []);
  const friendlyRobberRule = ruleset.friendlyRobber?.enabled
    ? `On up to ${ruleset.friendlyRobber.vpThreshold ?? 2} VP`
    : "Off";
  const gameRulesRows = [
    ["Ruleset", bgioProps.G?.rulesetId ?? "Custom"],
    ["Victory target", `${ruleset.victoryPointsToWin ?? 10} VP`],
    ["Discard limit", `${ruleset.discardLimit ?? 7} cards`],
    ["Bank trade", `${ruleset.tradeRates?.bank ?? 4}:1`],
    ["Ports", `${ruleset.tradeRates?.genericPort ?? 3}:1 / ${ruleset.tradeRates?.specificPort ?? 2}:1`],
    ["Friendly robber", friendlyRobberRule],
    ["Development cards", ruleset.devCardsEnabled === false ? "Off" : "On"],
  ];
  return (
    <div
      className="catana-game-screen select-none"
      style={{
        background: CATANA_TABLE_BACKGROUND,
        width: "100vw", // Use viewport width to take the full screen width
        height: "100vh", // Use viewport height to take the full screen height
        overflow: "hidden", // Prevent scrollbars on the page
        position: "fixed", // Fix the object in place
        top: 0,
        left: 0,
        pointerEvents: mobileMetaPanel ? "auto" : undefined,
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
          <MemoizedCatanBoard
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
            boardLayoutLeftInset={leftMetaRailLayoutInset}
            boardLayoutReservedHeight={boardLayoutReservedHeight}
            themeId={themeId}
            {...bgioProps}
          />
        </TransformComponent>
      </TransformWrapper>

      <DevCardPurchaseReveal
        reveal={activeDevCardReveal}
        onComplete={handleDevCardRevealComplete}
      />

      <TooltipProvider delay={0}>
        <div
          className="fixed left-3 top-3 z-40 hidden sm:flex items-center gap-1.5 sm:left-4 sm:top-4 sm:gap-2"
          data-game-utility-cluster="true"
          data-allow-interaction="true"
        >
          <Tooltip label={isMuted ? "Unmute audio" : "Mute audio"}>
            <IconButton
              variant="secondary"
              size="md"
              onClick={handleToggleMute}
              className={topUtilityButtonClassName}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              data-allow-interaction="true"
            >
              {isMuted ? (
                <SpeakerXMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              ) : (
                <SpeakerWaveIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip label="Game settings">
            <IconButton
              variant="secondary"
              size="md"
              onClick={() => setShowGameSettings(true)}
              className={`hidden sm:inline-flex ${topUtilityButtonClassName}`}
              aria-label="Open game settings"
              data-allow-interaction="true"
            >
              <Cog6ToothIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </IconButton>
          </Tooltip>
          <Tooltip label="Game rules">
            <IconButton
              variant="secondary"
              size="md"
              onClick={() => setShowGameRules(true)}
              className={`hidden sm:inline-flex ${topUtilityButtonClassName}`}
              aria-label="Open game rules"
              data-allow-interaction="true"
            >
              <QuestionMarkCircleIcon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </IconButton>
          </Tooltip>
        </div>
      </TooltipProvider>

      {!showResultsButton ? (
        <div
          className="fixed right-3 top-3 z-40 sm:hidden"
          data-allow-interaction="true"
        >
          <MobileMatchMenu
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onOpenGameRules={() => setShowGameRules(true)}
            onOpenGameSettings={() => setShowGameSettings(true)}
            canResign={!isReplay && !isGameOver && !!player}
            onResign={handleResign}
          />
        </div>
      ) : null}

      {!isReplay && !isGameOver && !!player && !isPhoneLayout && (
        <div className="fixed right-3 top-3 z-40 hidden sm:block sm:right-4 sm:top-4" data-allow-interaction="true">
          <GlassPillButton
            onClick={handleResign}
            aria-label="Resign match"
            data-allow-interaction="true"
          >
            <span>Resign</span>
          </GlassPillButton>
        </div>
      )}

      {showResultsButton && (
        <div className="fixed right-4 top-4 z-40" data-allow-interaction="true">
          <GlassPillButton
            onClick={() => setShowGameOverModal(true)}
            aria-label="Open game results"
            data-allow-interaction="true"
          >
            <span aria-hidden="true">🏆</span>
            <span>Results</span>
          </GlassPillButton>
        </div>
      )}

      <LeftMetaRail
        entries={visibleLogEntries}
        logPlayerMap={logPlayerMap}
        themeId={themeId}
        playerID={playerID}
        bgioProps={bgioProps}
        mobileActivePanel={mobileMetaPanel}
        onMobileActivePanelChange={setMobileMetaPanel}
      />

      <Dialog
        open={showGameSettings}
        onOpenChange={setShowGameSettings}
        title="Game settings"
        description="Local controls for this match."
        maxWidthClassName="max-w-sm"
        actions={
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowGameSettings(false)}
            data-allow-interaction="true"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <div className="rounded-[1rem] border border-white/55 bg-white/36 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-900">Audio</span>
              <span className="font-semibold text-slate-700">
                {isMuted ? "Muted" : "On"}
              </span>
            </div>
            <Button
              variant={isMuted ? "primary" : "secondary"}
              size="sm"
              className="mt-3 w-full"
              onClick={handleToggleMute}
              data-allow-interaction="true"
            >
              {isMuted ? "Unmute audio" : "Mute audio"}
            </Button>
          </div>
          <div className="rounded-[1rem] border border-white/55 bg-white/36 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-900">Theme</span>
              <span className="font-semibold capitalize text-slate-700">
                {themeId}
              </span>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={showGameRules}
        onOpenChange={setShowGameRules}
        title="Game rules"
        description="Current match configuration."
        maxWidthClassName="max-w-md"
        actions={
          <Button
            variant="secondary"
            type="button"
            onClick={() => setShowGameRules(false)}
            data-allow-interaction="true"
          >
            Close
          </Button>
        }
      >
        <dl className="grid gap-2 text-sm">
          {gameRulesRows.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/55 bg-white/36 px-4 py-3"
            >
              <dt className="font-semibold text-slate-900">{label}</dt>
              <dd className="text-right font-semibold text-slate-700">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Dialog>

      {!isReplay && (
        <GameEffects
          effectsBus={effectsBus}
          boardRef={boardRef}
          effects={effects}
          currentPlayerId={bgioProps.ctx?.currentPlayer}
          playerID={playerID}
          phase={bgioProps.ctx?.phase}
          gameOverState={gameOverState}
          isWinner={isWinner}
        />
      )}

      {/* our cards and action dock 
TODO: accurately colour it
*/}
      {!!player &&
        (isPhoneLayout ? (
          <MobilePlayerCockpit
            setPlayerAction={setPlayerAction}
            buildPickup={buildPickup}
            setBuildPickup={setBuildPickup}
            effectsBus={effectsBus}
            bgioProps={bgioProps}
            player={displayPlayer}
            presence={disconnectStateByPlayerId[player.id] ?? idleStateByPlayerId[player.id] ?? null}
            onDevCardPurchaseStart={handleDevCardPurchaseStart}
            devCardDisplayRef={devCardDisplayRef}
            displayDevCards={displayPlayer?.devCards ?? null}
            keepDevCardShellMounted={Boolean(revealInFlight || localDevCardPlayInFlight)}
            vpDisplayOverride={frozenVpSnapshot}
            knightDisplayOverride={
              player?.id != null
                ? knightDisplayOverrideByPlayerId[String(player.id)] ?? null
                : null
            }
            onTradeClick={handleTradeOpen}
            isActive={!isGameOver && gameStatus.activePlayerId === player.id}
            statusType={gameStatus.statusType}
            gameStatus={gameStatus}
            activePlayerName={activePlayerName}
            canRoll={canRoll}
            canEnd={canEnd}
            timerMs={visibleTimerMs}
            themeId={themeId}
            activeMobileMetaPanel={mobileMetaPanel}
            onMobileMetaPanelOpen={setMobileMetaPanel}
            showTurnControls={!isReplay && !isGameOver}
            diceRoll={mobileCommandDiceRoll}
          />
        ) : (
          <PlayerActionContainer
            effectsBus={effectsBus}
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
            keepDevCardShellMounted={Boolean(revealInFlight || localDevCardPlayInFlight)}
            vpDisplayOverride={frozenVpSnapshot}
            knightDisplayOverride={
              player?.id != null
                ? knightDisplayOverrideByPlayerId[String(player.id)] ?? null
                : null
            }
            onTradeClick={handleTradeOpen}
            isActive={!isGameOver && gameStatus.activePlayerId === player.id}
            statusType={gameStatus.statusType}
            gameStatus={gameStatus}
            canRoll={canRoll}
            canEnd={canEnd}
            timerMs={visibleTimerMs}
            themeId={themeId}
            layoutOffsetX={playfieldCenterOffsetX}
            showTurnControls={!isReplay && !isGameOver}
          />
        ))}

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

      {!isReplay ? (
        <ResignConfirmDialog
          open={showResignConfirm}
          onOpenChange={setShowResignConfirm}
          onConfirm={handleConfirmResign}
        />
      ) : null}

      {(displayedOpponents.length > 0 || showConnectionBanner) && (
        <div
          className={
            isPhoneLayout
              ? "pointer-events-none fixed inset-x-0 top-11 z-30 flex flex-col items-center gap-2 px-14"
              : "pointer-events-none fixed inset-x-0 top-10 z-30 flex flex-col items-center gap-3 px-4"
          }
          style={{
            transform: playfieldCenterOffsetX
              ? `translateX(${Math.round(playfieldCenterOffsetX)}px)`
              : undefined,
          }}
        >
          {displayedOpponents.length > 0 && (
            <div className="pointer-events-auto flex items-start gap-4">
              {displayedOpponents.map((opponent) => (
                <OpponentPlayerBox
                  key={opponent.id}
                  player={opponent}
                  presence={disconnectStateByPlayerId[opponent.id] ?? idleStateByPlayerId[opponent.id] ?? null}
                  core={bgioProps.G.core}
                  coreTopology={bgioProps.G.coreTopology}
                  isActive={!isGameOver && gameStatus.activePlayerId === opponent.id}
                  statusType={gameStatus.statusType}
                  compact={isPhoneLayout}
                  knightDisplayOverride={
                    knightDisplayOverrideByPlayerId[String(opponent.id)] ?? null
                  }
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
              window.location.href = "/";
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
