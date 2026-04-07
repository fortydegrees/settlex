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

export function DevCardRevealLab() {
  const dockCardRef = useRef(null);
  const destinationRef = useRef(null);
  const [selectedCardType, setSelectedCardType] = useState(DEFAULT_CARD_TYPE);
  const [activeReveal, setActiveReveal] = useState(null);
  const [landedCards, setLandedCards] = useState([]);
  const [revealRunId, setRevealRunId] = useState(0);

  const startReveal = ({ triggerRect, preLaunchDelayMs = 0 } = {}) => {
    const destinationRect =
      destinationRef.current?.getBoundingClientRect?.() ?? null;
    if (!triggerRect || !destinationRect) return;

    setLandedCards([]);
    setRevealRunId((current) => current + 1);
    setActiveReveal({
      id: revealRunId + 1,
      playerId: "0",
      cardType: selectedCardType,
      beforeCards: [],
      vpSnapshot: {
        publicPoints: 0,
        totalPoints: selectedCardType === "victoryPoint" ? 1 : 0
      },
      triggerRect,
      destinationRect: {
        left: destinationRect.left,
        top: destinationRect.top,
        width: destinationRect.width,
        height: destinationRect.height,
        right: destinationRect.right,
        bottom: destinationRect.bottom
      },
      launchDelayMs: preLaunchDelayMs
    });
  };

  const replayReveal = () => {
    setLandedCards([]);
    dockCardRef.current?.querySelector("button")?.click();
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
              setLandedCards([]);
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
          Click the dev-card dock button or use replay to run the full dock squash,
          detached reveal, flip, and handoff into the destination shell.
        </div>

        <button
          className="rounded bg-lime-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-lime-400"
          type="button"
          onClick={replayReveal}
        >
          Replay Reveal
        </button>
      </section>

      <section className="relative overflow-hidden rounded-[28px] border border-slate-700 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.35),_rgba(37,99,235,0.18)_40%,_rgba(15,23,42,0.88)_100%)] p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_rgba(255,255,255,0)_72%)]" />

        <div className="relative flex h-[560px] items-end justify-center">
          <div className="absolute left-1/2 top-[18%] h-24 w-24 -translate-x-1/2 rounded-full border border-dashed border-white/30 bg-white/5" />

          <div className="pointer-events-none absolute left-1/2 top-[18%] -translate-x-1/2 translate-y-28 text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
            Reveal Apex
          </div>

          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-end gap-4">
            <div className="rounded-2xl bg-blue-200/45 p-4 shadow-xl ring-1 ring-white/30 backdrop-blur-sm">
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
                      action: startReveal
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
        </div>

        <div className="pointer-events-none absolute bottom-3 right-4 text-[11px] font-medium uppercase tracking-[0.24em] text-white/40">
          Dev Card Motion Preview
        </div>

        <DevCardPurchaseReveal
          reveal={activeReveal}
          onComplete={() => {
            setActiveReveal(null);
            setLandedCards([selectedCardType]);
          }}
        />
      </section>
    </div>
  );
}
