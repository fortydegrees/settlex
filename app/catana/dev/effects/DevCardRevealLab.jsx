"use client";

import React, { useRef, useState } from "react";
import { Dock } from "../../components/ActionsDock/Dock";
import { DockCard } from "../../components/ActionsDock/DockCard";
import { DevCardDisplay } from "../../components/DevCardDisplay";
import { DevCardPurchaseReveal } from "../../DevCardPurchaseReveal";

const DEFAULT_CARD_TYPE = "victoryPoint";
const DEFAULT_PRELAUNCH_DELAY_MS = 320;
const DEV_CARD_ICON_SVG = "/svgs/icon_devcard.svg";
const DEV_CARD_EMBLEM_SVG = "/svgs/icon_devcard_emblem.svg";

const CARD_TYPE_OPTIONS = [
  { id: "knight", label: "Knight" },
  { id: "victoryPoint", label: "Victory Point" },
  { id: "roadBuilding", label: "Road Building" },
  { id: "yearOfPlenty", label: "Year of Plenty" },
  { id: "monopoly", label: "Monopoly" }
];

const EMPTY_LANDED_CARDS = Object.freeze({
  midpoint: [],
  threeD: []
});

const EMPTY_REVEALS = Object.freeze({
  midpoint: null,
  threeD: null
});

function getRectSnapshot(rect) {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom
  };
}

