import React, { useEffect, useMemo, useRef } from "react";
import { useEffectListener } from "bgio-effects/react";
import { createEffectBus } from "./EffectBus";
import { createAudioManager } from "./AudioManager";
import { createHapticManager } from "./HapticManager";
import { registerEffects } from "./registry";
import { EffectLayer } from "./EffectLayer";
import { DEFAULT_TURN_START_STATE, getTurnStartCueDecision } from "./turnStartCue";
import { buildDiceRollTimeline } from "./diceRollTimeline";
import { playGameStartTransition } from "./gameStartTransition.js";

export function GameEffects({
  effects = {},
  effectsBus: providedBus = null,
  boardRef,
  currentPlayerId,
  playerID,
  phase,
  gameOverState,
  isWinner,
  audioSettings,
  gameStartMatchID = null,
  preloadSounds = false
}) {
  const localBus = useMemo(() => createEffectBus(), []);
  const bus = providedBus ?? localBus;
  const layerRef = useRef(null);
  const audio = useMemo(
    () => createAudioManager({ bus, settings: audioSettings }),
    [audioSettings, bus]
  );
  const haptics = useMemo(() => createHapticManager({ bus }), [bus]);
  const turnStartRef = useRef({ ...DEFAULT_TURN_START_STATE });
  const gameOverCueRef = useRef(false);
  const gameStartCueRef = useRef(false);

  const context = useMemo(
    () => ({
      bus,
      boardRef,
      layerRef,
      emitCue: (name) => bus.emit({ type: "cue", payload: { name } })
    }),
    [bus, boardRef]
  );

  const handlers = useMemo(() => {
    const resolved = {};
    Object.entries(effects).forEach(([key, value]) => {
      resolved[key] = typeof value === "function" ? value(context) : value;
    });
    return resolved;
  }, [effects, context]);

  useEffect(() => {
    const cleanup = registerEffects({ bus, effects: handlers });
    return () => cleanup();
  }, [bus, handlers]);

  useEffect(() => {
    if (gameStartCueRef.current || !gameStartMatchID) return;
    gameStartCueRef.current = playGameStartTransition({
      matchID: gameStartMatchID,
      audio,
      bus,
    });
  }, [audio, bus, gameStartMatchID]);

  useEffect(() => {
    const unlock = () => {
      audio.unlock();
      haptics.unlock();
    };
    const unlockOptions = { once: true, capture: true };
    window.addEventListener("pointerdown", unlock, unlockOptions);
    return () => window.removeEventListener("pointerdown", unlock, unlockOptions);
  }, [audio, haptics]);

  useEffect(() => {
    return () => haptics.destroy();
  }, [haptics]);

  useEffect(() => {
    return () => audio.destroy();
  }, [audio]);

  useEffect(() => {
    if (!preloadSounds) return undefined;

    const preload = () => audio.preload();
    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(preload, {
        timeout: 2000
      });
      return () => window.cancelIdleCallback?.(idleCallbackId);
    }

    const timeoutId = window.setTimeout(preload, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [audio, preloadSounds]);

  useEffectListener(
    "distributeCardsFromTile",
    (payload) => {
      bus.emit({ type: "resource:distribution", payload });
      // The roll hit a paying number but the robber blocked the tile --
      // pairs with the board's blocked-tile flash.
      if (payload?.blockedTileIds?.length) {
        bus.emit({ type: "cue", payload: { name: "resource:blocked" } });
      }
    },
    [bus]
  );

  useEffectListener(
    "roll",
    (dice) => {
      const plan = audio.planCue("dice:roll");
      bus.emit({ type: "cue", payload: { name: "dice:roll", plan } });
      bus.emit({
        type: "dice:roll:timeline",
        payload: {
          dice,
          timeline: buildDiceRollTimeline({ plan })
        }
      });
    },
    [audio, bus]
  );

  useEffectListener(
    "placePiece",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "build:place",
        payload,
        effectId: `build:${payload.pieceType}:${payload.id}`
      });
    },
    [bus]
  );

  useEffectListener(
    "buyDevCardReveal",
    (payload) => {
      if (!payload) return;
      bus.emit({ type: "devcard:reveal", payload });
    },
    [bus]
  );

  useEffectListener(
    "robberSteal",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "resource:robber-steal",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
  );

  useEffectListener(
    "robberMove",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "robber:move",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
  );

  useEffectListener(
    "awardClaimed",
    (payload) => {
      if (!payload) return;
      // The visual runner highlights roads, so largest-army claims are
      // sound-only: they carry no meaningful road set.
      if (payload.awardType !== "largestArmy") {
        bus.emit({
          type: "award:claim",
          payload,
          effectId: payload.effectId
        });
      }
      if (
        payload.playerId != null &&
        String(payload.playerId) === String(playerID)
      ) {
        const cueName =
          payload.awardType === "largestArmy"
            ? "award:claim:army"
            : "award:claim:road";
        bus.emit({ type: "cue", payload: { name: cueName } });
      }
    },
    [bus, playerID]
  );

  useEffectListener(
    "maritimeTrade",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "resource:maritime-trade",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
  );

  useEffectListener(
    "discardResources",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "resource:discard",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
  );

  useEffectListener(
    "devCardPlayStarted",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "devcard:play:start",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
  );

  useEffectListener(
    "devCardPlayResolved",
    (payload) => {
      if (!payload) return;
      bus.emit({
        type: "devcard:play:resolve",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
  );

  useEffect(() => {
    const prev = turnStartRef.current;
    const decision = getTurnStartCueDecision({
      currentPlayerId,
      playerID,
      phase,
      prevState: prev
    });
    turnStartRef.current = decision.nextState;
    if (decision.play) {
      bus.emit({ type: "cue", payload: { name: "turn:start" } });
    }
    // turn:end mirrors turn:start at the hand-off: fires however the local
    // turn ended (button, shortcut, or timeout), never into game over.
    const handedOff =
      prev.initialized &&
      prev.phase !== "preGame" &&
      phase !== "preGame" &&
      prev.currentPlayerId != null &&
      String(prev.currentPlayerId) === String(playerID) &&
      currentPlayerId != null &&
      String(currentPlayerId) !== String(playerID) &&
      !gameOverState;
    if (handedOff) {
      bus.emit({ type: "cue", payload: { name: "turn:end" } });
    }
  }, [bus, currentPlayerId, gameOverState, playerID, phase]);

  useEffect(() => {
    const hasGameOver = Boolean(gameOverState);
    if (!hasGameOver) {
      gameOverCueRef.current = false;
      return;
    }
    if (gameOverCueRef.current) return;
    const cueName = isWinner ? "game:win" : "game:lose";
    bus.emit({ type: "cue", payload: { name: cueName } });
    gameOverCueRef.current = true;
  }, [bus, gameOverState, isWinner]);

  return <EffectLayer ref={layerRef} />;
}
