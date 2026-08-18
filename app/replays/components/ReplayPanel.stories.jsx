import { useState } from "react";
import { fn } from "@storybook/test";
import { replayTimeline } from "../../catana/dev/storybook/replayFixtures";
import { ReplayPanel } from "./ReplayPanel";

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
  initialChartOpen = false,
  initialEventIndex = 2,
  timeline = replayTimeline,
}) {
  const [open, setOpen] = useState(initialOpen);
  const [mobileOpen, setMobileOpen] = useState(initialMobileOpen);
  const [perspectiveId, setPerspectiveId] = useState(initialPerspectiveId);
  const [chartOpen, setChartOpen] = useState(initialChartOpen);
  const currentEventIndex = Math.min(
    initialEventIndex,
    timeline.events.length - 1
  );

  return (
    <main className="min-h-screen">
      <ReplayPanel
        timeline={timeline}
        currentEvent={timeline.events[currentEventIndex]}
        currentEventIndex={currentEventIndex}
        perspectiveId={perspectiveId}
        victoryTarget={10}
        open={open}
        mobileOpen={mobileOpen}
        chartOpen={chartOpen}
        onOpenChange={setOpen}
        onMobileOpenChange={setMobileOpen}
        onChartOpenChange={setChartOpen}
        onPerspectiveChange={setPerspectiveId}
        {...callbacks}
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
    viewport: { defaultViewport: "catanaDesktop" },
  },
};

export const DesktopPanelCollapsed = {
  args: {
    ...DesktopPanelOpen.args,
    initialOpen: false,
  },
  parameters: {
    viewport: { defaultViewport: "catanaDesktop" },
  },
};

export const DesktopChartExpanded = {
  args: {
    ...DesktopPanelOpen.args,
    initialChartOpen: true,
  },
  parameters: {
    viewport: { defaultViewport: "catanaDesktop" },
  },
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
    viewport: { defaultViewport: "catanaDesktop" },
  },
};

export const DesktopTerminalResultsClosed = {
  args: {
    ...DesktopPanelOpen.args,
    initialEventIndex: replayTimeline.events.length - 1,
  },
  parameters: {
    viewport: { defaultViewport: "catanaDesktop" },
  },
};

export const MobileDockClosed = {
  args: {
    initialOpen: true,
    initialMobileOpen: false,
    initialPerspectiveId: null,
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};

export const MobilePlayerPerspectiveDock = {
  args: {
    ...MobileDockClosed.args,
    initialPerspectiveId: "1",
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};

export const MobileDrawerOpen = {
  args: {
    ...MobileDockClosed.args,
    initialMobileOpen: true,
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
