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
  HOME_DEMO_SCENES,
  HOME_DEMO_PLAYER_COLORS,
  applyHomeDemoEvent,
  createHomeDemoPieceState,
  getHomeDemoReducedMotionPieceState,
  getHomeDemoSceneEvents,
  getHomeDemoSceneSetupEvents
} from "./homeDemoSequence";

const HOME_DEMO_PLACE_PIECE_TUNING = Object.freeze({
  ...PLACE_PIECE_DEFAULT_TUNING,
  dropDistance: 1.1,
  dropDuration: 0.62,
  settleDuration: 0.16,
  postHoldDuration: 0.05,
  dustDuration: 0.24,
  shadowFadeOutDuration: 0.08,
  easeDrop: "power2.in",
  easeSettle: "back.out(1.45)",
  easeSettleRoad: "back.out(1.35)"
});
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

function getHomeDemoPlacementTuning(event) {
  return event?.setupPhase ? HOME_DEMO_PLACE_PIECE_TUNING : null;
}

function getHomeDemoPlacementStartFrom(event) {
  return event?.startFrom ?? null;
}

function getHomeDemoPlacementDurationMs(event) {
  return Math.ceil(
    getPlacementEffectDuration(
      getHomeDemoPlacementTuning(event) ?? PLACE_PIECE_DEFAULT_TUNING
    ) * 1000
  );
}

function getPayloadForEvent(event) {
  const tuning = getHomeDemoPlacementTuning(event);
  const startFrom = getHomeDemoPlacementStartFrom(event);
  return {
    pieceType:
      event.type === "place-road"
        ? "road"
        : event.type === "place-city"
          ? "city"
          : "settlement",
    id: "edgeId" in event.target ? event.target.edgeId : event.target.nodeId,
    playerId: event.playerId,
    ...(tuning ? { tuning } : {}),
    ...(startFrom ? { startFrom } : {})
  };
}

function getHomeDemoSetupDurationMs(setupEvents) {
  if (!setupEvents.length) return 0;
  const setupEndMs = setupEvents.reduce(
    (latestEndMs, event) =>
      Math.max(latestEndMs, event.atMs + getHomeDemoPlacementDurationMs(event)),
    0
  );
  return setupEndMs + HOME_DEMO_CONFIG.sceneSetupHoldMs;
}

function getHomeDemoTailPlacementDurationMs(events) {
  return events.reduce(
    (maxDurationMs, event) =>
      Math.max(maxDurationMs, getHomeDemoPlacementDurationMs(event)),
    0
  );
}

export function HomeDemoEffectBridge({
  effectsBus,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  reservedHeight,
  centerYOffset = 0,
  onPieceStateChange,
  themeId = DEFAULT_THEME_ID,
  audioSettings
}) {
  const { width, height, isMeasured } = useWindowSize();
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
            if (!isMeasured || !width || !height) return null;
            const layout = getBoardLayout({
              width,
              height,
              reservedUiHeight: reservedHeight
            });
            return {
              ...layout,
              center: [layout.center[0], layout.center[1] + centerYOffset]
            };
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
    [
      centerYOffset,
      height,
      isMeasured,
      placementLayerRef,
      placementRoadLayerRef,
      reservedHeight,
      themeId,
      width
    ]
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      onPieceStateChange(getHomeDemoReducedMotionPieceState());
      return undefined;
    }
    if (!effectsBus || !isMeasured) return undefined;

    let cancelled = false;
    const timers = [];

    const queueTimeout = (fn, delayMs) => {
      const timerId = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delayMs);
      timers.push(timerId);
    };

    const runCycle = () => {
      const cycleIndex = cycleIndexRef.current;
      const scene = HOME_DEMO_SCENES[cycleIndex % HOME_DEMO_SCENES.length];
      const setupEvents = getHomeDemoSceneSetupEvents(scene);
      const events = getHomeDemoSceneEvents(scene, { cycleIndex });
      const setupDurationMs = getHomeDemoSetupDurationMs(setupEvents);
      const tailPlacementDurationMs = getHomeDemoTailPlacementDurationMs(events);
      cycleIndexRef.current += 1;
      onPieceStateChange(createHomeDemoPieceState());

      const queuePlacementEvent = (event, atMs) => {
        const placementDurationMs = getHomeDemoPlacementDurationMs(event);
        queueTimeout(() => {
          effectsBus.emit({
            type: "build:place",
            effectId: `home-demo:${scene.id}:${cycleIndex}:${event.id}`,
            payload: getPayloadForEvent(event)
          });
        }, atMs);

        queueTimeout(() => {
          onPieceStateChange((current) => applyHomeDemoEvent(current, event));
        }, atMs + Math.max(0, placementDurationMs - HOME_DEMO_CONFIG.commitLeadMs));
      };

      setupEvents.forEach((event) => {
        queuePlacementEvent(event, event.atMs);
      });

      events.forEach((event) => {
        queuePlacementEvent(event, setupDurationMs + event.atMs);
      });

      queueTimeout(
        runCycle,
        setupDurationMs +
          scene.durationMs +
          tailPlacementDurationMs +
          HOME_DEMO_CONFIG.resetHoldMs
      );
    };

    runCycle();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [effectsBus, isMeasured, onPieceStateChange, reducedMotion]);

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
      audioSettings={audioSettings}
    />
  );
}
