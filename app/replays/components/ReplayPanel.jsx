"use client";

import React, { useCallback } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { Drawer } from "vaul";
import {
  META_PANEL_FRAME_CLASS_NAME,
  META_PANEL_GLASS_STYLE,
  META_PANEL_HEADER_CLASS_NAME,
} from "../../catana/components/metaPanelChrome";
import useWindowSize from "../../catana/utils/useWindowSize";
import { Button } from "../../ui/Button";
import { Select } from "../../ui/Select";
import { ReplayScoreChart } from "./ReplayScoreChart";
import { ReplayStepControls } from "./ReplayStepControls";
import { getReplayMobileDockClassName } from "./replayPanelLayout";

const replayRestoreClassName =
  "relative overflow-hidden rounded-[1.15rem] border border-white/[0.38] px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_18px_42px_-28px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-white/35 transition hover:bg-white/20";

export function ReplayPanel({
  timeline,
  currentEvent,
  currentEventIndex,
  perspectiveId,
  victoryTarget,
  open,
  mobileOpen,
  onOpenChange,
  onMobileOpenChange,
  onPerspectiveChange,
  onResultsOpen,
  onPreviousEvent,
  onNextEvent,
  onPreviousTurn,
  onNextTurn,
  onSeek,
}) {
  const { width, isMeasured } = useWindowSize();
  const isPhoneLayout = isMeasured && width < 640;
  const preserveBoardPointerDown = useCallback((event) => {
    event.preventDefault = () => {};
  }, []);
  const stepProps = {
    currentEventIndex,
    eventCount: timeline.events.length,
    turnStarts: timeline.turnStarts,
    onPreviousEvent,
    onNextEvent,
    onPreviousTurn,
    onNextTurn,
    onSeek,
  };
  const perspectiveControl = (
    <label className="block text-xs font-semibold text-slate-600">
      <span className="mb-1.5 block">View</span>
      <Select
        className="rounded-xl px-3 py-2 text-sm"
        value={perspectiveId ?? "board"}
        onChange={(event) =>
          onPerspectiveChange(
            event.target.value === "board" ? null : event.target.value
          )
        }
      >
        <option value="board">Board</option>
        {timeline.players.map((player) => (
          <option key={player.id} value={player.id}>
            {player.name}
          </option>
        ))}
      </Select>
    </label>
  );
  const chart = (
    <ReplayScoreChart
      players={timeline.players}
      scoreSeries={timeline.scoreSeries}
      turnStarts={timeline.turnStarts}
      currentEventIndex={currentEventIndex}
      eventCount={timeline.events.length}
      victoryTarget={victoryTarget}
      onSeek={onSeek}
    />
  );

  if (!isMeasured) return null;

  return (
    <>
      {!isPhoneLayout ? (
        <aside
          className="pointer-events-auto fixed right-4 top-4 z-[45] w-[min(22rem,calc(100vw-2rem))]"
          data-replay-panel="desktop"
          data-allow-interaction="true"
        >
          {open ? (
            <section
              className={`${META_PANEL_FRAME_CLASS_NAME} max-h-[min(34rem,calc(100vh-9rem))]`}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={META_PANEL_GLASS_STYLE}
                aria-hidden="true"
              />
              <header className={META_PANEL_HEADER_CLASS_NAME}>
                <span className="text-sm font-bold">Replay</span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="subtle" onClick={onResultsOpen}>
                    Results
                  </Button>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-white/35 hover:text-slate-900"
                    onClick={() => onOpenChange(false)}
                    aria-label="Minimize replay panel"
                  >
                    <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </header>
              <div className="relative z-10 min-h-0 overflow-y-auto p-3">
                {perspectiveControl}
                <div className="mt-3">
                  <div className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Turn {currentEvent?.turn ?? "—"}
                  </div>
                  <div
                    className="mt-1 min-h-10 text-sm font-bold leading-5 text-slate-900"
                    aria-live="polite"
                  >
                    {currentEvent?.label ?? "Initial setup"}
                  </div>
                </div>
                <div aria-label="Previous turn and event controls">
                  <ReplayStepControls {...stepProps} />
                </div>
                {chart}
              </div>
            </section>
          ) : (
            <button
              type="button"
              className={replayRestoreClassName}
              onClick={() => onOpenChange(true)}
              aria-label="Restore replay panel"
            >
              <span
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={META_PANEL_GLASS_STYLE}
                aria-hidden="true"
              />
              <span className="relative z-10 flex items-center gap-2">
                Replay
                <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          )}
        </aside>
      ) : null}

      {isPhoneLayout ? (
        <>
          <div
            className={getReplayMobileDockClassName(perspectiveId)}
            data-replay-mobile-dock="true"
            data-allow-interaction="true"
          >
            <div className={`${META_PANEL_FRAME_CLASS_NAME} h-auto p-2`}>
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={META_PANEL_GLASS_STYLE}
                aria-hidden="true"
              />
              <div className="relative z-10 flex items-center gap-2">
                <div className="min-w-0 flex-1 px-2">
                  <div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Turn {currentEvent?.turn ?? "—"}
                  </div>
                  <div className="truncate text-xs font-bold text-slate-900">
                    {currentEvent?.label ?? "Initial setup"}
                  </div>
                </div>
                <ReplayStepControls {...stepProps} compact />
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => onMobileOpenChange(true)}
                >
                  Details
                </Button>
              </div>
            </div>
          </div>

          <Drawer.Root
            open={mobileOpen}
            onOpenChange={onMobileOpenChange}
            direction="bottom"
            dismissible
            modal={false}
            noBodyStyles
          >
            <Drawer.Portal>
              <Drawer.Content
                className="fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[min(68vh,34rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-t-[1.55rem] border border-white/55 bg-blue-100/95 p-4 shadow-[0_-28px_70px_-38px_rgba(15,23,42,0.72)] backdrop-blur-2xl outline-none"
                onPointerDownOutside={preserveBoardPointerDown}
                data-allow-interaction="true"
              >
                <Drawer.Handle className="!mx-auto !mb-3 !mt-0 !h-1.5 !w-14 !rounded-full !bg-slate-500/36" />
                <div className="flex items-center justify-between gap-3">
                  <Drawer.Title className="text-lg font-extrabold text-slate-900">
                    Replay
                  </Drawer.Title>
                  <Button size="sm" variant="subtle" onClick={onResultsOpen}>
                    Results
                  </Button>
                </div>
                <Drawer.Description className="sr-only">
                  Replay navigation and victory point history.
                </Drawer.Description>
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                  {perspectiveControl}
                  <div className="mt-3">
                    <div aria-label="Previous turn and event controls">
                      <ReplayStepControls {...stepProps} />
                    </div>
                  </div>
                  {chart}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </>
      ) : null}
    </>
  );
}
