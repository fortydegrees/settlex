import React from "react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { MatchAlertDialog } from "./MatchAlertDialog";

const openAlert = {
  status: "open",
  matchID: "storybook-match",
  seekerName: "HarbourFox",
};
const staleAlert = { ...openAlert, status: "stale" };
const errorAlert = { ...openAlert, status: "error" };

const meta = {
  title: "Composed Surfaces/Alerts & Recovery/Match Alert Dialog",
  component: MatchAlertDialog,
  parameters: { layout: "fullscreen" },
  args: {
    alert: openAlert,
    currentGame: null,
    onClose: fn(),
    onJoiningChange: fn(),
  },
  argTypes: {
    alert: { control: false },
    currentGame: { control: false },
  },
};

export default meta;

const dismissWithoutJoining = async ({ canvasElement, args, title }) => {
  const screen = within(canvasElement.ownerDocument.body);
  args.onClose.mockClear();
  args.onJoiningChange.mockClear();
  await waitFor(() =>
    expect(screen.getByRole("dialog", { name: title })).toBeVisible()
  );
  await userEvent.click(screen.getByRole("button", { name: "Not now" }));
  expect(args.onClose).toHaveBeenCalledOnce();
  expect(args.onJoiningChange).not.toHaveBeenCalled();
};

export const CheckingSeat = {
  args: {
    alert: { ...openAlert, status: "checking", seekerName: null },
  },
  play: (context) =>
    dismissWithoutJoining({
      ...context,
      title: "Checking that table…",
    }),
};

export const JoinOpenSeat = {
  play: (context) =>
    dismissWithoutJoining({
      ...context,
      title: "HarbourFox is looking for a duel",
    }),
};

export const LeaveBotAndJoin = {
  args: {
    currentGame: {
      matchID: "storybook-bot-match",
      opponentType: "bot",
    },
  },
  play: async (context) => {
    const screen = within(context.canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(
        screen.getByText("Leave your bot game and join HarbourFox?")
      ).toBeVisible()
    );
    await dismissWithoutJoining({
      ...context,
      title: "HarbourFox is looking for a duel",
    });
  },
};

export const TableAlreadyFilled = {
  args: { alert: staleAlert },
  play: (context) =>
    dismissWithoutJoining({
      ...context,
      title: "That table has already filled",
    }),
};

export const JoinFailed = {
  args: { alert: errorAlert },
  play: (context) =>
    dismissWithoutJoining({
      ...context,
      title: "We couldn’t join that table",
    }),
};

function DismissalFixture() {
  const [alert, setAlert] = React.useState(openAlert);
  return <MatchAlertDialog alert={alert} onClose={() => setAlert(null)} />;
}
export const DismissalLifecycle = {
  render: () => <DismissalFixture />,
  play: async ({canvasElement}) => {
    const screen = within(canvasElement.ownerDocument.body);
    const dialog = await screen.findByRole('dialog',{name:'HarbourFox is looking for a duel'});
    await userEvent.click(screen.getByRole('button',{name:'Not now'}));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('data-ending-style');
      expect(dialog).toHaveAccessibleName('HarbourFox is looking for a duel');
    }
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};
