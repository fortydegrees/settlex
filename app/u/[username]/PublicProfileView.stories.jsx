import { expect, userEvent, within } from "@storybook/test";
import { PublicProfileView } from "./PublicProfileView";

const account = {
  id: "acct_harbour_fox",
  currentUsername: "HarbourFox",
  avatarEmoji: "🦊",
  avatarColor: "#fb923c",
  createdAt: "2026-04-01T12:00:00.000Z",
};

const recentMatches = [
  {
    archivedMatchId: "archived-harbour-1",
    replayId: "replay-harbour-1",
    bgioMatchId: "settlehex-harbour-1",
    finishedAt: "2026-07-24T18:30:00.000Z",
    gameName: "Settlehex",
    playerCount: 2,
    result: "win",
  },
  {
    archivedMatchId: "archived-harbour-2",
    replayId: "replay-harbour-2",
    bgioMatchId: "settlehex-harbour-2",
    finishedAt: "2026-07-20T20:15:00.000Z",
    gameName: "Settlehex",
    playerCount: 4,
    result: "loss",
  },
];

const emptyProfile = {
  account,
  summary: {
    totalGames: 0,
    wins: 0,
    losses: 0,
  },
  recentMatches: [],
};

const historyProfile = {
  account,
  summary: {
    totalGames: 7,
    wins: 4,
    losses: 3,
  },
  recentMatches,
};

const meta = {
  title: "Composed Surfaces/Account & Identity/Public Profile",
  component: PublicProfileView,
  parameters: { layout: "fullscreen" },
  args: {
    profile: emptyProfile,
  },
  argTypes: {
    profile: { control: false },
  },
};

export default meta;

export const EmptyRecentMatches = {};

export const LongUsername = {
  args: {
    profile: {
      ...historyProfile,
      account: { ...account, currentUsername: "TheLongestHarbourTraderName28" },
    },
  },
};

export const RecentMatchHistory = {
  args: {
    profile: historyProfile,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    const replayLink = screen.getAllByRole("link", {
      name: "Watch replay",
    })[0];
    replayLink.addEventListener(
      "click",
      (event) => event.preventDefault(),
      { once: true }
    );
    await userEvent.click(replayLink);
    expect(replayLink).toHaveFocus();
    expect(replayLink).toHaveAttribute("href", "/g/settlehex-harbour-1");
  },
};

export const LongHistoryLabels = {
  args: {
    profile: {
      ...historyProfile,
      account: { ...account, currentUsername: "TheLongestHarbourTraderName28" },
      recentMatches: recentMatches.map((match) => ({
        ...match,
        gameName: "SettleHex — a long archived match label for a crowded history row",
      })),
    },
  },
};

export const Mobile = {
  args: {
    profile: historyProfile,
  },
  parameters: {
    viewport: { defaultViewport: "catanaMobile" },
  },
};
