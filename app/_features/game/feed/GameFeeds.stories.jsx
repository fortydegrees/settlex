import React, { useState } from "react";
import { flushSync } from "react-dom";
import { expect, fireEvent, userEvent, waitFor, within } from "@storybook/test";
import { ChatPanel } from "./ChatPanel";
import { GameLogPanel } from "./GameLogPanel";
import { Button } from "../../../ui/Button";

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
const frameClassName = "settlehex-ui-hud flex h-[26rem] min-h-0 flex-col overflow-hidden select-text";
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
    await expect(within(canvasElement).queryByRole("textbox", { name: "Chat message" })).not.toBeInTheDocument();
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

// Exercise the production send-to-scroll bridge after the reader scrolls away.
export const SendingResumesScrolling = {
  render: () => <ChatFixture initialMessages={Array.from({ length: 30 }, (_, index) => ({
    id: `history-${index}`,
    sender: String(index % 2),
    payload: `Earlier message ${index + 1}`,
  }))} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const composer = canvas.getByRole("textbox", { name: "Chat message" });
    const transcript = canvasElement.querySelector(".chat-panel-scroll");
    await waitFor(() => expect(transcript.scrollTop).toBeGreaterThan(0));

    fireEvent.wheel(transcript, { deltaY: -1000 });
    transcript.scrollTop = 0;
    await userEvent.type(composer, "Back at the latest message{enter}");

    await waitFor(() => expect(canvas.getByText("Back at the latest message")).toBeVisible());
    await expect(composer).toHaveValue("");
    await waitFor(() => expect(
      transcript.scrollTop + transcript.clientHeight
    ).toBeGreaterThanOrEqual(transcript.scrollHeight - 1));
  },
};

function FeedMotionFixture() {
  const [chat, setChat] = useState(Array.from({ length: 25 }, (_, i) => ({
    id: `history-${i}`, sender: String(i % 2), payload: `Earlier message ${i + 1}: considering the wheat port.`,
  })));
  const [log, setLog] = useState(logEntries);
  const [replay, setReplay] = useState(false);
  const [active, setActive] = useState('roll');
  return <div className="mx-auto max-w-5xl p-ui-4">
    <div className="mb-ui-4 flex flex-wrap gap-ui-2">
      <Button onClick={() => setChat((rows) => [...rows, { id: `live-${rows.length}`, sender: '1', payload: 'New live message' }])}>Receive message</Button>
      <Button onClick={() => setChat((rows) => [...rows, ...[1, 2].map((n) => ({ id: `batch-${rows.length}-${n}`, sender: '0', payload: `Loaded history ${n}` }))])}>Load history batch</Button>
      <Button onClick={() => setReplay((value) => !value)}>{replay ? 'Use live log' : 'Use replay log'}</Button>
      <Button onClick={() => setLog((rows) => [...rows, { id: `roll-${rows.length}`, type: 'roll', actorId: '0', data: { dice: [2, 5] } }])}>Append log row</Button>
      <Button onClick={() => setLog((rows) => rows.slice(0, -1))}>Seek backward</Button>
    </div>
    <div className="grid gap-ui-4 md:grid-cols-2">
      <ChatPanel playerID="0" playerMap={playerMap} themeId="classic" chatMessages={chat}
        sendChatMessage={(payload) => setChat((rows) => [...rows, { id: `sent-${rows.length}`, sender: '0', payload }])}
        panelClassName={frameClassName} />
      <GameLogPanel entries={log} playerMap={playerMap} themeId="classic" rootClassName="w-full"
        arrivalMode={replay ? 'quiet' : 'live'} activeEntryKey={replay ? active : null}
        onEntrySelect={replay ? setActive : undefined} panelClassName={frameClassName} />
    </div>
  </div>;
}

