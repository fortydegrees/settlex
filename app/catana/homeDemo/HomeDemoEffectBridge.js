"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { EffectsBoardWrapper } from "bgio-effects/react";
import { GameEffects } from "../effects/GameEffects";
import { createPiecePlacementRunner } from "../effects/placePiece";
import {
  PLACE_PIECE_DEFAULT_TUNING,
  getPlacementEffectDuration
} from "../effects/placePieceDefaults";
import { DEFAULT_THEME_ID } from "../theme/themes";
import { getBoardLayout } from "../utils/boardLayout";
import useWindowSize from "../utils/useWindowSize";
import { HOME_DEMO_BOARD_PRESET } from "./homeDemoPreset";
import {
  HOME_DEMO_CONFIG,
  HOME_DEMO_EVENTS,
  HOME_DEMO_PLAYER_COLORS,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoReducedMotionPieceState,
  sampleHomeDemoDelay
} from "./homeDemoSequence";

const placementDurationMs = Math.ceil(
  getPlacementEffectDuration(PLACE_PIECE_DEFAULT_TUNING) * 1000
);
const GameEffectsWithProvider = EffectsBoardWrapper(GameEffects);
const HOME_DEMO_EFFECT_PROVIDER_STATE = Object.freeze({
  effects: Object.freeze({
    data: Object.freeze({
      id: "home-demo-effects",
      queue: Object.freeze([]),
      duration: 0
    })
  })
});

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return reducedMotion;
}

function getPayloadForEvent(event) {
  return {
    pieceType:
      event.type === "place-road"
        ? "road"
        : event.type === "place-city"
          ? "city"
          : "settlement",
    id: "edgeId" in event.target ? event.target.edgeId : event.target.nodeId,
    playerId: event.playerId
  };
}

export function HomeDemoEffectBridge({
  effectsBus,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  reservedHeight,
  onPieceStateChange,
  themeId = DEFAULT_THEME_ID
}) {
  const { width, height } = useWindowSize();
  const reducedMotion = useReducedMotion();
  const [isMounted, setIsMounted] = useState(false);
  const cycleIndexRef = useRef(0);

  const effects = useMemo(
    () => ({
      piecePlacement: ({ emitCue }) => {
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
              reservedUiHeight: reservedHeight
            });
          },
          getTiles: () => HOME_DEMO_BOARD_PRESET.tiles,
          getPlayerColor: (playerId) =>
            HOME_DEMO_PLAYER_COLORS[playerId] ?? "red",
          getViewerPlayerId: () => "home-blue",
          emitCue,
          useBoardSpace: true,
          themeId
        });
        return (event) => runner(event?.payload);
      }
    }),
    [height, placementLayerRef, placementRoadLayerRef, reservedHeight, themeId, width]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      onPieceStateChange(getHomeDemoReducedMotionPieceState());
      return undefined;
    }
    if (!effectsBus) return undefined;

    let cancelled = false;
    const timers = [];

    const queueTimeout = (fn, delayMs) => {
      const timerId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delayMs);
      timers.push(timerId);
    };

    const runCycle = () => {
      let elapsed = 0;
      const cycleIndex = cycleIndexRef.current;
      cycleIndexRef.current += 1;
      onPieceStateChange(createHomeDemoPieceState());

      HOME_DEMO_EVENTS.forEach((event) => {
        elapsed += sampleHomeDemoDelay(event.delayMs);
        queueTimeout(() => {
          effectsBus.emit({
            type: "build:place",
            effectId: `home-demo:${cycleIndex}:${event.id}`,
            payload: getPayloadForEvent(event)
          });
        }, elapsed);

        queueTimeout(() => {
          onPieceStateChange((current) => applyHomeDemoEvent(current, event));
        }, elapsed + Math.max(0, placementDurationMs - HOME_DEMO_CONFIG.commitLeadMs));
      });

      queueTimeout(
        runCycle,
        elapsed + placementDurationMs + HOME_DEMO_CONFIG.resetHoldMs
      );
    };

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [effectsBus, onPieceStateChange, reducedMotion]);

  if (!isMounted) return null;

  return (
    <GameEffectsWithProvider
      plugins={HOME_DEMO_EFFECT_PROVIDER_STATE}
      effectsBus={effectsBus}
      boardRef={boardRef}
      effects={effects}
      currentPlayerId={null}
      playerID="home-blue"
      phase={null}
    />
  );
}
