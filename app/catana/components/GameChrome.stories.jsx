import React, { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Button } from "../../ui/Button";
import { MobileMatchMenu } from "./MobileMatchMenu";
import { MobileMetaDrawer } from "./MobileMetaDrawer";
import { DesktopMetaDock } from "./LeftMetaRail";
import { ChatPanel } from "./ChatPanel";
import { GameLogPanel } from "./GameLogPanel";

const meta = {
  title: "Composed Surfaces/Gameplay/Game Chrome",
  parameters: { layout: "fullscreen" },
};
export default meta;

const players = {
  "0": { name: "HarbourFox", emoji: "🦊", color: "blue" },
  "1": { name: "MountainBuilderWithoutSpaces", emoji: "🐻", color: "rose" },
};
const entries = [
  { id: "phase", type: "phase:main" },
  { id: "roll", type: "roll", actorId: "0", data: { dice: [3, 4] } },
  { id: "resources", type: "resource:gain", actorId: "1", data: { resources: { Wood: 1, Wheat: 2 } } },
  { id: "build", type: "build:settlement", actorId: "0" },
];
const messages = [
  { id: "m1", sender: "0", payload: "Good luck!" },
  { id: "m2", sender: "1", payload: "I was considering the wheat port, but the road beside the forest also looks promising." },
];

function MenuFixture({ initialMuted = false, ...args }) {
  const [muted, setMuted] = useState(initialMuted);
  return (
    <div className="flex justify-end p-ui-4">
      <MobileMatchMenu {...args} isMuted={muted} onToggleMute={() => {
        setMuted((value) => !value);
        args.onToggleMute?.();
      }} />
    </div>
  );
}

const menuArgs = () => ({
  canResign: true,
  onToggleMute: fn(),
  onOpenGameRules: fn(),
  onOpenGameSettings: fn(),
  onResign: fn(),
});

export const MobileMenu = {
  args: menuArgs(),
  render: (args) => <MenuFixture {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    for (const callback of [args.onToggleMute, args.onOpenGameRules, args.onOpenGameSettings, args.onResign]) callback.mockClear();
    const open = () => userEvent.click(screen.getByRole("button", { name: "Open match menu" }));
    await open();
    await userEvent.click(await screen.findByRole("button", { name: "Mute audio" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Game rules" })).not.toBeInTheDocument());
    expect(args.onToggleMute).toHaveBeenCalledOnce();
    await open();
    await waitFor(() => expect(screen.getByRole("button", { name: "Unmute audio" })).toBeVisible());
    for (const [name, callback] of [
      ["Game rules", args.onOpenGameRules],
      ["Settings", args.onOpenGameSettings],
      ["Resign match", args.onResign],
    ]) {
      await userEvent.click(await screen.findByRole("button", { name }));
      await waitFor(() => expect(screen.queryByRole("button", { name: "Game rules" })).not.toBeInTheDocument());
      expect(callback).toHaveBeenCalledOnce();
      await open();
    }
    // Leave the real menu open for visual review; all callbacks above are local spies.
  },
};

export const MobileMenuSpectatorOrReplay = {
  args: { ...menuArgs(), canResign: false, initialMuted: true },
  render: (args) => <MenuFixture {...args} />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole("button", { name: "Open match menu" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unmute audio" })).toBeVisible());
    await expect(screen.queryByRole("button", { name: "Resign match" })).not.toBeInTheDocument();
  },
};

const contentClassName = "flex h-full min-h-0 flex-col overflow-hidden bg-transparent select-text";

function DrawerFixture({ readOnly = false }) {
  const [activePanel, setActivePanel] = useState(null);
  const [chatMessages, setChatMessages] = useState(messages);
  const panels = [
    { id: "log", label: "Game Log", renderMobile: () => (
      <GameLogPanel entries={entries} playerMap={players} themeId="classic"
        rootClassName="h-full w-full" panelClassName={contentClassName} headerClassName="sr-only" />
    ) },
    { id: "chat", label: "Chat", renderMobile: () => (
      <ChatPanel playerID={readOnly ? null : "0"} playerMap={players} themeId="classic"
        chatMessages={chatMessages} sendChatMessage={readOnly ? undefined : (payload) => setChatMessages((current) => [
          ...current, { id: String(current.length), sender: "0", payload },
        ])}
        rootClassName="h-full w-full" panelClassName={contentClassName} headerClassName="sr-only" />
    ) },
  ];
  return (
    <div className="p-ui-4">
      <Button variant="utility" onClick={() => setActivePanel("log")}>Open game feed</Button>
      <MobileMetaDrawer panels={panels} activePanel={activePanel} onActivePanelChange={setActivePanel} />
    </div>
  );
}

export const MobileFeedDrawer = {
  render: () => <DrawerFixture />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole("button", { name: "Open game feed" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Game Log" })).toBeVisible());
    await expect(await screen.findByRole("tab", { name: "Game Log" })).toHaveAttribute("aria-selected", "true");
    await userEvent.click(screen.getByRole("tab", { name: "Chat", exact: true }));
    const composer = screen.getByRole("textbox", { name: "Chat message" });
    await userEvent.type(composer, "Local drawer message{enter}");
    await waitFor(() => expect(screen.getByText("Local drawer message")).toBeVisible());
    await expect(composer).toHaveValue("");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("tab", { name: "Chat", exact: true })).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: "Open game feed" }));
    await userEvent.click(await screen.findByRole("tab", { name: "Chat", exact: true }));
  },
};

export const MobileFeedDrawerReadOnly = {
  render: () => <DrawerFixture readOnly />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole("button", { name: "Open game feed" }));
    await userEvent.click(await screen.findByRole("tab", { name: "Chat", exact: true }));
    await expect(screen.getByRole("textbox", { name: "Chat message" })).toBeDisabled();
  },
};

export const DesktopFeedDock = {
  parameters: { viewport: { defaultViewport: "catanaDesktop" } },
  render: () => <DesktopMetaDock entries={entries} logPlayerMap={players} themeId="classic"
    playerID={null} bgioProps={{ chatMessages: messages }} />,
};
