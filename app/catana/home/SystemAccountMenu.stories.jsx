import { expect, fn, waitFor, within } from "@storybook/test";
import {
  guestIdentity,
  matchAlertErrors,
  matchAlertFixtures,
  savedIdentity,
} from "../dev/storybook/accountFixtures";
import { SystemAccountMenu } from "./SystemAccountMenu";

const callbacks = {
  onEditIdentity: fn(),
  onMatchAlertAction: fn(),
  onOpenAccount: fn(),
  onOpenSaveProfile: fn(),
  onOpenSignIn: fn(),
  onSignOut: fn(),
};

const guestArgs = {
  identity: guestIdentity,
  accountStatus: "guest",
  hasIdentity: true,
  matchAlertDisplay: matchAlertFixtures.off,
};

const savedArgs = {
  identity: savedIdentity,
  accountStatus: "claimed",
  hasIdentity: true,
};

function AccountMenuHarness(args) {
  return <SystemAccountMenu defaultOpen {...callbacks} {...args} />;
}

const meta = {
  title: "Product Patterns/Account & Identity/Account Menu",
  component: SystemAccountMenu,
  render: (args) => <AccountMenuHarness {...args} />,
  args: guestArgs,
  argTypes: {
    accountStatus: { control: false },
    hasIdentity: { control: false },
    matchAlertDisplay: { control: false },
    matchAlertError: { control: false },
    matchAlertLoading: { control: false },
  },
};

export default meta;

export const SignedOut = {
  args: {
    ...guestArgs,
    hasIdentity: false,
  },
};

export const GuestAlertsOff = {};

export const GuestAlertsPausedResumeAvailable = {
  args: {
    ...guestArgs,
    matchAlertDisplay: matchAlertFixtures.pausedResumable,
  },
};

export const GuestAlertsPausedHumanGameActive = {
  args: {
    ...guestArgs,
    matchAlertDisplay: matchAlertFixtures.pausedHumanGame,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(screen.getByText("Paused during game")).toBeVisible()
    );
    await expect(
      screen.queryByRole("button", { name: "Resume" })
    ).not.toBeInTheDocument();
  },
};

export const GuestResumeFailed = {
  args: {
    ...guestArgs,
    matchAlertDisplay: matchAlertFixtures.pausedResumable,
    matchAlertError: matchAlertErrors.humanGamePaused,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() => {
      const menu = screen.getByRole("dialog");
      const dialog = within(menu);
      expect(dialog.getByText("Playing as guest")).toBeVisible();
      expect(dialog.getByText("BoldTraderYM")).toBeVisible();
      expect(dialog.getByText("Paused during game")).toBeVisible();
      expect(dialog.getByRole("button", { name: "Resume" })).toBeVisible();
      expect(dialog.getByRole("alert")).toHaveTextContent(
        "Match alerts stay paused until your human game ends."
      );
    });
  },
};

export const SavedAccountAlertsActive = {
  args: {
    ...savedArgs,
    matchAlertDisplay: matchAlertFixtures.active,
  },
};

export const SavedAccountNotificationsBlocked = {
  args: {
    ...savedArgs,
    matchAlertDisplay: matchAlertFixtures.blocked,
  },
};

export const SavedAccountNotificationsUnsupported = {
  args: {
    ...savedArgs,
    matchAlertDisplay: matchAlertFixtures.unsupported,
  },
};

export const SavedAccountAlertsUnavailable = {
  args: {
    ...savedArgs,
    matchAlertDisplay: matchAlertFixtures.unconfigured,
  },
};

export const SavedAccountInstallRequired = {
  args: {
    ...savedArgs,
    matchAlertDisplay: matchAlertFixtures.installRequired,
  },
};

export const AlertActionPending = {
  args: {
    ...guestArgs,
    matchAlertLoading: true,
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Enable" })).toBeDisabled()
    );
  },
};
