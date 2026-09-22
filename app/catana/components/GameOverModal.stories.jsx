import { createEmptyState } from "@settlex/game-core";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import {
  buildGameScreenDisplayModel,
  getGameOverTitle,
} from "../utils/gameScreenDisplayModel";
import { GameOverModal } from "./GameOverModal";

const matchData = [
  {
    id: "0",
    name: "HarbourFox",
    data: { color: "orange", participantType: "human" },
  },
  {
    id: "1",
    name: "BoldTraderYM",
    data: { color: "teal", participantType: "human" },
  },
];

const createFinishedCore = () => {
  const core = createEmptyState(["0", "1"]);
  core.buildingsByNodeId = {
    "story-city": { ownerId: "0", type: "city" },
    "story-settlement": { ownerId: "0", type: "settlement" },
    "story-opponent": { ownerId: "1", type: "settlement" },
  };
  return core;
};

const buildModalProps = ({
  playerID,
  winnerId = "0",
  reason = "victoryPoints",
} = {}) => {
  const gameOverState = { winnerId, reason };
  const model = buildGameScreenDisplayModel({
    core: createFinishedCore(),
    playerID,
    gameOverState,
    isGameOver: true,
    matchData,
  });

  return {
    title: getGameOverTitle({
      isWinner: model.isWinner,
      winnerId: model.winnerId,
      winnerName: model.winnerName,
    }),
    subtitle:
      reason === "victoryPoints" && model.winnerVP != null
        ? `${model.gameOverReasonText}: ${model.winnerVP}`
        : model.gameOverReasonText,
    scoreboard: model.scoreboard,
    isWinner: model.isWinner,
  };
};

const winnerProps = buildModalProps({ playerID: "0" });
const loserProps = buildModalProps({ playerID: "1" });
const archivedProps = buildModalProps({
  playerID: "1",
  reason: "Resignation",
});

const meta = {
  title: "Composed Surfaces/Postgame & Replay/Game Over",
  component: GameOverModal,
  parameters: { layout: "fullscreen" },
  args: {
    ...winnerProps,
    shouldFireConfetti: false,
    onWatchReplay: undefined,
    replayStatus: "ready",
    onViewSummary: fn(),
    onLobby: fn(),
    onClose: fn(),
  },
  argTypes: {
    title: { control: false },
    subtitle: { control: false },
    scoreboard: { control: false },
    isWinner: { control: false },
  },
  render: (args) => (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <GameOverModal {...args} />
    </div>
  ),
};

export default meta;

export const Winner = {
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    await waitFor(() => expect(screen.getByText(args.title)).toBeVisible());
    args.onClose.mockClear();
    await userEvent.click(
      screen.getAllByRole("button", { name: "Close" }).at(-1)
    );
    expect(args.onClose).toHaveBeenCalledOnce();
  },
};

export const Loser = {
  args: loserProps,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    await waitFor(() => expect(screen.getByText(args.title)).toBeVisible());
    expect(screen.getByText(args.subtitle)).toBeVisible();
  },
};

export const FinishedHumanMatch = {
  args: {
    ...winnerProps,
    showMatchAlertResume: true,
    matchAlertResumeChecked: true,
    onMatchAlertResumeCheckedChange: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    const checkbox = await screen.findByRole("checkbox", {
      name: "Turn match alerts back on",
    });
    args.onMatchAlertResumeCheckedChange.mockClear();
    await userEvent.click(checkbox);
    expect(args.onMatchAlertResumeCheckedChange).toHaveBeenCalledWith(false);
  },
};

export const ArchivedMatch = {
  args: {
    ...archivedProps,
    onWatchReplay: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    await waitFor(() => expect(screen.getByText(args.subtitle)).toBeVisible());
    args.onWatchReplay.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Replay" }));
    expect(args.onWatchReplay).toHaveBeenCalledOnce();
  },
};

export const ReplayAvailable = {
  args: {
    ...winnerProps,
    onWatchReplay: fn(),
    replayStatus: "ready",
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onWatchReplay.mockClear();
    await userEvent.click(
      await screen.findByRole("button", { name: "Replay" })
    );
    expect(args.onWatchReplay).toHaveBeenCalledOnce();
  },
};

export const ActionPending = {
  args: {
    ...winnerProps,
    showMatchAlertResume: true,
    matchAlertResumeChecked: true,
    matchAlertResumePending: true,
    onWatchReplay: fn(),
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Returning…" })
      ).toBeDisabled()
    );
    expect(screen.getByRole("button", { name: "Replay" })).toBeDisabled();
    screen.getAllByRole("button", { name: "Close" }).forEach((button) => {
      expect(button).toBeDisabled();
    });
  },
};

export const DenseResumeError = {
  args: {
    ...winnerProps,
    subtitle: "Victory Points: 10",
    scoreboard: [
      { id: "0", name: "TheLongestHarbourTraderName28", color: "orange", vp: 10, isWinner: true },
      { id: "1", name: "AnotherLongHarbourTraderName", color: "teal", vp: 8 },
      { id: "2", name: "RoadScholar", color: "purple", vp: 7 },
      { id: "3", name: "HarbourFox", color: "green", vp: 6 },
    ],
    showMatchAlertResume: true,
    matchAlertResumeError: "Match alerts could not be resumed. Try again or continue without alerts.",
    onWatchReplay: fn(),
    onRetryMatchAlertResume: fn(),
    onContinueWithoutMatchAlerts: fn(),
  },
};

export const Mobile = {
  args: {
    ...loserProps,
    onWatchReplay: fn(),
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
