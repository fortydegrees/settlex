import { expect, fn, waitFor, within } from "@storybook/test";
import { PendingFriendChallengeScreen } from "./PendingFriendChallengeScreen";

const STORY_NOW_MS = Date.parse("2026-07-29T12:00:00.000Z");

const challengeState = {
  status: "pending",
  inviterSeatId: "0",
  inviteeSeatId: "1",
  expiresAt: "2026-07-29T12:05:00.000Z",
};

const match = {
  players: [
    { id: 0, name: "HarbourFox" },
    { id: 1, name: null },
  ],
};

const baseArgs = {
  matchID: "storybook-friend-duel",
  challengeUrl: "/g/storybook-friend-duel",
  match,
  challengeState,
  playerName: "BoldTraderYM",
  setPlayerName: fn(),
  joinPending: false,
  cancelPending: false,
  isLoadingMatch: false,
  error: "",
  nowMs: STORY_NOW_MS,
  onJoin: fn((event) => event.preventDefault()),
  onCancel: fn(),
  onRefresh: fn(),
  onBackToLobby: fn(),
};

const meta = {
  title: "Composed Surfaces/Lobby & Matchmaking/Friend Challenge",
  component: PendingFriendChallengeScreen,
  parameters: { layout: "fullscreen" },
  args: baseArgs,
  argTypes: {
    mode: { control: false },
    match: { control: false },
    challengeState: { control: false },
    joinPending: { control: false },
    cancelPending: { control: false },
    isLoadingMatch: { control: false },
    error: { control: false },
    nowMs: { control: false },
  },
};

export default meta;

export const Inviter = { args: { mode: "inviter" } };

const expectStableCountdown = async (canvasElement) => {
  const screen = within(canvasElement.ownerDocument.body);
  await waitFor(() =>
    expect(
      screen.getByText("This challenge expires in 5:00.")
    ).toBeVisible()
  );
};

export const Invitee = {
  args: { mode: "invitee" },
  play: async ({ canvasElement }) => expectStableCountdown(canvasElement),
};

export const InviteeJoining = {
  args: { mode: "invitee", joinPending: true },
  play: async ({ canvasElement }) => expectStableCountdown(canvasElement),
};

export const Expired = { args: { mode: "expired" } };

export const ChallengeError = {
  args: { mode: "invitee", error: "This challenge is no longer available." },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(
        screen.getByText("This challenge is no longer available.")
      ).toBeVisible()
    );
    expect(
      screen.queryByText(/This challenge expires in/)
    ).not.toBeInTheDocument();
  },
};
