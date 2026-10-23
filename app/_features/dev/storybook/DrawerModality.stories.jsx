import React, { useState } from "react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { Drawer as EsmDrawer } from "vaul";
import { MobileMetaDrawer } from "../../game/feed/MobileMetaDrawer";
import { ReplayPanel } from "../../replay/components/ReplayPanel";
import { Button } from "../../../ui/Button";
import { replayTimeline } from "./replayFixtures";

// Webpack's require condition selects Vaul's shipped CommonJS entry. The import
// above and both production consumers select its shipped ESM entry.
const { Drawer: CommonJsDrawer } = require("vaul");

const meta = {
  title: "Regression/Drawer Modality",
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "catanaMobile" } },
};

export default meta;

// Only caller state and replay data are fixtures. React, portals, focus scopes,
// dismissable layers and both production consumers run without mocks.
function DrawerFixture({ consumer = "feed", moduleForm = "esm", modal }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [actions, setActions] = useState(0);
  const [perspective, setPerspective] = useState(null);
  const [eventIndex, setEventIndex] = useState(2);
  const LibraryDrawer = moduleForm === "commonjs" ? CommonJsDrawer : EsmDrawer;
  const unmount = () => { setOpen(false); setMounted(false); };
  return (
    <main className="min-h-screen p-ui-4">
      <Button onClick={() => setOpen(true)}>Open from caller</Button>
      <Button onClick={() => setOpen(false)}>Close from caller</Button>
      <Button onClick={unmount}>Unmount drawer</Button>
      <Button onClick={() => setMounted(true)}>Mount drawer</Button>
      <Button onClick={() => setActions((value) => value + 1)}>Board action</Button>
      <output aria-label="Board actions">{actions}</output>
      {mounted && consumer === "feed" && <MobileMetaDrawer
        activePanel={open ? "chat" : null}
        onActivePanelChange={(panel) => setOpen(Boolean(panel))}
        panels={[{ id: "chat", label: "Chat", renderMobile: () => <label>Feed draft<input aria-label="Feed draft" /></label> }]}
      />}
      {mounted && consumer === "replay" && <ReplayPanel
        timeline={replayTimeline} currentEvent={replayTimeline.events[eventIndex]}
        currentEventIndex={eventIndex} perspectiveId={perspective} victoryTarget={10}
        open mobileOpen={open} onOpenChange={() => {}} onMobileOpenChange={setOpen}
        onPerspectiveChange={setPerspective} onResultsOpen={() => {}}
        onPreviousEvent={() => setEventIndex((value) => Math.max(0, value - 1))}
        onNextEvent={() => setEventIndex((value) => Math.min(4, value + 1))}
        onPreviousTurn={() => setEventIndex(0)} onNextTurn={() => setEventIndex(3)} onSeek={setEventIndex}
      />}
      {mounted && consumer === "library" && <LibraryDrawer.Root open={open} onOpenChange={setOpen} {...(modal === undefined ? {} : { modal })}>
        <LibraryDrawer.Portal>
          <LibraryDrawer.Overlay className="fixed inset-0 bg-surface-overlay" />
          <LibraryDrawer.Content className="settlex-ui-pane fixed inset-x-0 bottom-0 p-ui-4">
            <LibraryDrawer.Title>Modal control</LibraryDrawer.Title>
            <LibraryDrawer.Description>Installed Vaul module behavior.</LibraryDrawer.Description>
            <label>Modal draft<input aria-label="Modal draft" /></label>
            <Button onClick={unmount}>Unmount from content</Button>
          </LibraryDrawer.Content>
        </LibraryDrawer.Portal>
      </LibraryDrawer.Root>}
    </main>
  );
}

const mark = (canvas, value) => { canvas.dataset.drawerAssertions = value; };
const closed = (screen) => waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
const keyboardOpen = async (controls, screen) => {
  controls.getByRole("button", { name: "Open from caller" }).focus();
  await userEvent.keyboard("{Enter}");
  return screen.findByRole("dialog");
};

