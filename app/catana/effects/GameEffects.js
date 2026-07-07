import React, { useEffect, useMemo, useRef } from "react";
import { useEffectListener } from "bgio-effects/react";
import { createEffectBus } from "./EffectBus";
import { createAudioManager } from "./AudioManager";
import { createHapticManager } from "./HapticManager";
import { registerEffects } from "./registry";
import { EffectLayer } from "./EffectLayer";
import { DEFAULT_TURN_START_STATE, getTurnStartCueDecision } from "./turnStartCue";
import { buildDiceRollTimeline } from "./diceRollTimeline";

export function GameEffects({
  effects = {},
  effectsBus: providedBus = null,
  boardRef,
  currentPlayerId,
  playerID,
  phase,
  gameOverState,
  isWinner,
  audioSettings
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

  useEffectListener(
    "distributeCardsFromTile",
    (payload) => {
      bus.emit({ type: "resource:distribution", payload });
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
      bus.emit({
        type: "award:claim",
        payload,
        effectId: payload.effectId
      });
    },
    [bus]
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