function getCenterPoint(ref) {
  const rect = ref.current?.getBoundingClientRect?.() ?? null;
  if (!rect) return undefined;

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function RevealComparisonLane({
  title,
  description,
  flipVariant,
  dockCardRef,
  destinationRef,
  apexRef,
  activeReveal,
  landedCards,
  onStartReveal,
  onComplete
}) {
  return (
    <section className="relative min-h-[560px] overflow-hidden rounded-lg border border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.24),_rgba(37,99,235,0.14)_42%,_rgba(15,23,42,0.82)_100%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.16),_rgba(255,255,255,0)_72%)]" />

      <div className="absolute left-4 top-4 z-10">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">
          {title}
        </div>
        <div className="mt-1 max-w-[16rem] text-sm font-medium text-slate-200/85">
          {description}
        </div>
      </div>

      <div
        ref={apexRef}
        className="absolute left-1/2 top-[22%] h-20 w-20 -translate-x-1/2 rounded-full border border-dashed border-white/30 bg-white/5"
      />

      <div className="pointer-events-none absolute left-1/2 top-[22%] -translate-x-1/2 translate-y-24 text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
        Reveal Apex
      </div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-end gap-4">
        <div className="rounded-lg bg-blue-200/45 p-4 shadow-xl ring-1 ring-white/30 backdrop-blur-sm">
          <Dock>
            <div ref={dockCardRef}>
              <DockCard
                action={{
                  name: "devCard",
                  enabled: true,
                  count: 0,
                  img: DEV_CARD_ICON_SVG,
                  fallbackImg: DEV_CARD_ICON_SVG,
                  preLaunchImg: DEV_CARD_EMBLEM_SVG,
                  preLaunchFallbackImg: DEV_CARD_EMBLEM_SVG,
                  preLaunchDelayMs: DEFAULT_PRELAUNCH_DELAY_MS,
                  action: onStartReveal
                }}
              />
            </div>
          </Dock>
        </div>

        <div className="pointer-events-none mb-[-2px]">
          <DevCardDisplay
            cards={landedCards}
            containerRef={destinationRef}
            forceMount
          />
        </div>
      </div>

      <DevCardPurchaseReveal
        flipVariant={flipVariant}
        reveal={activeReveal}
        onComplete={onComplete}
      />
    </section>
  );
}

export function DevCardRevealLab() {
  const midpointDockCardRef = useRef(null);
  const midpointDestinationRef = useRef(null);
  const midpointApexRef = useRef(null);
  const threeDDockCardRef = useRef(null);
  const threeDDestinationRef = useRef(null);
  const threeDApexRef = useRef(null);
  const revealRunIdRef = useRef(0);
  const [selectedCardType, setSelectedCardType] = useState(DEFAULT_CARD_TYPE);
  const [activeReveals, setActiveReveals] = useState(EMPTY_REVEALS);
  const [landedCardsByLane, setLandedCardsByLane] = useState(EMPTY_LANDED_CARDS);

  const startReveal =
    ({ laneId, destinationRef, apexRef }) =>
    ({ triggerRect, preLaunchDelayMs = 0 } = {}) => {
      const destinationRect =
        destinationRef.current?.getBoundingClientRect?.() ?? null;
      if (!triggerRect || !destinationRect) return;

      revealRunIdRef.current += 1;
      setLandedCardsByLane((current) => ({
        ...current,
        [laneId]: []
      }));
      setActiveReveals((current) => ({
        ...current,
        [laneId]: {
          id: `${laneId}-${revealRunIdRef.current}`,
          playerId: "0",
          cardType: selectedCardType,
          beforeCards: [],
          vpSnapshot: {
            publicPoints: 0,
            totalPoints: selectedCardType === "victoryPoint" ? 1 : 0
          },
          triggerRect,
          destinationRect: getRectSnapshot(destinationRect),
          centerPoint: getCenterPoint(apexRef),
          launchDelayMs: preLaunchDelayMs
        }
      }));
    };

  const clearLanes = () => {
    setLandedCardsByLane(EMPTY_LANDED_CARDS);
    setActiveReveals(EMPTY_REVEALS);
  };

  const replayBoth = () => {
    clearLanes();
    midpointDockCardRef.current?.querySelector("button")?.click();
    threeDDockCardRef.current?.querySelector("button")?.click();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
        <label className="flex flex-col text-xs uppercase tracking-wide text-slate-400">
          Card Type
          <select
            className="mt-1 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            value={selectedCardType}
            onChange={(event) => {
              setSelectedCardType(event.target.value);
              clearLanes();
            }}
          >
            {CARD_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
          Replay both reveal variants together to compare the older midpoint
          turn against the newer 3D GSAP flip.
        </div>

        <button
          className="rounded bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-400"
          type="button"
          onClick={replayBoth}
        >
          Replay Both
        </button>
      </section>

      <section className="relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900/45 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <RevealComparisonLane
            title="Old Midpoint"
            description="Single visible card turns edge-on, swaps art, then turns back."
            flipVariant="midpoint"
            dockCardRef={midpointDockCardRef}
            destinationRef={midpointDestinationRef}
            apexRef={midpointApexRef}
            activeReveal={activeReveals.midpoint}
            landedCards={landedCardsByLane.midpoint}
            onStartReveal={startReveal({
              laneId: "midpoint",
              destinationRef: midpointDestinationRef,
              apexRef: midpointApexRef
            })}
            onComplete={() => {
              setActiveReveals((current) => ({
                ...current,
                midpoint: null
              }));
              setLandedCardsByLane((current) => ({
                ...current,
                midpoint: [selectedCardType]
              }));
            }}
          />

          <RevealComparisonLane
            title="New 3D"
            description="Two mounted faces rotate as one card in 3D space."
            flipVariant="3d"
            dockCardRef={threeDDockCardRef}
            destinationRef={threeDDestinationRef}
            apexRef={threeDApexRef}
            activeReveal={activeReveals.threeD}
            landedCards={landedCardsByLane.threeD}
            onStartReveal={startReveal({
              laneId: "threeD",
              destinationRef: threeDDestinationRef,
              apexRef: threeDApexRef
            })}
            onComplete={() => {
              setActiveReveals((current) => ({
                ...current,
                threeD: null
              }));
              setLandedCardsByLane((current) => ({
                ...current,
                threeD: [selectedCardType]
              }));
            }}
          />
        </div>

        <div className="pointer-events-none absolute bottom-3 right-4 text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
          Dev Card Motion Comparison
        </div>
      </section>
    </div>
  );
}
