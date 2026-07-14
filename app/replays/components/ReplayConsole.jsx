"use client";

import React, { useCallback, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Drawer } from "vaul";
import useWindowSize from "../../catana/utils/useWindowSize";
import { ReplayScoreChart } from "./ReplayScoreChart";
import { ReplayTransportControls } from "./ReplayTransportControls";

export function ReplayConsole(props) {
  const [collapsed, setCollapsed] = useState(false);
  const { width, isMeasured } = useWindowSize();
  const isPhoneLayout = isMeasured && width < 640;
  const preserveBoardPointerDown = useCallback((event) => {
    event.preventDefault = () => {};
  }, []);
  const transportProps = {
    currentEvent: props.currentEvent,
    currentEventIndex: props.currentEventIndex,
    eventCount: props.timeline.events.length,
    turnStarts: props.timeline.turnStarts,
    onPreviousEvent: props.onPreviousEvent,
    onNextEvent: props.onNextEvent,
    onPreviousTurn: props.onPreviousTurn,
    onNextTurn: props.onNextTurn,
    onSeek: props.onSeek,
  };
  const renderChart = () => (
    <ReplayScoreChart
      players={props.timeline.players}
      scoreSeries={props.timeline.scoreSeries}
      turnStarts={props.timeline.turnStarts}
      currentEventIndex={props.currentEventIndex}
      victoryTarget={props.victoryTarget}
      onSeek={props.onSeek}
    />
  );

  if (!isMeasured) return null;

  return (
    <>
      {!isPhoneLayout ? (
        <aside
          className={`fixed bottom-4 right-4 top-4 z-[55] transition-[width] duration-200 motion-reduce:transition-none ${
            collapsed ? "w-16" : "w-[22rem]"
          }`}
          data-replay-console="desktop"
          data-allow-interaction="true"
        >
          <div className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-white/55 bg-blue-100/82 p-3 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.72)] ring-1 ring-white/40 backdrop-blur-2xl">
            <div
              className={`flex items-center ${
                collapsed ? "justify-center" : "justify-between"
              }`}
            >
              {!collapsed ? (
                <div>
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-500">
                    Archived replay
                  </p>
                  <h1 className="text-lg font-extrabold text-slate-900">
                    Match analysis
                  </h1>
                </div>
              ) : null}
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-white/55 bg-white/55 text-slate-700 shadow-sm transition-colors hover:bg-white/75"
                onClick={() => setCollapsed((value) => !value)}
                aria-label={
                  collapsed
                    ? "Expand replay console"
                    : "Collapse replay console"
                }
              >
                {collapsed ? (
                  <ChevronLeftIcon
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRightIcon
                    className="h-5 w-5"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>
            <div
              className={
                collapsed
                  ? "mt-4"
                  : "mt-5 min-h-0 flex-1 overflow-y-auto px-1 pb-2"
              }
            >
              <ReplayTransportControls
                {...transportProps}
                compact={collapsed}
                rail={collapsed}
              />
              {!collapsed ? renderChart() : null}
            </div>
          </div>
        </aside>
      ) : null}

      {isPhoneLayout ? (
        <>
          <div
            className="fixed inset-x-3 bottom-3 z-[55]"
            data-replay-mobile-dock="true"
            data-allow-interaction="true"
          >
            <div className="rounded-[1.25rem] border border-white/55 bg-blue-100/88 p-2 shadow-[0_20px_55px_-28px_rgba(15,23,42,0.75)] ring-1 ring-white/40 backdrop-blur-2xl">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 px-2">
                  <div className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-slate-500">
                    Turn {props.currentEvent?.turn ?? "—"}
                  </div>
                  <div className="truncate text-xs font-bold text-slate-900">
                    {props.currentEvent?.label ?? "Initial setup"}
                  </div>
                </div>
                <ReplayTransportControls {...transportProps} compact />
                <button
                  type="button"
                  className="min-h-10 rounded-xl border border-white/50 bg-white/55 px-3 text-xs font-extrabold text-slate-800 shadow-sm hover:bg-white/75"
                  onClick={() => props.onMobileOpenChange(true)}
                >
                  Details
                </button>
              </div>
            </div>
          </div>

          <Drawer.Root
            open={props.mobileOpen}
            onOpenChange={props.onMobileOpenChange}
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
                <Drawer.Title className="text-lg font-extrabold text-slate-900">
                  Archived replay
                </Drawer.Title>
                <Drawer.Description className="sr-only">
                  Replay navigation and victory point history.
                </Drawer.Description>
                <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                  <ReplayTransportControls {...transportProps} />
                  {renderChart()}
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        </>
      ) : null}
    </>
  );
}
