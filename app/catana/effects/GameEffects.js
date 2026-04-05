import React, { useEffect, useMemo, useRef } from "react";
import { useEffectListener } from "bgio-effects/react";
import { createEffectBus } from "./EffectBus";
import { createAudioManager } from "./AudioManager";
import { registerEffects } from "./registry";
import { EffectLayer } from "./EffectLayer";
import { DEFAULT_TURN_START_STATE, getTurnStartCueDecision } from "./turnStartCue";

export function GameEffects({
  effects = {},
  boardRef,
  currentPlayerId,
  playerID,
  phase,
  gameOverState,
  isWinner
}) {
  const bus = useMemo(() => createEffectBus(), []);
  const layerRef = useRef(null);
  const audio = useMemo(() => createAudioManager({ bus }), [bus]);
  const turnStartRef = useRef({ ...DEFAULT_TURN_START_STATE });
  const gameOverCueRef = useRef(false);

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
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [audio]);

  useEffectListener(
    "distributeCardsFromTile",
    (payload) => {
      bus.emit({ type: "resource:distribution", payload });
    },
    [bus]
  );

  useEffectListener(
    "roll",
    () => {
      bus.emit({ type: "cue", payload: { name: "dice:roll" } });
    },
    [bus]
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

  useEffect(() => {
    const decision = getTurnStartCueDecision({
      currentPlayerId,
      playerID,
      phase,
      prevState: turnStartRef.current
    });
    turnStartRef.current = decision.nextState;
    if (decision.play) {
      bus.emit({ type: "cue", payload: { name: "turn:start" } });
    }
  }, [bus, currentPlayerId, playerID, phase]);

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
