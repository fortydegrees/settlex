import { expect, fn, waitFor, within } from "@storybook/test";
import { matchAlertFixtures } from "../dev/storybook/accountFixtures";
import { SearchingModal } from "./SearchingModal";

const callbacks = {
  onMatchAlertAction: fn(),
  onCancel: fn(),
  onPlayPuffer: fn(),
};

const searching = { phase: "searching", startedAt: 1 };

const meta = {
  title: "Composed Surfaces/Lobby & Matchmaking/Search & Rescue",
  component: SearchingModal,
  parameters: { layout: "fullscreen" },
  args: {
    searchState: searching,
    searchElapsedSeconds: 5,
    matchAlertDisplay: matchAlertFixtures.off,
    matchAlertLoading: false,
    matchAlertError: "",
    isPufferTransitionPending: false,
    ...callbacks,
  },
  argTypes: {
    searchState: { control: false },
    searchElapsedSeconds: { control: false },
    matchAlertDisplay: { control: false },
    matchAlertLoading: { control: false },
    matchAlertError: { control: false },
    isPufferTransitionPending: { control: false },
  },
};

export default meta;

export const FindingTable = {
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
      expect(screen.getByText("Finding a table")).toBeVisible();
      expect(screen.getByText("1v1 · 0:05")).toBeVisible();
      expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    });
  },
};

export const AlertRescueAvailable = {
  args: { searchState: searching, searchElapsedSeconds: 15 },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
      expect(screen.getByText(/SettleHex is still in beta/)).toBeVisible();
      expect(screen.getByText("Match alerts")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Keep waiting" })
      ).toBeVisible();
    });
  },
};

export const PufferRescueAvailable = {
  args: { searchState: searching, searchElapsedSeconds: 35 },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
      expect(screen.getByText("Match alerts")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Keep waiting" })
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Play Puffer" })
      ).toBeVisible();
    });
  },
};

export const MatchFound = {
  args: {
    searchState: { phase: "matchFound", startedAt: 1 },
    searchElapsedSeconds: 36,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
      expect(screen.getByText("Match found")).toBeVisible();
      expect(screen.getAllByText("Loading board...")).not.toHaveLength(0);
    });
  },
};

export const StartingPuffer = {
  args: {
    searchState: null,
    searchElapsedSeconds: 0,
    isPufferTransitionPending: true,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
      expect(screen.getByText("Starting Puffer")).toBeVisible();
      expect(screen.getByText("Setting up a bot duel...")).toBeVisible();
    });
  },
};
