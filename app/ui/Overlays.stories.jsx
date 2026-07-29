import React from "react";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { AlertDialog } from "./AlertDialog";
import { Button } from "./Button";
import { Dialog } from "./Dialog";
import { MetaDisclosure } from "./MetaDisclosure";
import { Popover } from "./Popover";
import { Tooltip, TooltipProvider } from "./Tooltip";

function DialogHarness() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open account settings</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Account settings"
        description="Choose how SettleHex keeps this table personal."
      />
    </>
  );
}

function AlertDialogHarness() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>Leave table</Button>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Leave this table?"
        description="You’ll need to find another table to keep playing."
        confirmLabel="Leave table"
        cancelLabel="Stay here"
        onConfirm={fn()}
        onCancel={fn()}
      />
    </>
  );
}

function PopoverHarness() {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      triggerAriaLabel="Open example menu"
      triggerContent="Open example menu"
    >
      <div role="menu" aria-label="Example menu" className="grid gap-1">
        <button type="button" role="menuitem" className="rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/60">
          Edit profile
        </button>
      </div>
    </Popover>
  );
}

function MetaDisclosureHarness() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="rounded-[1.35rem] bg-sky-500/80 p-5">
      <MetaDisclosure
        open={open}
        onOpenChange={setOpen}
        label="release 4"
        ariaLabel="Show example release notes"
      >
        <h2 className="text-sm font-bold">Release notes</h2>
        <p className="mt-2 text-sm leading-6">Match alerts now stay quieter until they matter.</p>
      </MetaDisclosure>
    </div>
  );
}

function TooltipHarness() {
  return (
    <TooltipProvider delay={0}>
      <Tooltip label="Open the game log">
        <Button variant="secondary">Open game log</Button>
      </Tooltip>
    </TooltipProvider>
  );
}

const meta = {
  title: "Components/Overlays",
};

export default meta;

export const AccountDialogMotion = {
  render: () => <DialogHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open account settings" });
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole("dialog", { name: "Account settings" })).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const LeaveTableConfirmation = {
  render: () => <AlertDialogHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Leave table" });
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole("alertdialog", { name: "Leave this table?" })).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const AccountPopoverMotion = {
  render: () => <PopoverHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open example menu" });
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole("menu", { name: "Example menu" })).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const ReleaseMetaDisclosure = {
  render: () => <MetaDisclosureHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Show example release notes" });
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByRole("heading", { name: "Release notes" })).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

export const GameLogTooltip = {
  render: () => <TooltipHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open game log" });
    await userEvent.click(trigger);
    await waitFor(() => expect(canvas.getByText("Open the game log")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
