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

function ReplayPanelHarness({
  initialOpen = true,
  initialMobileOpen = false,
  initialPerspectiveId = null,
}) {
  const [open, setOpen] = useState(initialOpen);
  const [mobileOpen, setMobileOpen] = useState(initialMobileOpen);
  const [perspectiveId, setPerspectiveId] = useState(initialPerspectiveId);
  const currentEventIndex = 2;

  return (
    <main className="min-h-screen">
      <ReplayPanel
        timeline={replayTimeline}
        currentEvent={replayTimeline.events[currentEventIndex]}
        currentEventIndex={currentEventIndex}
        perspectiveId={perspectiveId}
        victoryTarget={10}
        open={open}
        mobileOpen={mobileOpen}
        onOpenChange={setOpen}
        onMobileOpenChange={setMobileOpen}
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

export const MobileDrawerOpen = {
  args: {
    ...MobileDockClosed.args,
    initialMobileOpen: true,
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
