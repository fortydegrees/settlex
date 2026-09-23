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
import {
  getReplayMobileDockClassName,
  getSegmentedReplayPerspectiveOptions,
  shouldUseSegmentedReplayPerspective,
} from "./replayPanelLayout";

const replayRestoreClassName =
  "settlex-ui-hud settlex-ui-focus group relative flex min-h-[2.75rem] w-full items-center overflow-hidden rounded-control py-ui-0 pl-ui-3.5 pr-ui-1.5 transition hover:bg-surface-hover";

export function ReplayPanel({
  timeline,
  currentEvent,
  currentEventIndex,
  perspectiveId,
  victoryTarget,
  open,
  mobileOpen,
  chartOpen = false,
  onOpenChange,
  onMobileOpenChange,
  onChartOpenChange,
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
  const eventCount = timeline.events.length;
  const atEnd = currentEventIndex >= Math.max(eventCount - 1, 0);
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
  const segmentedPerspectiveOptions = getSegmentedReplayPerspectiveOptions(
    timeline.players
  );
  const useSegmentedPerspective = shouldUseSegmentedReplayPerspective(
    timeline.players
  );
  const renderPerspectiveControl = () =>
    useSegmentedPerspective ? (
      <div
        className="settlex-ui-inset flex min-w-0 rounded-pill p-ui-1"
        role="group"
        aria-label="Replay perspective"
      >
        {segmentedPerspectiveOptions.map((option) => {
          const selected = (option.id ?? null) === (perspectiveId ?? null);
          return (
            <button
              key={option.id ?? "board"}
              type="button"
              className="settlex-ui-segment settlex-ui-focus min-h-[2.75rem] min-w-0 flex-1 truncate rounded-pill px-ui-1 type-caption transition-[background-color,color,box-shadow] duration-[var(--settlex-ui-duration-fast)] motion-reduce:transition-none"
              onClick={() => onPerspectiveChange(option.id)}
              aria-pressed={selected}
            >
              {option.name}
            </button>
          );
        })}
      </div>
    ) : (
      <label className="block">
        <span className="sr-only">Replay perspective</span>
        <Select
          className="w-full"
          value={perspectiveId ?? "board"}
          aria-label="Replay perspective"
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
  const actorId = currentEvent?.logEntry?.actorId;
  const actorName =
    actorId == null
      ? null
      : timeline.playerMap?.[String(actorId)]?.name ?? null;
  const turnText =
    currentEvent?.turn == null || currentEvent.turn === 0
      ? "Setup"
      : `Turn ${currentEvent.turn}`;
  const turnAndActorText = actorName
    ? `${turnText} · ${actorName}`
    : turnText;
  const eventSummary = (
    <div className="mt-ui-3">
      <div className="flex items-baseline justify-between gap-ui-3">
        <span className="min-w-0 truncate type-caption text-ink-secondary">
          {turnAndActorText}
        </span>
        <span className="shrink-0 type-caption tabular-nums text-ink-secondary">
          Event {currentEventIndex + 1} of {Math.max(eventCount, 1)}
        </span>
      </div>
      <div
        className="mt-ui-1 min-h-[2rem] type-action text-ink-primary [text-wrap:pretty]"
        aria-live="polite"
      >
        {currentEvent?.label ?? "Initial setup"}
      </div>
    </div>
  );
  const scoreChart = (
    <ReplayScoreChart
      players={timeline.players}
      scoreSeries={timeline.scoreSeries}
      turnStarts={timeline.turnStarts}
      currentEventIndex={currentEventIndex}
      eventCount={eventCount}
      victoryTarget={victoryTarget}
      perspectiveId={perspectiveId}
      onSeek={onSeek}
    />
  );
  const onChartToggle = () => onChartOpenChange?.(!chartOpen);
  // The compact dock hides the rail, so this thin bar is the only cue to how
  // far through the match the collapsed dock is sitting.
  const progressPercent =
    (currentEventIndex / Math.max(eventCount - 1, 1)) * 100;

  if (!isMeasured) return null;

  return (
    <>
      {!isPhoneLayout ? (
        <aside
          className="pointer-events-auto fixed right-4 top-4 z-[45] w-[min(21rem,calc(100vw-2rem))]"
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
                <span className="type-action-small">Replay</span>
                <div className="flex items-center gap-ui-1.5">
                  <Button
                    size="sm"
                    variant={atEnd ? "accent" : "subtle"}
                    onClick={onResultsOpen}
                  >
                    Results
                  </Button>
                  <button
                    type="button"
                    className="settlex-ui-focus grid h-11 w-11 place-items-center rounded-control text-ink-secondary transition hover:bg-surface-hover hover:text-ink-primary"
                    onClick={() => onOpenChange(false)}
                    aria-label="Minimize replay panel"
                  >
                    <ChevronUpIcon className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </header>
              <div className="relative z-10 shrink-0 px-ui-3.5 pb-ui-3 pt-ui-3">
                {renderPerspectiveControl()}
                {eventSummary}
                <div
                  className="mt-ui-2"
                  aria-label="Previous turn and event controls"
                >
                  <ReplayStepControls {...stepProps} />
                </div>
              </div>
              <button
                type="button"
                className={`relative z-10 flex shrink-0 items-center justify-between gap-ui-2 border-t border-edge-subtle px-ui-3.5 py-ui-2.5 text-left transition hover:bg-surface-hover ${
                  chartOpen ? "bg-surface-hover" : "bg-decoration-fill"
                }`}
                onClick={onChartToggle}
                aria-expanded={chartOpen}
              >
                <span className="type-action-small text-ink-primary">
                  Score over time
                </span>
                <span
                  className={`grid h-[1.625rem] w-[1.625rem] place-items-center rounded-small bg-surface-hover text-ink-secondary transition-transform duration-150 motion-reduce:transition-none ${
                    chartOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </span>
              </button>
              {chartOpen ? (
                <div className="relative z-10 min-h-0 flex-1 overflow-y-auto border-t border-edge-subtle bg-decoration-fill px-ui-3.5 pb-ui-3.5 pt-ui-3">
                  {scoreChart}
                </div>
              ) : null}
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
              <span className="relative z-10 flex min-w-0 flex-1 items-center gap-ui-2">
                <span className="shrink-0 type-action-small text-ink-primary">
                  Replay
                </span>
                <span
                  className="shrink-0 type-action-small text-ink-muted"
                  aria-hidden="true"
                >
                  ·
                </span>
                <span className="min-w-0 flex-1 truncate text-left type-caption text-ink-secondary">
                  {turnText} · {currentEvent?.label ?? "Initial setup"}
                </span>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-pill border border-edge-subtle bg-surface-hover text-ink-secondary transition group-hover:bg-surface-selected"
                  aria-hidden="true"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </span>
              </span>
            </button>
          )}
        </aside>
      ) : null}

      {isPhoneLayout ? (
        <Drawer.Root
          open={mobileOpen}
          onOpenChange={onMobileOpenChange}
          direction="bottom"
          dismissible
          modal={false}
          noBodyStyles
        >
          <div
            className={getReplayMobileDockClassName(perspectiveId)}
            data-replay-mobile-dock="true"
            data-allow-interaction="true"
          >
            <div
              className={`${META_PANEL_FRAME_CLASS_NAME} pointer-events-auto h-auto p-ui-2`}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[inherit]"
                style={META_PANEL_GLASS_STYLE}
                aria-hidden="true"
              />
              <div className="relative z-10 flex items-center gap-ui-2">
                <div className="min-w-0 flex-1 px-ui-2">
                  <div className="type-caption text-ink-secondary">
                    {turnText}
                  </div>
                  <div className="truncate type-caption text-ink-primary">
                    {currentEvent?.label ?? "Initial setup"}
                  </div>
                  <div
                    className="relative mt-ui-1 h-1 rounded-pill bg-surface-hover"
                    aria-hidden="true"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-pill settlex-ui-replay-progress"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <ReplayStepControls {...stepProps} compact />
                <Drawer.Trigger asChild>
                  <button
                    type="button"
                    className="settlex-ui-button settlex-ui-button-subtle settlex-ui-focus grid h-11 w-11 shrink-0 place-items-center text-ink-secondary"
                    aria-label="Open replay tray"
                  >
                    <ChevronUpIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </Drawer.Trigger>
              </div>
            </div>
          </div>

          <Drawer.Portal>
            <Drawer.Content
              className="settlex-ui-pane fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[min(68vh,34rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-b-none p-ui-4 outline-none motion-reduce:!animate-none motion-reduce:!transition-none motion-reduce:!duration-0"
              onPointerDownOutside={preserveBoardPointerDown}
              data-allow-interaction="true"
            >
              <Drawer.Handle className="!mx-auto !mb-ui-3 !mt-ui-0 !h-1.5 !w-14 !rounded-pill settlex-ui-replay-handle" />
              <div className="flex items-center justify-between gap-ui-3">
                <Drawer.Title className="type-section text-ink-primary">
                  Replay
                </Drawer.Title>
                <div className="flex items-center gap-ui-2">
                  <Button
                    size="sm"
                    variant={atEnd ? "accent" : "subtle"}
                    className="h-11 min-h-[2.75rem]"
                    onClick={onResultsOpen}
                  >
                    Results
                  </Button>
                  <Drawer.Close asChild>
                    <button
                      type="button"
                      className="settlex-ui-button settlex-ui-button-ghost settlex-ui-focus grid h-11 w-11 place-items-center text-ink-secondary"
                      aria-label="Close replay tray"
                    >
                      <ChevronDownIcon
                        className="h-5 w-5"
                        aria-hidden="true"
                      />
                    </button>
                  </Drawer.Close>
                </div>
              </div>
              <Drawer.Description className="sr-only">
                Replay navigation and victory point history.
              </Drawer.Description>
              <div className="mt-ui-3 min-h-0 flex-1 overflow-y-auto">
                {renderPerspectiveControl()}
                {eventSummary}
                <div
                  className="mt-ui-2"
                  aria-label="Previous turn and event controls"
                >
                  <ReplayStepControls {...stepProps} touchLabels />
                </div>
                <button
                  type="button"
                  className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus mt-ui-3 flex min-h-[2.75rem] w-full items-center justify-between gap-ui-2 px-ui-3.5 text-left"
                  onClick={onChartToggle}
                  aria-expanded={chartOpen}
                >
                  <span className="type-action-small text-ink-primary">
                    Score over time
                  </span>
                  <span className="type-caption text-ink-muted">
                    {chartOpen ? "Hide" : "Show"}
                  </span>
                </button>
                {chartOpen ? <div className="mt-ui-3">{scoreChart}</div> : null}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : null}
    </>
  );
}
