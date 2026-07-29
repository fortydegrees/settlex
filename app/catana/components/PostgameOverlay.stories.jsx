import { expect, fn, userEvent, within } from "@storybook/test";
import { completedPostgameFixture } from "../dev/storybook/postgameFixtures";
import { PostgameOverlay } from "./PostgameOverlay";

const meta = {
  title: "Composed Surfaces/Postgame & Replay/Postgame Summary",
  component: PostgameOverlay,
  parameters: { layout: "fullscreen" },
  args: {
    ...completedPostgameFixture,
    onWatchReplay: fn(),
    onClose: fn(),
  },
  argTypes: {
    scoreboard: { control: false },
    summary: { control: false },
  },
};

export default meta;

export const RankedScoreboard = {
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onWatchReplay.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: "Watch replay" })
    );
    expect(args.onWatchReplay).toHaveBeenCalledOnce();
  },
};

export const SummaryRows = {
  args: {
    scoreboard: [],
  },
};

export const FinalScoresUnavailable = {
  args: {
    scoreboard: [],
    summary: [],
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    expect(screen.getByText("Final scores unavailable.")).toBeVisible();
    args.onClose.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(args.onClose).toHaveBeenCalledOnce();
  },
};

export const Mobile = {
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
