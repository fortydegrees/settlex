"use client";

import React, { useCallback } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { Drawer } from "vaul";
import {
  META_PANEL_FRAME_CLASS_NAME,
  META_PANEL_GLASS_STYLE,
  META_PANEL_HEADER_CLASS_NAME,
} from "../../game/feed/metaPanelChrome";
import useWindowSize from "../../../../lib/client/useWindowSize";
import { Button } from "../../../ui/Button";
import { Disclosure } from "../../../ui/Disclosure";
import { SegmentedControl } from "../../../ui/SegmentedControl";
import { Switch } from "../../../ui/Switch";
import { Select } from "../../../ui/Select";
import { ReplayScoreChart } from "./ReplayScoreChart";
import { ReplayStepControls } from "./ReplayStepControls";
import {
  getReplayMobileDockClassName,
  getSegmentedReplayPerspectiveOptions,
  shouldUseSegmentedReplayPerspective,
} from "./replayPanelLayout";

export function ReplayPanel({
  timeline,
  currentEvent,
  currentEventIndex,
  perspectiveId,
  revealAllHands = true,
  onRevealAllHandsChange,
  victoryTarget,
  canShowResults = true,
  replayMetadata = null,
  open,
  mobileOpen,
  chartOpen = false,
  onOpenChange,
  onMobileOpenChange,
  onChartOpenChange,
  onPerspectiveChange,
  onResultsOpen,
  onLibraryOpen = null,
  onPreviousEvent,
  onNextEvent,
  onPreviousTurn,
  onNextTurn,
  onSeek,
}) {
  const { width, isMeasured } = useWindowSize();
  // Match the game screen's compact replay HUD below its reserved lg side lane.
  const isPhoneLayout = isMeasured && width < 1024;
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
      <SegmentedControl label="Replay perspective" density="compact"
        value={perspectiveId ?? null} onValueChange={onPerspectiveChange}
        options={segmentedPerspectiveOptions.map(option => ({ value: option.id ?? null, label: option.name }))} />
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
  const revealControl = (
    <Switch checked={revealAllHands} onCheckedChange={onRevealAllHandsChange} className="mt-ui-2">
      Reveal all hands
    </Switch>
  );
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
      {replayMetadata?.checkpoint?.label ? (
        <p className="mb-ui-2 type-caption text-ink-secondary">
          Checkpoint: {replayMetadata.checkpoint.label}
        </p>
      ) : null}
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
      {currentEvent?.annotation?.decision ? (
        <p className="mt-ui-2 type-body-small text-ink-primary">
          Chosen move: {currentEvent.annotation.decision.label}
        </p>
      ) : null}
      {[...(replayMetadata?.warnings ?? []), ...(currentEvent?.annotation?.notes ?? [])].map((note, index) => (
        <p key={`${index}:${note}`} className="mt-ui-2 type-caption text-ink-secondary">{note}</p>
      ))}
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
  // The compact dock hides the rail, so this thin bar is the only cue to how
  // far through the match the collapsed dock is sitting.
  const progressPercent =
    (currentEventIndex / Math.max(eventCount - 1, 1)) * 100;

  if (!isMeasured) return null;

  return (
    <>
      {!isPhoneLayout ? (
        <aside
          className="pointer-events-auto fixed right-4 top-[8.5rem] min-[1440px]:top-4 z-[45] w-[min(21rem,calc(100vw-2rem))]"
          data-replay-panel="desktop"
          data-allow-interaction="true"
        >
          <Disclosure
            open={open}
            onOpenChange={onOpenChange}
            className="settlehex-ui-hud relative max-h-[calc(100dvh-2rem)] overflow-hidden select-none"
            contentClassName="max-h-[calc(100dvh-6rem)] overflow-y-auto"
            header={(control) => (
              <header className={META_PANEL_HEADER_CLASS_NAME}>
                <span className="type-action-small">Replay</span>
                <div className="flex min-w-0 flex-1 items-center justify-end gap-ui-1.5">
                  {open && onLibraryOpen ? <Button size="sm" variant="subtle" onClick={onLibraryOpen} aria-label="Saved games">Games</Button> : null}
                  {open ? <Button size="sm" variant={atEnd ? "accent" : "subtle"}
                    disabled={!canShowResults} onClick={onResultsOpen}>Results</Button> : null}
                  {control}
                </div>
              </header>
            )}
            trigger={<button type="button"
              className={`settlehex-ui-focus settlehex-ui-motion-feedback flex h-11 min-w-0 items-center gap-ui-2 rounded-control text-ink-secondary hover:bg-surface-hover hover:text-ink-primary ${open ? "w-11 justify-center" : "flex-1 justify-between px-ui-2"}`}
              aria-label={open ? "Minimize replay panel" : "Restore replay panel"}>
              {!open ? <span className="truncate text-left type-caption">{turnText} · {currentEvent?.label ?? "Initial setup"}</span> : null}
              <ChevronDownIcon className={`h-4 w-4 shrink-0 settlehex-ui-disclosure-indicator ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>}
          >
              <div className="relative z-10 shrink-0 px-ui-3.5 pb-ui-3 pt-ui-3">
                {renderPerspectiveControl()}
                {revealControl}
                {eventSummary}
                <div
                  className="mt-ui-2"
                  aria-label="Previous turn and event controls"
                >
                  <ReplayStepControls {...stepProps} />
                </div>
              </div>
              <Disclosure open={chartOpen} onOpenChange={onChartOpenChange}
                className="relative z-10" contentClassName="border-t border-edge-subtle bg-decoration-fill px-ui-3.5 pb-ui-3.5 pt-ui-3"
                trigger={<button
                type="button"
                className={`relative z-10 flex shrink-0 items-center justify-between gap-ui-2 border-t border-edge-subtle px-ui-3.5 py-ui-2.5 text-left settlehex-ui-motion-feedback hover:bg-surface-hover ${
                  chartOpen ? "bg-surface-hover" : "bg-decoration-fill"
                }`}
              >
                <span className="type-action-small text-ink-primary">
                  Score over time
                </span>
                <span
                  className={`grid h-[1.625rem] w-[1.625rem] place-items-center rounded-small bg-surface-hover text-ink-secondary settlehex-ui-disclosure-indicator ${
                    chartOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </span>
              </button>}>
                {scoreChart}
              </Disclosure>
          </Disclosure>
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
                      className="absolute inset-y-0 left-0 rounded-pill settlehex-ui-replay-progress"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <ReplayStepControls {...stepProps} compact />
                <Drawer.Trigger asChild>
                  <button
                    type="button"
                    className="settlehex-ui-button settlehex-ui-button-subtle settlehex-ui-focus grid h-11 w-11 shrink-0 place-items-center text-ink-secondary"
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
              className="settlehex-ui-pane fixed inset-x-0 bottom-0 z-[70] mx-auto flex h-[min(68vh,34rem)] w-full max-w-[30rem] flex-col overflow-hidden rounded-b-none p-ui-4 outline-none motion-reduce:!animate-none motion-reduce:!transition-none motion-reduce:!duration-0"
              onPointerDownOutside={preserveBoardPointerDown}
              data-allow-interaction="true"
            >
              <Drawer.Handle className="!mx-auto !mb-ui-3 !mt-ui-0 !h-1.5 !w-14 !rounded-pill settlehex-ui-replay-handle" />
              <div className="flex items-center justify-between gap-ui-3">
                <Drawer.Title className="type-section text-ink-primary">
                  Replay
                </Drawer.Title>
                <div className="flex items-center gap-ui-2">
                  {onLibraryOpen ? <Button size="sm" variant="subtle" onClick={onLibraryOpen} aria-label="Saved games">Games</Button> : null}
                  <Button
                    size="sm"
                    variant={atEnd ? "accent" : "subtle"}
                    className="h-11 min-h-[2.75rem]"
                    disabled={!canShowResults}
                    onClick={onResultsOpen}
                  >
                    Results
                  </Button>
                  <Drawer.Close asChild>
                    <button
                      type="button"
                      className="settlehex-ui-button settlehex-ui-button-ghost settlehex-ui-focus grid h-11 w-11 place-items-center text-ink-secondary"
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
                {revealControl}
                {eventSummary}
                <div
                  className="mt-ui-2"
                  aria-label="Previous turn and event controls"
                >
                  <ReplayStepControls {...stepProps} touchLabels />
                </div>
                <Disclosure open={chartOpen} onOpenChange={onChartOpenChange}
                  contentClassName="mt-ui-3" trigger={<button
                  type="button"
                  className="settlehex-ui-button settlehex-ui-button-secondary settlehex-ui-focus mt-ui-3 flex min-h-[2.75rem] w-full items-center justify-between gap-ui-2 px-ui-3.5 text-left"
                >
                  <span className="type-action-small text-ink-primary">
                    Score over time
                  </span>
                  <span className="type-caption text-ink-muted">{chartOpen ? "Hide" : "Show"}</span>
                </button>}>
                  {scoreChart}
                </Disclosure>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : null}
    </>
  );
}
