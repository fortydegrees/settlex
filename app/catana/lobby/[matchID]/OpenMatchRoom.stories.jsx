import { useState } from "react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { OpenMatchRoom } from "./OpenMatchRoom";

const openMatch = {
  matchID: "open-room-42",
  gameName: "catan",
  players: [
    {
      id: 0,
      name: "HarbourFox",
      data: { participantType: "human", color: "orange" },
    },
    { id: 1, name: "" },
    { id: 2, name: "" },
    { id: 3, name: "" },
  ],
};

const callbacks = {
  onFillBots: fn(),
  onJoin: fn((event) => event.preventDefault()),
  onPlayerNameChange: fn(),
  onRefresh: fn(),
  onSeatChange: fn(),
  onSpectate: fn(),
};

function OpenMatchRoomHarness(args) {
  const [playerName, setPlayerName] = useState(args.playerName);
  const [playerID, setPlayerID] = useState(args.playerID);

  return (
    <OpenMatchRoom
      {...args}
      playerName={playerName}
      playerID={playerID}
      onPlayerNameChange={(nextName) => {
        setPlayerName(nextName);
        args.onPlayerNameChange(nextName);
      }}
      onSeatChange={(nextPlayerID) => {
        setPlayerID(nextPlayerID);
        args.onSeatChange(nextPlayerID);
      }}
    />
  );
}

const meta = {
  title: "Composed Surfaces/Lobby & Matchmaking/Open Match Room",
  component: OpenMatchRoom,
  parameters: { layout: "fullscreen" },
  render: (args) => <OpenMatchRoomHarness {...args} />,
  args: {
    matchID: openMatch.matchID,
    gameServer: "https://game.settlehex.test",
    match: openMatch,
    openSeats: openMatch.players.slice(1),
    hasTakenSeats: true,
    playerName: "BoldTraderYM",
    playerID: "1",
    isLoadingMatch: false,
    joinPending: false,
    botFillPending: false,
    error: "",
    ...callbacks,
  },
  argTypes: {
    match: { control: false },
    openSeats: { control: false },
    hasTakenSeats: { control: false },
    playerName: { control: false },
    playerID: { control: false },
    isLoadingMatch: { control: false },
    joinPending: { control: false },
    botFillPending: { control: false },
    error: { control: false },
  },
};

export default meta;

export const OpenSeats = {
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onPlayerNameChange.mockClear();
    args.onSeatChange.mockClear();
    args.onJoin.mockClear();
    await userEvent.clear(screen.getByRole("textbox", { name: "Player name" }));
    await userEvent.type(
      screen.getByRole("textbox", { name: "Player name" }),
      "MapleMason"
    );
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Seat" }),
      "2"
    );
    await userEvent.click(screen.getByRole("button", { name: "Join & Play" }));
    expect(args.onPlayerNameChange).toHaveBeenLastCalledWith("MapleMason");
    expect(args.onSeatChange).toHaveBeenCalledWith("2");
    expect(args.onJoin).toHaveBeenCalledOnce();
  },
};

export const Loading = {
  args: {
    match: null,
    openSeats: [],
    hasTakenSeats: false,
    playerID: "",
    isLoadingMatch: true,
  },
};

export const LongNamesAndServer = {
  args: {
    matchID: "room-with-a-long-generated-identifier",
    gameServer: "https://game.settlehex.test/a-long-deployment-server-path",
    match: {
      ...openMatch,
      players: [
        { ...openMatch.players[0], name: "TheLongestHarbourTraderName28" },
        ...openMatch.players.slice(1),
      ],
    },
  },
};

export const JoinPending = {
  args: {
    joinPending: true,
  },
};

export const BotFillPending = {
  args: {
    botFillPending: true,
  },
};

export const JoinError = {
  args: {
    error: "That seat was just taken. Refresh and choose another.",
  },
};
