import React, { useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Button } from "../../ui/Button";
import { GameRulesDialog, GameSettingsDialog } from "./GameInfoDialogs";

const meta = {
  title: "Composed Surfaces/Gameplay/Game Info Dialogs",
  parameters: { layout: "fullscreen" },
};
export default meta;

function SettingsFixture({ initialMuted = false, onToggleMute, ...args }) {
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  return (
    <div className="p-ui-4">
      <Button variant="utility" onClick={() => setOpen(true)}>Open game settings</Button>
      <GameSettingsDialog {...args} open={open} onOpenChange={setOpen} isMuted={muted}
        onToggleMute={() => {
          setMuted((value) => !value);
          onToggleMute();
        }} />
    </div>
  );
}

async function checkDismissal(screen, title, trigger) {
  await userEvent.click(screen.getByRole("button", { name: "Close", exact: true }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: title })).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
  await userEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole("dialog", { name: title })).toBeVisible());
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog", { name: title })).not.toBeInTheDocument());
  await waitFor(() => expect(trigger).toHaveFocus());
  await userEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole("dialog", { name: title })).toBeVisible());
}

async function checkSettings({ canvasElement, args }) {
  const screen = within(canvasElement.ownerDocument.body);
  args.onToggleMute.mockClear();
  const trigger = screen.getByRole("button", { name: "Open game settings" });
  await userEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Game settings" })).toBeVisible());
  const action = args.initialMuted ? "Unmute audio" : "Mute audio";
  const nextAction = args.initialMuted ? "Mute audio" : "Unmute audio";
  await userEvent.click(screen.getByRole("button", { name: action, exact: true }));
  expect(args.onToggleMute).toHaveBeenCalledOnce();
  expect(screen.getByText(args.initialMuted ? "On" : "Muted", { exact: true })).toBeVisible();
  await userEvent.click(screen.getByRole("button", { name: nextAction, exact: true }));
  expect(args.onToggleMute).toHaveBeenCalledTimes(2);
  await checkDismissal(screen, "Game settings", trigger);
  expect(screen.getByRole("button", { name: action, exact: true })).toBeVisible();
  // Only fixture state changes: no Howler, storage, provider or live match calls.
  expect(args.onToggleMute).toHaveBeenCalledTimes(2);
}

export const SettingsAudioOn = {
  args: { initialMuted: false, themeId: "emoji", onToggleMute: fn() },
  render: (args) => <SettingsFixture {...args} />,
  play: checkSettings,
};

export const SettingsMuted = {
  args: { initialMuted: true, themeId: "classic", onToggleMute: fn() },
  render: (args) => <SettingsFixture {...args} />,
  play: checkSettings,
};

const standardRows = [
  ["Ruleset", "standard"], ["Victory target", "10 VP"],
  ["Discard limit", "7 cards"], ["Bank trade", "4:1"],
  ["Ports", "3:1 / 2:1"], ["Friendly robber", "On up to 2 VP"],
  ["Development cards", "On"],
];

function RulesFixture(args) {
  const [open, setOpen] = useState(false);
  return (
    <div className="p-ui-4">
      <Button variant="utility" onClick={() => setOpen(true)}>Open game rules</Button>
      <GameRulesDialog {...args} open={open} onOpenChange={setOpen} />
    </div>
  );
}

async function checkRules({ canvasElement, args }) {
  const screen = within(canvasElement.ownerDocument.body);
  const trigger = screen.getByRole("button", { name: "Open game rules" });
  await userEvent.click(trigger);
  await waitFor(() => expect(screen.getByRole("dialog", { name: "Game rules" })).toBeVisible());
  const dialog = within(screen.getByRole("dialog", { name: "Game rules" }));
  expect(dialog.getAllByRole("term").map((term) => term.textContent)).toEqual(args.rows.map(([label]) => label));
  expect(dialog.getAllByRole("definition").map((value) => value.textContent)).toEqual(args.rows.map(([, value]) => value));
  expect(dialog.queryByRole("button", { name: /mute audio/i })).not.toBeInTheDocument();
  await checkDismissal(screen, "Game rules", trigger);
}

export const StandardRules = {
  args: { rows: standardRows },
  render: (args) => <RulesFixture {...args} />,
  play: checkRules,
};

export const CustomRules = {
  // Stress a caller-provided ruleset identifier without inventing a new live preset.
  args: { rows: [
    ["Ruleset", "CustomTournamentConfigurationWithoutSpaces"],
    ["Victory target", "15 VP"], ["Discard limit", "9 cards"],
    ["Bank trade", "4:1"], ["Ports", "3:1 / 2:1"],
    ["Friendly robber", "Off"], ["Development cards", "Off"],
  ] },
  render: (args) => <RulesFixture {...args} />,
  play: checkRules,
};
