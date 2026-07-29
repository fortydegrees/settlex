import { expect, fn, userEvent, within } from "@storybook/test";
import {
  replayScoreSeries,
  replayTimeline,
} from "../../catana/dev/storybook/replayFixtures";
import {
  getReplayChartKeyboardSeekIndex,
  ReplayScoreChart,
} from "./ReplayScoreChart";
import { ReplayStatusPage } from "./ReplayStatusPage";
import { ReplayStepControls } from "./ReplayStepControls";

const stepCallbacks = {
  onPreviousEvent: fn(),
  onNextEvent: fn(),
  onPreviousTurn: fn(),
  onNextTurn: fn(),
  onSeek: fn(),
};

const stepControlsStage = (props) => (
  <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
    <section className="w-full rounded-[1.4rem] border border-white/60 bg-blue-100/90 p-5 shadow-2xl ring-1 ring-white/40 backdrop-blur-2xl">
      <ReplayStepControls
        {...props}
        turnStarts={replayTimeline.turnStarts}
      />
    </section>
  </div>
);

const meta = {
  title: "Product Patterns/Postgame & Replay/Replay Controls",
  parameters: { layout: "fullscreen" },
  argTypes: {
    currentEventIndex: { control: false },
    eventCount: { control: false },
    victoryTarget: { control: false },
    players: { control: false },
    scoreSeries: { control: false },
    turnStarts: { control: false },
    matchID: { control: false },
    status: { control: false },
  },
};

export default meta;

export const StepControlsAtStart = {
  args: {
    currentEventIndex: 0,
    eventCount: replayTimeline.events.length,
    ...stepCallbacks,
  },
  render: (args) => stepControlsStage(args),
};

export const StepControlsInMiddle = {
  args: {
    ...StepControlsAtStart.args,
    currentEventIndex: 2,
  },
  render: (args) => stepControlsStage(args),
};

export const StepControlsAtEnd = {
  args: {
    ...StepControlsAtStart.args,
    currentEventIndex: replayTimeline.events.length - 1,
  },
  render: (args) => stepControlsStage(args),
};

export const PreparingArchive = {
  render: () => (
    <ReplayStatusPage matchID="storybook-replay" status="preparing" />
  ),
};

export const ReplayUnavailable = {
  render: () => (
    <ReplayStatusPage matchID="storybook-replay" status="invalid" />
  ),
};

export const ReplayScoreTimeline = {
  args: {
    currentEventIndex: 2,
    eventCount: replayTimeline.events.length,
    victoryTarget: 10,
    onSeek: fn(),
  },
  render: (args) => (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8">
      <section className="w-full rounded-[1.4rem] border border-white/60 bg-blue-100/90 p-5 shadow-2xl ring-1 ring-white/40 backdrop-blur-2xl">
        <ReplayScoreChart
          {...args}
          players={replayTimeline.players}
          scoreSeries={replayScoreSeries}
          turnStarts={replayTimeline.turnStarts}
        />
      </section>
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    const chart = await screen.findByRole("slider", {
      name: "Replay victory point timeline",
    });
    const targetEventIndex = getReplayChartKeyboardSeekIndex({
      key: "ArrowRight",
      currentEventIndex: args.currentEventIndex,
      eventCount: args.eventCount,
    });

    args.onSeek.mockClear();
    chart.focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(chart).toHaveFocus();
    expect(args.onSeek).toHaveBeenCalledWith(targetEventIndex);
  },
};
