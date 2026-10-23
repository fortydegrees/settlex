import React, { useState } from "react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { Button } from "../../../ui/Button";
import { DesktopMetaDock, MobileMetaRail } from "./LeftMetaRail";
import { LEFT_META_RAIL_DESKTOP_STORAGE_KEY } from "./leftMetaRailPreferences";

const meta = {
  title: "Composed Surfaces/Gameplay/Meta Rail",
  parameters: { layout: "fullscreen" },
};
export default meta;
const players = { "0": { name: "HarbourFox", emoji: "🦊", color: "blue" } };
const entries = [{ id: "roll", type: "roll", actorId: "0", data: { dice: [3, 4] } }];
const initialMessages = [{ id: "m1", sender: "0", payload: "Good luck!" }];

// Only the caller state/transport is local. All panel, drawer and transition
// behavior below belongs to the production rail and feed components.
function RailFixture({ mobile = false, readOnly = false, uncontrolled = false }) {
  const [mounted, setMounted] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [chatMessages, setChatMessages] = useState(initialMessages);
  const props = {
    entries, logPlayerMap: players, themeId: "classic", playerID: readOnly ? null : "0",
    bgioProps: {
      chatMessages,
      sendChatMessage: readOnly ? undefined : (payload) => setChatMessages((current) => [
        ...current, { id: String(current.length), sender: "0", payload },
      ]),
    },
  };
  return (
    <div className="p-ui-4">
      <Button variant="utility" onClick={() => setMounted((value) => !value)}>{mounted ? "Unmount rail" : "Mount rail"}</Button>
      {mobile && !uncontrolled && <>
        <Button variant="utility" onClick={() => setActivePanel((value) => value === "log" ? null : "log")}>Toggle log</Button>
        <Button variant="utility" onClick={() => setActivePanel((value) => value === "chat" ? null : "chat")}>Toggle chat</Button>
      </>}
      {mounted && (mobile
        ? <MobileMetaRail {...props} isPhoneLayout initialActivePanel={uncontrolled ? "chat" : null}
            {...(uncontrolled ? {} : { mobileActivePanel: activePanel, onMobileActivePanelChange: setActivePanel })} />
        : <DesktopMetaDock {...props} />)}
    </div>
  );
}

const frame = (canvas, id) => canvas.querySelector(`[data-meta-feed-frame="${id}"]`);
const phase = (canvas, id, value) => waitFor(() => expect(frame(canvas, id)).toHaveAttribute("data-meta-feed-frame-phase", value));
const done = (canvas) => { canvas.dataset.railAssertions = "passed"; };
const start = (canvas) => { canvas.dataset.railAssertions = "running"; };
const isolatedPrefs = () => {
  const previous = localStorage.getItem(LEFT_META_RAIL_DESKTOP_STORAGE_KEY);
  localStorage.removeItem(LEFT_META_RAIL_DESKTOP_STORAGE_KEY);
  return () => {
    if (previous === null) localStorage.removeItem(LEFT_META_RAIL_DESKTOP_STORAGE_KEY);
    else localStorage.setItem(LEFT_META_RAIL_DESKTOP_STORAGE_KEY, previous);
  };
};

export const DesktopPersistenceAndKeyboard = {
  parameters: { viewport: { defaultViewport: "settlehexDesktop" } },
  beforeEach: isolatedPrefs,
  render: () => <RailFixture />,
  play: async ({ canvasElement }) => {
    start(canvasElement);
    const screen = within(canvasElement);
    const composer = await screen.findByRole("textbox", { name: "Chat message" });
    await userEvent.type(composer, "Draft survives minimizing");
    const minimize = screen.getByRole("button", { name: "Minimize Chat" });
    minimize.focus();
    await expect(minimize).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await phase(canvasElement, "chat", "closing-body");
    await phase(canvasElement, "chat", "closing-width");
    await phase(canvasElement, "chat", "closed");
    await phase(canvasElement, "log", "open");
    const restore = screen.getByRole("button", { name: "Chat", exact: true });
    restore.focus();
    await expect(restore).toHaveFocus();
    await userEvent.keyboard(" ");
    await phase(canvasElement, "chat", "opening-width");
    await phase(canvasElement, "chat", "opening-body");
    await phase(canvasElement, "chat", "open");
    await expect(composer).toHaveValue("Draft survives minimizing");
    await userEvent.clear(composer);
    await userEvent.type(composer, "Local rail message{enter}");
    await waitFor(() => expect(screen.getByText("Local rail message")).toBeVisible());
    await expect(composer).toHaveValue("");
    await userEvent.click(screen.getByRole("button", { name: "Minimize Game Log" }));
    await phase(canvasElement, "log", "closed");
    await expect(JSON.parse(localStorage.getItem(LEFT_META_RAIL_DESKTOP_STORAGE_KEY)).openPanels).toEqual(["chat"]);
    await userEvent.click(screen.getByRole("button", { name: "Unmount rail" }));
    await userEvent.click(screen.getByRole("button", { name: "Mount rail" }));
    await phase(canvasElement, "log", "closed");
    await phase(canvasElement, "chat", "open");
    const restoreLog = screen.getByRole("button", { name: "Game Log", exact: true });
    restoreLog.focus();
    await userEvent.keyboard("{Enter}");
    await phase(canvasElement, "log", "open");
    done(canvasElement);
  },
};

