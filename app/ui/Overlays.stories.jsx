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
        actions={<Button onClick={() => setOpen(false)}>Close settings</Button>}
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
      <div role="menu" aria-label="Example menu" className="grid gap-ui-1">
        <button type="button" role="menuitem" className="rounded-control px-ui-2 py-ui-1.5 text-left type-body-small hover:bg-surface-hover">
          Edit profile
        </button>
      </div>
    </Popover>
  );
}

function MetaDisclosureHarness() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="settlehex-ui-hud p-ui-5">
      <MetaDisclosure
        open={open}
        onOpenChange={setOpen}
        label="release 4"
        ariaLabel="Show example release notes"
      >
        <h2 className="type-action-small">Release notes</h2>
        <p className="mt-ui-2 type-body-small">Match alerts now stay quieter until they matter.</p>
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
    delete canvasElement.dataset.motionContract;
    const canvas = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Open game log" });
    // Base UI closes tooltips on click; keyboard focus is the opening contract.
    await userEvent.tab();
    await waitFor(() => expect(trigger).toHaveFocus());
    await waitFor(() => expect(canvas.getByText("Open the game log")).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(canvas.queryByText("Open the game log")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    canvasElement.dataset.motionContract = "passed";
  },
};


export const RepeatedDialogReversal = {
  render: () => <DialogHarness />,
  play: async ({canvasElement}) => {
    delete canvasElement.dataset.motionContract;
    const screen = within(canvasElement.ownerDocument.body);
    const trigger = screen.getByRole('button',{name:'Open account settings'});
    for (let i = 0; i < 3; i++) {
      await userEvent.click(trigger);
      await userEvent.click(await screen.findByRole('button',{name:'Close settings'}));
    }
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('dialog',{name:'Account settings'})).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    canvasElement.dataset.motionContract = 'passed';
  },
};

// React 19 treats inert as boolean. Exit content must stop accepting focus
// immediately, while Base UI still owns its presence and reversal.
export const DialogExitInteraction = {
  render: () => <DialogHarness />,
  play: async ({ canvasElement }) => {
    delete canvasElement.dataset.inertContract;
    const screen = within(canvasElement.ownerDocument.body);
    const trigger = screen.getByRole('button', { name: 'Open account settings' });
    await userEvent.click(trigger);
    const popup = await screen.findByRole('dialog', { name: 'Account settings' });
    const close = screen.getByRole('button', { name: 'Close settings' });
    await waitFor(() => expect(getComputedStyle(popup).opacity).toBe('1'));
    await expect(popup.inert).toBe(false);
    await userEvent.click(close);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await expect(popup).toBeInTheDocument();
      await expect(popup.inert).toBe(true);
      close.focus();
      await expect(close).not.toHaveFocus();
    }
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(trigger);
    const reopened = await screen.findByRole('dialog', { name: 'Account settings' });
    await expect(reopened.inert).toBe(false);
    const reopenedClose = screen.getByRole('button', { name: 'Close settings' });
    reopenedClose.focus();
    await expect(reopenedClose).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    canvasElement.dataset.inertContract = 'passed';
  },
};