export const SharedMotionUpdates = {
  render: () => <FeedMotionFixture />,
  play: async ({ canvasElement }) => {
    delete canvasElement.dataset.motionContract;
    const screen = within(canvasElement);
    const arrivals = () => canvasElement.querySelectorAll('[data-feed-arrival="true"]');
    expect(arrivals()).toHaveLength(0);
    const viewport = canvasElement.querySelector('.chat-panel-scroll');
    // Simulate reading earlier messages, including the existing manual-scroll signal.
    viewport.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -400 }));
    viewport.scrollTo({ top: 0, behavior: 'instant' });
    await userEvent.click(screen.getByRole('button', { name: 'Receive message' }));
    expect(arrivals()).toHaveLength(1);
    expect(viewport.scrollTop).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Load history batch' }));
    expect(arrivals()).toHaveLength(0);
    expect(viewport.scrollTop).toBe(0);
    await userEvent.click(screen.getByRole('button', { name: 'Append log row' }));
    expect(arrivals()).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Use replay log' }));
    expect(arrivals()).toHaveLength(0);
    await userEvent.click(screen.getByRole('button', { name: 'Seek backward' }));
    const replayViewport = canvasElement.querySelector('.game-log-scroll');
    replayViewport.scrollTo({ top: 0, behavior: 'instant' });
    await userEvent.click(screen.getByRole('button', { name: 'Append log row' }));
    expect(arrivals()).toHaveLength(0);
    // History/replay does not follow the live tail, even without a wheel pause.
    expect(replayViewport.scrollTop).toBe(0);
    const robber = screen.getByRole('button', { name: /moved the robber/ });
    await userEvent.click(robber);
    expect(robber).toHaveAttribute('aria-current', 'step');
    expect(arrivals()).toHaveLength(0);
    canvasElement.dataset.motionContract = 'passed';
  },
};

const winningTurnEntries = [
  { id: 'earlier-roll', type: 'roll', actorId: '1', turn: 11, data: { dice: [2, 3] } },
  { id: 'earlier-end', type: 'turn:end', actorId: '1', turn: 11 },
  { id: 'knight', type: 'dev:play', actorId: '0', turn: 12, data: { cardType: 'knight' } },
  { id: 'last-roll', type: 'roll', actorId: '0', turn: 12, data: { dice: [6, 5] } },
  { id: 'last-trade', type: 'trade:maritime', actorId: '0', turn: 12, data: { give: { Sheep: 2 }, receive: { Wheat: 1 } } },
  { id: 'last-buy', type: 'dev:buy', actorId: '0', turn: 12, data: { cardType: 'victoryPoint' } },
  { id: 'imported-end', type: 'turn:end', actorId: '0', turn: 12 },
  { id: 'win', type: 'game:over', actorId: '0', turn: 13, data: { winnerId: '0' } },
  { id: 'trailing-end', type: 'turn:end', actorId: '0', turn: 13 },
];
function TurnLogFixture({ phone = false, entries = winningTurnEntries, initialActive = 'last-buy' }) {
  const [active, setActive] = useState(initialActive);
  return <div className="settlehex-game-screen select-none mx-auto p-ui-4" style={{ maxWidth: phone ? 390 : 480 }}>
    <GameLogPanel entries={entries} playerMap={playerMap} themeId="classic"
      activeEntryKey={active} onEntrySelect={setActive} rootClassName="w-full"
      panelClassName={frameClassName} />
    <p role="status" className="mt-ui-3 type-caption text-ink-secondary">Selected event: {active}</p>
  </div>;
}
const verifyTurnLog = async ({ canvasElement }) => {
  delete canvasElement.dataset.logContract;
  const screen = within(canvasElement);
  const headers = canvasElement.querySelectorAll('.game-log-turn');
  expect(headers).toHaveLength(2);
  headers.forEach((header) => expect(header.closest('[role="button"]')).toBeNull());
  expect(getComputedStyle(headers[0]).userSelect).toBe('none');
  const win = screen.getByRole('button', { name: /wins!/ });
  const trade = screen.getByRole('button', { name: /traded/ });
  expect(getComputedStyle(trade).cursor).toBe('text');
  expect(getComputedStyle(trade).userSelect).toBe('text');
  // Simulate the click delivered at the end of a text-selection drag.
  const selection = canvasElement.ownerDocument.getSelection();
  const range = canvasElement.ownerDocument.createRange();
  range.selectNodeContents(trade);
  selection.removeAllRanges();
  selection.addRange(range);
  flushSync(() => {
    trade.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  });
  expect(screen.getByRole('status')).toHaveTextContent('Selected event: last-buy');
  selection.removeAllRanges();
  await userEvent.click(trade);
  expect(screen.getByRole('status')).toHaveTextContent('Selected event: last-trade');
  win.focus();
  await userEvent.keyboard('{Enter}');
  expect(win).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('status')).toHaveTextContent('Selected event: win');
  canvasElement.dataset.logContract = 'passed';
};
export const TurnLabelsAndCopyableReplay = { render: () => <TurnLogFixture />, play: verifyTurnLog };
export const TurnLabelsPhone = { render: () => <TurnLogFixture phone />, play: verifyTurnLog };

