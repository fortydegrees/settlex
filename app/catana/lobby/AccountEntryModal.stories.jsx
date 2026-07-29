import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { AccountEntryModal } from "./AccountEntryModal";

const callbacks = {
  onClose: fn(),
  onSwitchToAuth: fn(),
  onPlayUsernameSubmit: fn(),
  onEmailSignIn: fn(),
  onEmailSignUp: fn(),
  onSignInProvider: fn(),
  onContinueAsGuest: fn(),
};

const meta = {
  title: "Product Patterns/Account & Identity/Account Entry",
  component: AccountEntryModal,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    authOptions: {
      emailPassword: true,
      socialProviders: ["google", "discord"],
    },
    ...callbacks,
  },
  argTypes: {
    mode: { control: false },
    intent: { control: false },
    identity: { control: false },
    authOptions: { control: false },
  },
};

export default meta;

export const SignInOrGuest = { args: { mode: "auth-first" } };

export const SaveGuestProfile = { args: { mode: "save-profile" } };

export const ChooseOnlineIdentity = {
  args: {
    mode: "play-username",
    intent: "online",
    identity: { name: "BoldTraderYM", emoji: "😉", color: "teal" },
  },
};

export const ChooseFriendIdentity = {
  args: { ...ChooseOnlineIdentity.args, intent: "friend" },
};

export const MissingCredentials = {
  args: { mode: "auth-first" },
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
    mode: "auth-first",
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