// Removing modal forwarding must break the reopened outside interaction below.
const nonmodalPlay = async ({ canvasElement, args }) => {
  mark(canvasElement, "running");
  const controls = within(canvasElement);
  const screen = within(canvasElement.ownerDocument.body);
  await userEvent.click(controls.getByRole("button", { name: "Open from caller" }));
  const first = await screen.findByRole("dialog");
  const inside = within(first).getAllByRole(args.consumer === "replay" ? "button" : "textbox")[0];
  inside.focus();
  await expect(inside).toHaveFocus();
  await userEvent.keyboard("{Escape}");
  await closed(screen);
  await keyboardOpen(controls, screen);
  const board = controls.getByRole("button", { name: "Board action" });
  board.focus();
  await waitFor(() => expect(board).toHaveFocus());
  await userEvent.click(board);
  await expect(controls.getByLabelText("Board actions")).toHaveTextContent("1");
  // The production outside handler permits dismissal as well as the board action.
  if (args.consumer !== "library") await closed(screen);
  await keyboardOpen(controls, screen);
  // Keyboard activation avoids an outside pointer-down dismissing the drawer
  // before the caller handler runs: these must exercise the controlled paths.
  controls.getByRole("button", { name: "Close from caller" }).focus();
  await expect(screen.getByRole("dialog")).toBeVisible();
  await userEvent.keyboard("{Enter}");
  await closed(screen);
  await keyboardOpen(controls, screen);
  controls.getByRole("button", { name: "Unmount drawer" }).focus();
  await expect(screen.getByRole("dialog")).toBeVisible();
  await userEvent.keyboard("{Enter}");
  await closed(screen);
  await userEvent.click(board);
  await expect(controls.getByLabelText("Board actions")).toHaveTextContent("2");
  await userEvent.click(controls.getByRole("button", { name: "Mount drawer" }));
  await keyboardOpen(controls, screen);
  await userEvent.keyboard("{Escape}");
  await closed(screen);
  if (args.consumer === "replay") {
    const trigger = controls.getByRole("button", { name: "Open replay tray" });
    await userEvent.click(trigger);
    const tray = await screen.findByRole("dialog");
    await userEvent.click(within(tray).getByRole("button", { name: "Next event", exact: true }));
    await expect(within(tray).getByText("Event 4 of 5")).toBeVisible();
    await userEvent.click(within(tray).getByRole("button", { name: "Close replay tray" }));
    await closed(screen);
    await waitFor(() => expect(trigger).toHaveFocus());
  }
  mark(canvasElement, "passed");
};

// A broad removal of modality must fail outside-pointer blocking and focus trap.
const modalPlay = async ({ canvasElement }) => {
  mark(canvasElement, "running");
  const controls = within(canvasElement);
  const screen = within(canvasElement.ownerDocument.body);
  const board = controls.getByRole("button", { name: "Board action" });
  await userEvent.click(controls.getByRole("button", { name: "Open from caller" }));
  let dialog = await screen.findByRole("dialog");
  const input = within(dialog).getByRole("textbox");
  input.focus();
  board.focus();
  await waitFor(() => expect(input).toHaveFocus());
  await expect(userEvent.click(board)).rejects.toThrow(/pointer-events/);
  await expect(controls.getByLabelText("Board actions")).toHaveTextContent("0");
  await userEvent.keyboard("{Escape}");
  await closed(screen);
  await userEvent.click(board);
  await expect(controls.getByLabelText("Board actions")).toHaveTextContent("1");
  dialog = await keyboardOpen(controls, screen);
  await userEvent.click(within(dialog).getByRole("button", { name: "Unmount from content" }));
  await closed(screen);
  await userEvent.click(board);
  await expect(controls.getByLabelText("Board actions")).toHaveTextContent("2");
  mark(canvasElement, "passed");
};

const nonmodal = { render: (args) => <DrawerFixture {...args} />, play: nonmodalPlay };
export const FeedNonmodal = { ...nonmodal, args: { consumer: "feed" } };
export const ReplayNonmodal = { ...nonmodal, args: { consumer: "replay" } };
export const EsmNonmodal = { ...nonmodal, args: { consumer: "library", moduleForm: "esm", modal: false } };
export const CommonJsNonmodal = { ...nonmodal, args: { consumer: "library", moduleForm: "commonjs", modal: false } };
const modal = { render: (args) => <DrawerFixture {...args} />, play: modalPlay };
export const EsmDefaultModal = { ...modal, args: { consumer: "library", moduleForm: "esm" } };
export const EsmExplicitModal = { ...modal, args: { consumer: "library", moduleForm: "esm", modal: true } };
export const CommonJsDefaultModal = { ...modal, args: { consumer: "library", moduleForm: "commonjs" } };
export const CommonJsExplicitModal = { ...modal, args: { consumer: "library", moduleForm: "commonjs", modal: true } };
