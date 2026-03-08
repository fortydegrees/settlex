"use client";
import { CatanBoard } from "./Board";
import {
  TransformWrapper,
  TransformComponent,
} from "../../react-zoom-pan-pinch";
import React, { useState, useEffect, useRef, useMemo } from "react";

import { buildPlayerViewMap, UI_PLAYER_COLORS } from "./utils/playerView";
import { shouldCancelBuildAction } from "./utils/cancelBuildAction";
import { getGameStatus } from "./utils/gameStatus";
import { shouldResetPlayerAction } from "./utils/playerAction";
import { sanitizeDisplayName } from "./utils/playerIdentity";

import { EffectsBoardWrapper } from "bgio-effects/react";

import { PlayerActionContainer } from "./components/PlayerActionContainer";
import { OpponentPlayerBox } from "./components/OpponentPlayerBox";
import { GameLogPanel } from "./components/GameLogPanel";
import { GlassPillButton } from "./components/GlassPillButton";
import { TradeDiscardModal } from "./components/TradeDiscardModal";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { GameOverModal } from "./components/GameOverModal";
import { PostgameOverlay } from "./components/PostgameOverlay";
import { GameEffects } from "./effects/GameEffects";
import { createResourceDistributionRunner } from "./effects/resourceDistribution";
import { createPiecePlacementRunner } from "./effects/placePiece";
import useWindowSize from "./utils/useWindowSize";
import { getBoardLayout } from "./utils/boardLayout";
import { Howler } from "howler";
import { getVictoryPoints } from "@settlex/game-core";
import {
  CATANA_THEME_STORAGE_KEY,
  getThemeOptions,
  resolveThemeId,
} from "./theme/themes";

const AUDIO_MUTE_STORAGE_KEY = "catana:audioMuted";
const DEV_THEME_OPTIONS = getThemeOptions();

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

