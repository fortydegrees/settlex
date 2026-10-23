import { ReplayPageClient } from "./ReplayPageClient";
import { PostgameGameBoard } from "./PostgameGameBoard";
import { buildNotationReplayFile } from "../../../lib/replays/notationReplay";
import { MatchAlertContext } from "../matches/alerts/MatchAlertProvider";
import record from "../../../docs/notation/examples/settlex-complete.han.json";
import { expect, userEvent, waitFor, within } from "@storybook/test";

const participants = ["HarbourFox", "BrickAndMortar", "RoadScholar"].map((name, index) => ({
  seatId: String(index),
  usernameSnapshot: name,
  avatarColorSnapshot: ["sky", "orange", "green"][index],
  avatarEmojiSnapshot: ["🦊", "🧱", "🛣️"][index],
  result: index === 0 ? "win" : "loss",
}));
const replay = {
  match: { replayId: "notation-example", bgioMatchId: "notation-example", playerCount: 3, winnerSeatId: "0" },
  participants,
  chatMessages: [],
  isComplete: true,
  source: { kind: "notation" },
};

const meta = {
  title: "Composed Surfaces/Postgame & Replay/Notation Archive",
  parameters: { layout: "fullscreen" },
  decorators: [(Story) => <MatchAlertContext.Provider value={{}}><Story /></MatchAlertContext.Provider>],
};

export default meta;

// The actual archive page client expands the compact record, then renders the
// real board, timeline, log and perspective controls. No recording importer.
export const Complete = {
  render: () => <ReplayPageClient replay={replay} record={record} initialPerspectivePlayerID="0" />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    expect(screen.queryByRole("img", { name: /Die showing/ })).not.toBeInTheDocument();
    for (let index = 0; index < 13; index += 1) {
      await userEvent.click(screen.getByRole("button", { name: "Next event", exact: true }));
    }
    await waitFor(() => expect(screen.getByRole("img", { name: "Die showing 4" })).toBeVisible());
    expect(screen.getByRole("img", { name: "Die showing 3" })).toBeVisible();
    screen.getByLabelText("BrickAndMortar hand").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("slider", { name: "Seek through the match" })).toHaveValue("13");
  },
};

export const Middle = {
  render: () => <ReplayPageClient replay={replay} record={record} initialFrameIndex={1200} initialPerspectivePlayerID="0" />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    if (screen.queryByRole("button", { name: "Open replay tray" })) {
      await userEvent.click(screen.getByRole("button", { name: "Open replay tray" }));
    }
    expect(await screen.findByRole("slider", { name: "Seek through the match" })).toHaveValue("1200");
  },
};

export const Terminal = {
  render: () => <ReplayPageClient replay={replay} record={record} initialFrameIndex={2541} initialPerspectivePlayerID="0" />,
};

const prefix = { ...record, coverage: "prefix", result: null, actions: record.actions.slice(0, 12) };
delete prefix.annotations;
const prefixPayload = buildNotationReplayFile(prefix);
export const SetupPrefix = {
  render: () => <PostgameGameBoard initialReplayPayload={prefixPayload} initialFrameIndex={12} />,
};
