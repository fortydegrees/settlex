import React, { useState } from "react";
import { Button } from "../../ui/Button";
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

export const EmailOnly = {
  args: { mode: "auth-first", authOptions: { emailPassword: true, socialProviders: [] } },
};

export const SaveGuestProfile = { args: { mode: "save-profile" } };

export const CreateAccount = {
  args: { mode: "auth-first" },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(await screen.findByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
  },
};

export const ProviderError = {
  args: {
    mode: "auth-first",
    onSignInProvider: fn(async () => { throw new Error("Unable to start sign in. Please try again."); }),
  },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Unable to start sign in."));
  },
};

export const ProviderPending = {
  args: { mode: "auth-first", onSignInProvider: fn(() => new Promise(() => {})) },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(await screen.findByRole("button", { name: "Continue with Discord" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Opening discord..." })).toBeDisabled());
  },
};

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

export const LongUsername = {
  args: {
    ...ChooseOnlineIdentity.args,
    identity: { name: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW", emoji: "😉", color: "teal" },
  },
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
    // Let the dialog finish its initial focus before typing into another field.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Sign in", pressed: true })).toHaveFocus()
    );
    await userEvent.type(
      await screen.findByLabelText("Email"),
      "player@example.com"
    );
    await userEvent.type(
      await screen.findByLabelText("Password"),
      "storybook-password"
    );
    expect(screen.getByLabelText("Email")).toHaveValue("player@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("storybook-password");
    const signInButtons = await screen.findAllByRole("button", {
      name: "Sign in",
    });
    await userEvent.click(signInButtons.at(-1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Working..." })).toBeDisabled()
    );
  },
};


function MotionRolloutHarness() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('auth-first');
  return <div className="p-ui-6 flex flex-wrap gap-ui-3">
    <Button onClick={() => { setMode('auth-first'); setOpen(true); }}>Open sign in</Button>
    <Button variant="secondary" onClick={() => { setMode('play-username'); setOpen(true); }}>Choose guest profile</Button>
    <AccountEntryModal {...meta.args} open={open} mode={mode}
      identity={{name:'HarbourFox',emoji:'🦊',color:'blue'}}
      onClose={() => setOpen(false)} onSwitchToAuth={() => setMode('auth-first')}
      onContinueAsGuest={() => setMode('play-username')}
      onEmailSignIn={async () => { throw new Error('Example sign-in error. Your details are still here so you can try again.'); }}
      onEmailSignUp={async () => { throw new Error('Example account error. Your details are still here so you can try again.'); }} />
  </div>;
}
export const SharedMotionRollout = {
  render: () => <MotionRolloutHarness />,
  play: async ({canvasElement}) => {
    delete canvasElement.dataset.motionContract;
    const screen = within(canvasElement.ownerDocument.body);
    const trigger = screen.getByRole('button',{name:'Open sign in'});
    await userEvent.click(trigger);
    await waitFor(() => expect(screen.getByRole('button',{name:'Sign in',pressed:true})).toHaveFocus());
    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Password');
    await userEvent.type(email,'player@example.com');
    await userEvent.type(password,'storybook-password');
    await userEvent.click(screen.getByRole('button',{name:'Create account',pressed:false}));
    expect(screen.getByLabelText('Email')).toBe(email);
    expect(password).toHaveAttribute('autocomplete','new-password');
    await userEvent.click(screen.getByRole('button',{name:'Sign in',pressed:false}));
    expect(email).toHaveValue('player@example.com');
    expect(password).toHaveValue('storybook-password');
    await userEvent.click(screen.getAllByRole('button',{name:'Sign in'}).at(-1));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Example sign-in error'));
    expect(email).toHaveValue('player@example.com');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    await userEvent.click(screen.getByRole('button',{name:'Choose guest profile'}));
    await userEvent.click(await screen.findByRole('button',{name:'Sign in instead'}));
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeVisible());
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};
