import { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { replayTimeline } from "../../dev/storybook/replayFixtures";
import { ReplayPanel } from "./ReplayPanel";
import { useReplayNavigation } from "../useReplayNavigation";
import { getPreviousTurnEventIndex, getNextTurnEventIndex } from "../replayTimeline";

const callbacks = {
  onResultsOpen: fn(),
  onPreviousEvent: fn(),
  onNextEvent: fn(),
  onPreviousTurn: fn(),
  onNextTurn: fn(),
  onSeek: fn(),
};

const longNamePlayers = [
  {
    id: "0",
    name: "HexplorerNorthstar",
    color: "sky",
    emoji: "🧭",
  },
  {
    id: "1",
    name: "brick_and_mortar_99",
    color: "orange",
    emoji: "🧱",
  },
  { id: "2", name: "HarbourFox", color: "green", emoji: "🦊" },
  { id: "3", name: "RoadScholar", color: "purple", emoji: "🛣️" },
];
const fourPlayerTimeline = {
  ...replayTimeline,
  players: longNamePlayers,
  playerMap: Object.fromEntries(
    longNamePlayers.map((player) => [player.id, player])
  ),
  scoreSeries: replayTimeline.scoreSeries.map((sample) => ({
    ...sample,
    scoresByPlayerId: {
      ...sample.scoresByPlayerId,
      "2": Math.max(sample.eventIndex - 1, 0),
      "3": Math.floor(sample.eventIndex / 2),
    },
  })),
};

function ReplayPanelHarness({
  initialOpen = true,
  initialMobileOpen = false,
  initialPerspectiveId = null,
  initialRevealAllHands = true,
  initialChartOpen = false,
  initialEventIndex = 2,
  timeline = replayTimeline,
  replayMetadata = null,
}) {
  const [open, setOpen] = useState(initialOpen);
  const [mobileOpen, setMobileOpen] = useState(initialMobileOpen);
  const [perspectiveId, setPerspectiveId] = useState(initialPerspectiveId);
  const [revealAllHands, setRevealAllHands] = useState(initialRevealAllHands);
  const [chartOpen, setChartOpen] = useState(initialChartOpen);
  const navigation = useReplayNavigation({ eventCount: timeline.events.length, initialEventIndex });
  const currentEventIndex = navigation.eventIndex;

  return (
    <main className="min-h-screen">
      <ReplayPanel
        timeline={timeline}
        replayMetadata={replayMetadata}
        currentEvent={timeline.events[currentEventIndex]}
        currentEventIndex={currentEventIndex}
        perspectiveId={perspectiveId}
        revealAllHands={revealAllHands}
        onRevealAllHandsChange={setRevealAllHands}
        victoryTarget={10}
        open={open}
        mobileOpen={mobileOpen}
        chartOpen={chartOpen}
        onOpenChange={setOpen}
        onMobileOpenChange={setMobileOpen}
        onChartOpenChange={setChartOpen}
        onPerspectiveChange={setPerspectiveId}
        {...callbacks}
        onPreviousEvent={() => { callbacks.onPreviousEvent(); navigation.previous(); }}
        onNextEvent={() => { callbacks.onNextEvent(); navigation.next(); }}
        onSeek={(index) => { callbacks.onSeek(index); navigation.seek(index); }}
        onPreviousTurn={() => {
          callbacks.onPreviousTurn();
          navigation.seek(getPreviousTurnEventIndex(currentEventIndex, timeline.turnStarts));
        }}
        onNextTurn={() => {
          callbacks.onNextTurn();
          navigation.seek(getNextTurnEventIndex(currentEventIndex, timeline.turnStarts, timeline.events.length - 1));
        }}
      />
    </main>
  );
}

const meta = {
  title: "Composed Surfaces/Postgame & Replay/Replay Panel",
  component: ReplayPanel,
  parameters: { layout: "fullscreen" },
  argTypes: {
    initialOpen: { control: false },
    initialMobileOpen: { control: false },
    initialPerspectiveId: { control: false },
    initialChartOpen: { control: false },
    initialEventIndex: { control: false },
    timeline: { control: false },
    currentEvent: { control: false },
    currentEventIndex: { control: false },
    perspectiveId: { control: false },
    victoryTarget: { control: false },
    open: { control: false },
    mobileOpen: { control: false },
  },
  render: (args) => <ReplayPanelHarness {...args} />,
};

export default meta;

export const DesktopPanelOpen = {
  args: {
    initialOpen: true,
    initialMobileOpen: false,
    initialPerspectiveId: "0",
  },
  parameters: {
    viewport: { defaultViewport: "settlehexDesktop" },
  },
};

export const DesktopPanelCollapsed = {
  args: {
    ...DesktopPanelOpen.args,
    initialOpen: false,
  },
  parameters: {
    viewport: { defaultViewport: "settlehexDesktop" },
  },
};

export const DesktopChartExpanded = {
  args: {
    ...DesktopPanelOpen.args,
    initialChartOpen: true,
  },
  parameters: {
    viewport: { defaultViewport: "settlehexDesktop" },
  },
};

export const DesktopHandsHidden = {
  ...DesktopPanelOpen,
  args: { ...DesktopPanelOpen.args, initialRevealAllHands: false },
};

export const DesktopFourPlayersLongNames = {
  args: {
    ...DesktopPanelOpen.args,
    initialPerspectiveId: "1",
  },
  render: (args) => (
    <ReplayPanelHarness {...args} timeline={fourPlayerTimeline} />
  ),
  parameters: {
    viewport: { defaultViewport: "settlehexDesktop" },
  },
};

export const DesktopTerminalResultsClosed = {
  args: {
    ...DesktopPanelOpen.args,
    initialEventIndex: replayTimeline.events.length - 1,
  },
  parameters: {
    viewport: { defaultViewport: "settlehexDesktop" },
  },
};

export const MobileDockClosed = {
  args: {
    initialOpen: true,
    initialMobileOpen: false,
    initialPerspectiveId: null,
  },
  parameters: {
    viewport: { defaultViewport: "settlehexMobile" },
  },
};

export const MobilePlayerPerspectiveDock = {
  args: {
    ...MobileDockClosed.args,
    initialPerspectiveId: "1",
  },
  parameters: {
    viewport: { defaultViewport: "settlehexMobile" },
  },
};

export const MobileDrawerOpen = {
  args: {
    ...MobileDockClosed.args,
    initialMobileOpen: true,
  },
  parameters: {
    viewport: { defaultViewport: "settlehexMobile" },
  },
};

export const MobileChartExpanded = {
  ...MobileDrawerOpen,
  args: { ...MobileDrawerOpen.args, initialChartOpen: true },
};

export const MobileFourPlayersLongNames = {
  ...MobileChartExpanded,
  render: (args) => <ReplayPanelHarness {...args} timeline={fourPlayerTimeline} />,
};


export const DesktopResizeAndChart = {
  ...DesktopChartExpanded,
  args: {
    ...DesktopChartExpanded.args,
    replayMetadata: { checkpoint: { label: "Recorded match" }, warnings: ["Some recorded messages are not supported in the game log.", "Development cards reconstructed from the postgame purchase order."] },
  },
  play: async ({ canvasElement }) => {
    delete canvasElement.dataset.motionContract;
    const canvas = within(canvasElement);
    const chart = await canvas.findByRole('slider', { name: 'Replay victory point timeline' });
    await userEvent.click(chart);
    await expect(chart).toHaveFocus();
    await expect(getComputedStyle(chart).outlineStyle).toBe('none');
    await userEvent.tab({ shift: true });
    await userEvent.tab();
    await expect(chart).toHaveFocus();
    await expect(getComputedStyle(chart).outlineStyle).toBe('solid');
    const trigger = canvas.getByRole('button', { name: 'Minimize replay panel' });
    await userEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));
    await expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(canvas.getByRole('slider', { name: 'Replay victory point timeline' })).toBeVisible());
    canvasElement.dataset.motionContract = 'passed';
  },
};