// Overflowing history exposes both the mid-scroll clipping edge and the final row.
export const LongTurnLog = {
  render: () => <TurnLogFixture initialActive={null} entries={[
    ...Array.from({ length: 10 }, (_, index) => {
      const actorId = String(index % 2);
      const turn = index + 1;
      return [
        { id: `history-roll-${turn}`, type: 'roll', actorId, turn, data: { dice: [2, 4] } },
        { id: `history-build-${turn}`, type: 'build:settlement', actorId, turn },
        { id: `history-end-${turn}`, type: 'turn:end', actorId, turn },
      ];
    }).flat(),
    ...winningTurnEntries,
  ]} />,
};

const placementTiles = [
  { type: 'Land', tile: { id: 1, resource: 'Wheat', number: 6, nodes: { N: 10, S: 11, E: 12 } } },
  { type: 'Land', tile: { id: 2, resource: 'Ore', number: 9, nodes: { N: 10, S: 11 } } },
  { type: 'Land', tile: { id: 3, resource: 'Desert', number: null, nodes: { N: 10 } } },
];
const placementEntries = [
  { id: 'setup-three', type: 'build:settlement', actorId: '0', turn: 1, data: { nodeId: 10, initialPlacement: true } },
  { id: 'setup-end-one', type: 'turn:end' },
  { id: 'setup-two', type: 'build:settlement', actorId: '1', turn: 2, data: { nodeId: 11, initialPlacement: true } },
  { id: 'setup-end-two', type: 'turn:end' },
  { id: 'setup-one', type: 'build:settlement', actorId: '1', turn: 3, data: { nodeId: 12, initialPlacement: true } },
  { id: 'main-phase', type: 'phase:main' },
  { id: 'main-roll', type: 'roll', actorId: '0', turn: 4, data: { dice: [2, 4] } },
];
export const PlacementPhases = {
  render: () => <div className="settlehex-game-screen select-none mx-auto max-w-sm p-ui-4">
    <GameLogPanel entries={placementEntries} boardTiles={placementTiles} playerMap={playerMap} themeId="emoji"
      rootClassName="w-full" panelClassName="settlehex-ui-hud flex h-[38rem] flex-col overflow-hidden select-text" />
  </div>,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    expect(screen.getByText('Placement phase')).toBeVisible();
    expect(screen.getByText('Main game')).toBeVisible();
    expect(screen.getAllByRole('img', { name: /tile/ })).toHaveLength(6);
    expect(screen.getByRole('img', { name: 'Desert tile' })).toBeVisible();
    for (const marker of canvasElement.querySelectorAll('.game-log-phase')) {
      expect(marker.closest('[role="button"]')).toBeNull();
      expect(getComputedStyle(marker).userSelect).toBe('none');
    }
    canvasElement.dataset.phaseContract = 'passed';
  },
};
export const PlacementBeforeFirstMove = {
  render: () => stage(<GameLogPanel phase="placement" themeId="emoji" rootClassName="w-full" panelClassName={frameClassName} />),
};
