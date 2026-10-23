import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { AccountPageView } from "./AccountPageView";

const callbacks = {
  onEmailSignIn: fn(),
  onEmailSignUp: fn(),
  onSignInProvider: fn(),
};

const authOptions = {
  emailPassword: true,
  socialProviders: ["google", "discord"],
};

const guestAccount = {
  status: "guest",
  currentUsername: "BoldTraderYM",
};

const claimedAccount = {
  status: "claimed",
  currentUsername: "HarbourFox",
};

const meta = {
  title: "Composed Surfaces/Account & Identity/Account Page",
  component: AccountPageView,
  parameters: { layout: "fullscreen" },
  args: {
    account: null,
    authOptions,
    ...callbacks,
  },
  argTypes: {
    account: { control: false },
    authOptions: { control: false },
  },
};

export default meta;

export const NoProfile = {};

export const GuestProfile = { args: { account: guestAccount } };

export const LongUsername = {
  args: { account: { ...guestAccount, currentUsername: "TheLongestHarbourTraderName28" } },
};

export const ClaimedProfile = { args: { account: claimedAccount } };

export const MissingCredentials = {
  args: { account: guestAccount },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const signInButtons = await screen.findAllByRole("button", {
      name: "Sign in",
    });
    await userEvent.click(signInButtons.at(-1));
    await waitFor(() =>
      expect(screen.getByText("Enter an email and password.")).toBeVisible()
    );
  },
};

export const EmailSubmitting = {
  args: {
    account: guestAccount,
    onEmailSignIn: fn(() => new Promise(() => {})),
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.type(
      await screen.findByLabelText("Email"),
      "player@example.com"
    );
    await userEvent.type(
      await screen.findByLabelText("Password"),
      "storybook-password"
    );
    const signInButtons = await screen.findAllByRole("button", {
      name: "Sign in",
    });
    await userEvent.click(signInButtons.at(-1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled()
    );
  },
};

export const Mobile = {
  args: { account: guestAccount },
  parameters: { viewport: { defaultViewport: "catanaMobile" } },
};
