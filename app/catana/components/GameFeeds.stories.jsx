import React, { useState } from "react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { ChatPanel } from "./ChatPanel";
import { GameLogPanel } from "./GameLogPanel";

const meta = {
  title: "Composed Surfaces/Gameplay/Game Feeds",
  parameters: { layout: "fullscreen" },
};

export default meta;

const playerMap = {
  "0": { name: "HarbourFox", emoji: "🦊", color: "blue" },
  "1": { name: "MountainBuilder", emoji: "🐻", color: "rose" },
};
const messages = [
  { id: "m1", sender: "0", payload: "Good luck!" },
  { id: "m2", sender: "1", payload: "Thanks! That wheat port could be useful later." },
];
const logEntries = [
  { id: "settlement", type: "build:settlement", actorId: "0" },
  { id: "resources", type: "resource:gain", actorId: "0", data: { resources: { Wood: 1, Wheat: 2, Ore: 1 } } },
  { id: "phase", type: "phase:main" },
  { id: "roll", type: "roll", actorId: "1", data: { dice: [3, 4] } },
  { id: "robber", type: "robber:move", actorId: "1", data: { tileResource: "Wood", tileNumber: 11 } },
  { id: "trade", type: "trade:maritime", actorId: "0", data: { give: { Wheat: 2 }, receive: { Ore: 1 } } },
  { id: "dev", type: "dev:play", actorId: "0", data: { cardType: "yearOfPlenty" } },
  { id: "disconnect", type: "server:disconnect", data: { playerId: "1" } },
  { id: "reconnect", type: "server:reconnect", data: { playerId: "1" } },
];

// Only fixture transport/state is local; panels, formatting and scroll behavior
// are the production owners. Surrounding chrome is cataloged in GameChrome;
// integrated placement and board coexistence are checked in the sandbox.
const frameClassName = "settlex-ui-hud flex h-[26rem] min-h-0 flex-col overflow-hidden select-text";
const stage = (children) => (
  <div className="mx-auto w-full max-w-md p-ui-4 sm:p-ui-6">{children}</div>
);

function ChatFixture({ initialMessages = messages, readOnly = false, players = playerMap }) {
  const [chatMessages, setChatMessages] = useState(initialMessages);
  return stage(
    <ChatPanel
      playerID={readOnly ? null : "0"}
      playerMap={players}
      themeId="classic"
      chatMessages={chatMessages}
      sendChatMessage={readOnly ? undefined : (payload) => setChatMessages((current) => [
        ...current,
        { id: `local-${current.length}`, sender: "0", payload },
      ])}
      panelClassName={frameClassName}
    />
  );
}

export const LiveChat = {
  render: () => <ChatFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByRole("textbox", { name: "Chat message" });
    await userEvent.type(composer, "See you at the wheat port!{enter}");
    await waitFor(() => expect(canvas.getByText("See you at the wheat port!")).toBeVisible());
    await expect(composer).toHaveValue("");
  },
};

export const EmptyChat = {
  render: () => <ChatFixture initialMessages={[]} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No messages yet.")).toBeVisible();
    await expect(canvas.getByRole("textbox", { name: "Chat message" })).toBeEnabled();
  },
};

export const ReadOnlyChat = {
  render: () => <ChatFixture readOnly />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox", { name: "Chat message" })).toBeDisabled();
  },
};

export const LongTranscript = {
  render: () => <ChatFixture
    players={{ ...playerMap, "1": { ...playerMap["1"], name: "MountainBuilderWithoutSpaces" } }}
    initialMessages={Array.from({ length: 18 }, (_, index) => ({
      id: `long-${index}`,
      sender: String(index % 2),
      payload: index % 3 === 0
        ? "A".repeat(280)
        : "I was considering the wheat port, but the road beside the forest also looks promising. Which way will you go?",
    }))}
  />,
};

export const LogEntries = {
  render: () => stage(<GameLogPanel
    rootClassName="w-full"
    panelClassName={frameClassName}
    entries={logEntries}
    playerMap={playerMap}
    themeId="classic"
  />),
};

function SelectableLogFixture() {
  const [activeEntryKey, setActiveEntryKey] = useState("roll");
  return stage(<>
    <GameLogPanel
      rootClassName="w-full"
      panelClassName={frameClassName}
      entries={logEntries}
      activeEntryKey={activeEntryKey}
      onEntrySelect={setActiveEntryKey}
      playerMap={playerMap}
      themeId="classic"
    />
    <p className="mt-ui-3 type-caption text-ink-secondary" role="status">Selected event: {activeEntryKey}</p>
  </>);
}

export const SelectableReplayLog = {
  render: () => <SelectableLogFixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const robber = canvas.getByRole("button", { name: /moved the robber/ });
    await userEvent.click(robber);
    await expect(robber).toHaveAttribute("aria-current", "step");
    const trade = canvas.getByRole("button", { name: /traded/ });
    trade.focus();
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByRole("status")).toHaveTextContent("Selected event: trade");
    robber.focus();
    await userEvent.keyboard(" ");
    await expect(canvas.getByRole("status")).toHaveTextContent("Selected event: robber");
  },
};