export function GameScreen(bgioProps) {
  //playerAction is things that appear to the user (not spectator)
  //e.g. placeRoad, placeSettle, placeCity, moveRobber, trading
  //but i think we want this controlled by server/gameState
    //e.g. if disconnect after placing one road of RB, reconnect will want to prompt to place second road
  const [playerAction, setPlayerAction] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradePresetResource, setTradePresetResource] = useState(null);
  const [timerSnapshot, setTimerSnapshot] = useState(null);
  const [timerSeeded, setTimerSeeded] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());
  const [readySent, setReadySent] = useState(false);
  const [isMuted, setIsMuted] = useState(readStoredMute);
  const [themeId, setThemeId] = useState(readStoredThemeId);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showPostgame, setShowPostgame] = useState(false);
  const gameOverSeenRef = useRef(false);
  const boardRef = useRef(null);
  const placementLayerRef = useRef(null);
  const placementRoadLayerRef = useRef(null);
  const { width, height } = useWindowSize();
  const moves = bgioProps.moves;

  //get the active playerID of who's watching
  //can be null for spectator?
  //TODO: handle null/spectator
  const playerID = bgioProps.playerID;
  const matchID = bgioProps.matchID ?? "default";

  const core = bgioProps.G.core;
  const coreTurn = core?.turn;
  const playerViewMap = useMemo(() => buildPlayerViewMap(core), [core]);
  const rawPlayer = playerViewMap[playerID];
  const gameOverState = bgioProps.ctx?.gameover ?? core?.gameOver;
  const isGameOver = Boolean(gameOverState);
  const rawGameStatus = getGameStatus(core, bgioProps.ctx, playerAction);
  const gameStatus = isGameOver
    ? { text: "Game Over", statusType: rawGameStatus.statusType, activePlayerId: null }
    : rawGameStatus;
  const devPlay = bgioProps.G.devCardPlay;
  const devPlayForMe = devPlay?.playerId === playerID;
  const devPlayMode =
    devPlay?.type === "yearOfPlenty"
      ? "dev-yop"
      : devPlay?.type === "monopoly"
      ? "dev-monopoly"
      : null;
  const { nameMap, emojiMap, colorMap } = useMemo(() => {
    const names = {};
    const emojis = {};
    const colors = {};
    const matchData = bgioProps.matchData;
    if (Array.isArray(matchData)) {
      matchData.forEach((player) => {
        if (player?.id == null) return;
        const cleanName = sanitizeDisplayName(player.name);
        names[player.id] = cleanName || `Player ${player.id}`;
        if (player.data?.emoji) emojis[player.id] = player.data.emoji;
        if (player.data?.color) colors[player.id] = player.data.color;
      });
    }
    return { nameMap: names, emojiMap: emojis, colorMap: colors };
  }, [bgioProps.matchData]);
  const player = rawPlayer
    ? { ...rawPlayer, name: nameMap[rawPlayer.id], emoji: emojiMap[rawPlayer.id], chosenColor: colorMap[rawPlayer.id] }
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

  const seatOrderKey = useMemo(
    () => (Array.isArray(core?.players) ? core.players.map(String).join("|") : ""),
    [core?.players]
  );
  const seatPlayerIds = useMemo(
    () => (seatOrderKey ? seatOrderKey.split("|") : []),
    [seatOrderKey]
  );
  const seatColorMap = useMemo(() => {
    const map = {};
    seatPlayerIds.forEach((id, index) => {
      map[id] = UI_PLAYER_COLORS[index % UI_PLAYER_COLORS.length] ?? UI_PLAYER_COLORS[0];
    });
    return map;
  }, [seatPlayerIds]);

  const logPlayerMap = useMemo(() => {
    const ids = new Set([
      ...Object.keys(seatColorMap ?? {}),
      ...Object.keys(nameMap ?? {}),
      ...Object.keys(emojiMap ?? {}),
      ...Object.keys(colorMap ?? {})
    ]);
    const map = {};
    ids.forEach((id) => {
      map[id] = {
        name: nameMap[id] ?? `Player ${id}`,
        emoji: emojiMap[id] ?? null,
        color: colorMap[id] ?? seatColorMap[id] ?? null
      };
    });
    return map;
  }, [seatColorMap, nameMap, emojiMap, colorMap]);

  const postgameSummary = useMemo(() => {
    if (!isGameOver) return [];
    return [
      { label: "Winner", value: winnerName },
      { label: "Reason", value: gameOverState?.reason ?? "Victory Points" },
      { label: "Final VP", value: winnerVP != null ? `${winnerVP}` : "—" }
    ];
  }, [isGameOver, winnerName, gameOverState?.reason, winnerVP]);
  const showResultsButton =
    isGameOver && !showGameOverModal && !showPostgame;

  useEffect(() => {
    if (!isGameOver) {
      gameOverSeenRef.current = false;
      setShowGameOverModal(false);
      setShowPostgame(false);
      return;
    }
    if (!gameOverSeenRef.current) {
      gameOverSeenRef.current = true;
      setShowGameOverModal(true);
      setShowPostgame(false);
      setPlayerAction(null);
      setShowTradeModal(false);
      setTradePresetResource(null);
    }
  }, [isGameOver]);

  useEffect(() => {
    setTimerSnapshot(null);
    setTimerSeeded(false);
    setReadySent(false);
  }, [matchID]);

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
    if (!matchID || typeof window === "undefined") return;
    if (bgioProps.timerSnapshot !== undefined || timerSeeded) return;
    let cancelled = false;

    const fetchSeed = async () => {
      try {
        const baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
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
    if (readySent) return;
    if (!playerID || typeof moves?.readyUp !== "function") return;
    if (bgioProps.ctx?.phase !== "preGame") return;
    moves.readyUp();
    setReadySent(true);
  }, [readySent, playerID, moves, bgioProps.ctx?.phase]);

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

  useEffect(() => {
    if (!timerSnapshot || hideTimer) return;
    const interval = setInterval(() => setNowMs(Date.now()), 250);
    return () => clearInterval(interval);
  }, [timerSnapshot, hideTimer]);

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
        corePhase: core?.phase,
        isGameOver
      })
    ) {
      setPlayerAction(null);
    }
  }, [
    playerAction,
    playerID,
    bgioProps.ctx,
    core?.phase,
    isGameOver
  ]);

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
    showTradeModal ||
    needsToDiscard ||
    (devPlayForMe && devPlayMode) ||
    showGameOverModal ||
    showPostgame;

  //TODO: this will return multiple for non 1v1 games. handle in UI appropriately
  //const opponentID = bgioProps.G.players.map(p=>(p.id !== playerID) ? p.id : null).filter(p=>p!== null)[0]
  const opponents = Object.values(playerViewMap)
    .filter((view) => view.id !== playerID)
    .map((view) => ({
      ...view,
      name: nameMap[view.id],
      emoji: emojiMap[view.id],
      chosenColor: colorMap[view.id],
    }));

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
        moves.endTurn();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRoll, canEnd, hasModalOpen, isGameOver, moves]);

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
          getPlayerColor: (playerId) => playerViewMap[playerId]?.color,
          emitCue,
          useBoardSpace: true,
          themeId
        });

        return (event) => runner(event?.payload);
      }
    };
  }, [width, height, bgioProps.G, playerViewMap, themeId]);
  const showDevThemeSwitcher = process.env.NODE_ENV !== "production";

  // console.log('p', player)
  // console.log('opps', opponents)
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
  };
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
        doubleClick={{ mode: "toggle" }}
      >
        <TransformComponent>
          <CatanBoard
            boardRef={boardRef}
            placementLayerRef={placementLayerRef}
            placementRoadLayerRef={placementRoadLayerRef}
            playerAction={playerAction}
            setPlayerAction={setPlayerAction}
            themeId={themeId}
            {...bgioProps}
          />
        </TransformComponent>
      </TransformWrapper>

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

      {showDevThemeSwitcher && (
        <label
          className="fixed left-16 top-4 z-40 flex h-10 items-center gap-2 rounded-full bg-white/65 px-3 text-slate-700 shadow-lg ring-1 ring-white/50 backdrop-blur-sm"
          data-allow-interaction="true"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-700">
            Theme
          </span>
          <select
            value={themeId}
            onChange={(event) => setThemeId(resolveThemeId(event.target.value))}
            className="rounded-md border border-white/60 bg-white/80 px-2 py-1 text-sm text-slate-800"
            data-allow-interaction="true"
            aria-label="Theme"
          >
            {DEV_THEME_OPTIONS.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </select>
        </label>
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

      <GameLogPanel
        entries={bgioProps.G?.gameLog ?? []}
        playerMap={logPlayerMap}
        themeId={themeId}
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
          bgioProps={bgioProps}
          //playerID={bgioProps.playerID} //for multiplayer
          player={player} //for testing/dev
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
      {!!player && showTradeModal && !needsToDiscard && !isGameOver && (
        <TradeDiscardModal
          mode="trade"
          player={player}
          onConfirm={handleTradeConfirm}
          onCancel={() => {
            setShowTradeModal(false);
            setTradePresetResource(null);
          }}
          G={bgioProps.G}
          tradePresetResource={tradePresetResource}
          themeId={themeId}
        />
      )}

      {!!player && devPlayForMe && devPlayMode && !needsToDiscard && !isGameOver && (
        <TradeDiscardModal
          mode={devPlayMode}
          player={player}
          onConfirm={handleDevPlayConfirm}
          onCancel={handleDevPlayCancel}
          G={bgioProps.G}
          themeId={themeId}
        />
      )}

      {opponents.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 top-6 flex items-center gap-4">
          {opponents.map((opponent) => (
            <OpponentPlayerBox
              key={opponent.id}
              player={opponent}
              core={bgioProps.G.core}
              coreTopology={bgioProps.G.coreTopology}
              isActive={!isGameOver && gameStatus.activePlayerId === opponent.id}
              statusType={gameStatus.statusType}
            />
          ))}
        </div>
      )}

      {showGameOverModal && (
        <GameOverOverlay>
          <GameOverModal
            title={isWinner ? "You win!" : `${winnerName} wins!`}
            subtitle={
              winnerVP != null ? `Victory Points: ${winnerVP}` : "Final score locked."
            }
            scoreboard={scoreboard}
            isWinner={isWinner}
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
