import { fn } from "@storybook/test";
import { PendingFriendChallengeScreen } from "./PendingFriendChallengeScreen";

const challengeState = {
  status: "pending",
  inviterSeatId: "0",
  inviteeSeatId: "1",
  expiresAt: "2099-01-01T00:00:00.000Z",
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
  },
};

export default meta;

export const Inviter = { args: { mode: "inviter" } };

export const Invitee = { args: { mode: "invitee" } };

export const InviteeJoining = {
  args: { mode: "invitee", joinPending: true },
};

export const Expired = { args: { mode: "expired" } };

export const ChallengeError = {
  args: { mode: "invitee", error: "This challenge is no longer available." },
};
