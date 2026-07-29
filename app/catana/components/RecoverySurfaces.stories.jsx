import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { Button } from "../../ui/Button";
import { UnavailableMatchPage } from "../../g/[matchID]/UnavailableMatchPage";
import { InterruptedDuelRecovery } from "../lobby/[matchID]/InterruptedDuelRecovery";
import {
  getReconnectStatusBannerProps,
} from "./GlobalReconnectBanner";
import { GlassPillButton } from "./GlassPillButton";
import { IdlePromptModal } from "./IdlePromptModal";
import { ResignConfirmDialog } from "./ResignConfirmDialog";
import { StatusBanner } from "./StatusBanner";

const meta = {
  title: "Composed Surfaces/Alerts & Recovery/Recovery Surfaces",
  parameters: { layout: "fullscreen" },
};

export default meta;

const bannerStage = (children) => (
  <div className="mx-auto flex min-h-screen w-full max-w-3xl items-start px-4 py-8 sm:py-12">
    <div className="w-full">{children}</div>
  </div>
);

export const StatusBannerNeutral = {
  render: () =>
    bannerStage(
      <StatusBanner
        {...getReconnectStatusBannerProps({ playerName: null })}
      />
    ),
};

export const StatusBannerDanger = {
  render: () =>
    bannerStage(
      <StatusBanner
        variant="danger"
        title="Connection lost. Trying to reconnect…"
        className="max-w-lg"
      />
    ),
};

export const ReconnectStatusRecipe = {
  args: {
    onRejoin: fn(),
    onDismiss: fn(),
  },
  render: ({ onRejoin, onDismiss }) => {
    const statusBannerProps = getReconnectStatusBannerProps({
      matchID: "storybook-reconnect",
      playerID: "0",
      playerName: "HarbourFox",
      href: "/g/storybook-reconnect",
    });

    return bannerStage(
      <StatusBanner
        {...statusBannerProps}
        actions={
          <>
            <GlassPillButton
              className="w-full justify-center sm:w-auto sm:min-w-[11rem]"
              onClick={onRejoin}
            >
              Rejoin match
            </GlassPillButton>
            <Button
              variant="ghost"
              className="w-full justify-center sm:w-auto"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </>
        }
      />
    );
  },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onDismiss.mockClear();
    args.onRejoin.mockClear();
    const dismiss = await screen.findByRole("button", { name: "Dismiss" });
    await userEvent.click(dismiss);
    expect(args.onDismiss).toHaveBeenCalledOnce();
    expect(args.onRejoin).not.toHaveBeenCalled();
  },
};

export const IdlePrompt = {
  args: {
    remainingMs: 42_000,
    onAcknowledge: fn(),
  },
  render: (args) => <IdlePromptModal {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onAcknowledge.mockClear();
    await waitFor(() =>
      expect(
        screen.getByRole("dialog", { name: "Are you still there?" })
      ).toBeVisible()
    );
    await userEvent.click(
      screen.getByRole("button", { name: "I’m still here" })
    );
    expect(args.onAcknowledge).toHaveBeenCalledOnce();
  },
};

export const ResignConfirmation = {
  args: {
    open: true,
    onOpenChange: fn(),
    onConfirm: fn(),
  },
  render: (args) => <ResignConfirmDialog {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onOpenChange.mockClear();
    args.onConfirm.mockClear();
    await waitFor(() =>
      expect(
        screen.getByRole("alertdialog", { name: "Resign this match?" })
      ).toBeVisible()
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(args.onOpenChange).toHaveBeenCalledWith(false);
    expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

export const UnavailableMatch = {
  render: () => <UnavailableMatchPage matchID="storybook-unavailable" />,
};

export const InterruptedDuel = {
  args: {
    onReturnToLobby: fn(),
    onLookAgain: fn(),
  },
  render: (args) => (
    <InterruptedDuelRecovery
      pending={false}
      error=""
      {...args}
    />
  ),
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onReturnToLobby.mockClear();
    args.onLookAgain.mockClear();
    await userEvent.click(
      screen.getByRole("button", { name: "Return to lobby" })
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Look again" })
    );
    expect(args.onReturnToLobby).toHaveBeenCalledOnce();
    expect(args.onLookAgain).toHaveBeenCalledOnce();
  },
};

export const InterruptedDuelRecoveryPending = {
  args: {
    onReturnToLobby: fn(),
    onLookAgain: fn(),
  },
  render: (args) => (
    <InterruptedDuelRecovery pending error="" {...args} />
  ),
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    expect(
      screen.getByRole("button", { name: "Return to lobby" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Checking duel…" })
    ).toBeDisabled();
  },
};

export const InterruptedDuelRecoveryError = {
  args: {
    onReturnToLobby: fn(),
    onLookAgain: fn(),
  },
  render: (args) => (
    <InterruptedDuelRecovery
      pending={false}
      error="The duel could not be released. Try again."
      {...args}
    />
  ),
};