export const DesktopReadOnly = {
  parameters: { viewport: { defaultViewport: "settlehexDesktop" } },
  beforeEach: isolatedPrefs,
  render: () => <RailFixture readOnly />,
  play: async ({ canvasElement }) => {
    start(canvasElement);
    await expect(await within(canvasElement).findByRole("textbox", { name: "Chat message" })).toBeDisabled();
    done(canvasElement);
  },
};

const mobilePlay = async ({ canvasElement, args }) => {
  start(canvasElement);
  const screen = within(canvasElement.ownerDocument.body);
  const controls = within(canvasElement);
  await controls.findByRole("button", { name: "Unmount rail" });
  if (!args.uncontrolled) await userEvent.click(controls.getByRole("button", { name: "Toggle log" }));
  const tab = await screen.findByRole("tab", { name: args.uncontrolled ? "Chat" : "Game Log", exact: true });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  tab.focus();
  await expect(tab).toHaveFocus();
  await userEvent.click(screen.getByRole("tab", { name: "Chat", exact: true }));
  const composer = screen.getByRole("textbox", { name: "Chat message" });
  if (args.readOnly) await expect(composer).toBeDisabled();
  else {
    await userEvent.type(composer, "Mobile rail message{enter}");
    await waitFor(() => expect(screen.getByText("Mobile rail message")).toBeVisible());
    await expect(composer).toHaveValue("");
  }
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("tab", { name: "Chat", exact: true })).not.toBeInTheDocument());
  if (!args.uncontrolled) {
    const trigger = controls.getByRole("button", { name: "Toggle chat" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await expect(await screen.findByRole("tab", { name: "Chat", exact: true })).toHaveAttribute("aria-selected", "true");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(screen.queryByRole("tab", { name: "Chat", exact: true })).not.toBeInTheDocument());
  }
  done(canvasElement);
};
export const MobileControlled = { args: { mobile: true }, render: (args) => <RailFixture {...args} />, play: mobilePlay };
export const MobileUncontrolledReadOnly = { args: { mobile: true, uncontrolled: true, readOnly: true }, render: (args) => <RailFixture {...args} />, play: mobilePlay };

// Real timers run; this adapter records stage/preload work so unmount can prove
// it cancels the IDs it scheduled. It is installed/restored only during this play.
export const UnmountCancelsScheduledWork = {
  parameters: { viewport: { defaultViewport: "settlehexDesktop" } },
  beforeEach: isolatedPrefs,
  render: () => <RailFixture />,
  play: async ({ canvasElement }) => {
    start(canvasElement);
    const screen = within(canvasElement);
    await screen.findByRole("button", { name: "Unmount rail" });
    const originalSet = window.setTimeout;
    const originalClear = window.clearTimeout;
    const scheduled = [];
    const cancelled = new Set();
    window.setTimeout = (callback, delay, ...args) => {
      const id = originalSet(callback, delay, ...args);
      if ([190, 210, 400].includes(delay)) scheduled.push(id);
      return id;
    };
    window.clearTimeout = (id) => { cancelled.add(id); return originalClear(id); };
    try {
      await userEvent.click(screen.getByRole("button", { name: "Minimize Chat" }));
      await phase(canvasElement, "chat", "closing-body");
      expect(scheduled.length).toBeGreaterThan(0);
      await userEvent.click(screen.getByRole("button", { name: "Unmount rail" }));
      await waitFor(() => expect(frame(canvasElement, "chat")).toBeNull());
      for (const id of scheduled) expect(cancelled.has(id)).toBe(true);
    } finally {
      window.setTimeout = originalSet;
      window.clearTimeout = originalClear;
    }
    done(canvasElement);
  },
};

function PreloadFixture() {
  const [mounted, setMounted] = useState(false);
  return <div className="p-ui-4">
    <Button onClick={() => setMounted((value) => !value)}>{mounted ? "Unmount preload" : "Mount preload"}</Button>
    {mounted && <MobileMetaRail isPhoneLayout />}
  </div>;
}
export const UnmountCancelsPreload = {
  args: { fallback: false },
  render: () => <PreloadFixture />,
  play: async ({ canvasElement, args }) => {
    start(canvasElement);
    const screen = within(canvasElement);
    await screen.findByRole("button", { name: "Mount preload" });
    const originalSet = window.setTimeout;
    const originalClear = window.clearTimeout;
    const originalIdle = window.requestIdleCallback;
    const originalCancel = window.cancelIdleCallback;
    const pending = new Set();
    let nextId = 0;
    window.requestIdleCallback = () => { const id = ++nextId; pending.add(id); return id; };
    window.cancelIdleCallback = (id) => { pending.delete(id); };
    if (args.fallback) {
      window.requestIdleCallback = undefined;
      window.setTimeout = (callback, delay, ...values) => {
        const id = originalSet(callback, delay, ...values);
        if (delay === 1500) pending.add(id);
        return id;
      };
      window.clearTimeout = (id) => { pending.delete(id); return originalClear(id); };
    }
    try {
      await userEvent.click(screen.getByRole("button", { name: "Mount preload" }));
      expect(pending.size).toBe(1);
      await userEvent.click(screen.getByRole("button", { name: "Unmount preload" }));
      expect(pending.size).toBe(0);
    } finally {
      window.setTimeout = originalSet;
      window.clearTimeout = originalClear;
      window.requestIdleCallback = originalIdle;
      window.cancelIdleCallback = originalCancel;
    }
    done(canvasElement);
  },
};

export const UnmountCancelsFallbackPreload = { ...UnmountCancelsPreload, args: { fallback: true } };
