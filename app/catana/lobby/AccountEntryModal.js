"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Input } from "../../ui/Input";
import { EmailAuthModeToggle } from "../../account/EmailAuthModeToggle";
import { Popover } from "../../ui/Popover";
import { SwatchPicker } from "../../ui/SwatchPicker";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  getPlayerColorOption,
  normalizePlayerColorId,
} from "../theme/playerColors";
import { EmojiPicker } from "./IdentityModal";
import { buildSuggestedGuestIdentity } from "./playerIdentityStorage";
import styles from "./AccountEntryModal.module.css";

const AUTH_PROVIDER_LABELS = Object.freeze({
  discord: "Continue with Discord",
  google: "Continue with Google",
});

const MODE_COPY = Object.freeze({
  "auth-first": {
    title: "Sign in",
    description: null,
    submit: "Sign in",
  },
  "save-profile": {
    title: "Save this profile",
    description:
      "Keep your username and progress across devices.",
    submit: "Sign in",
  },
});

function getPlayCopy(intent, name) {
  if (intent === "friend") {
    return {
      title: "Choose a username to create an invite",
      cta: name ? `Create invite as ${name}` : "Use username and create invite",
    };
  }

  return {
    title: "Choose a username to play online",
    cta: name ? `Play online as ${name}` : "Use username and play",
  };
}

function ProviderIcon({ provider }) {
  return (
    <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center type-action-small text-ink-secondary">
      {provider === "discord" ? "D" : "G"}
    </span>
  );
}

function AccountAuthForm({
  mode,
  authOptions,
  onEmailSignIn,
  onEmailSignUp,
  onSignInProvider,
  onContinueAsGuest,
}) {
  const copy = MODE_COPY[mode] ?? MODE_COPY["auth-first"];
  const [authMode, setAuthMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState("");
  const socialProviders = authOptions.socialProviders.filter(
    (provider) => AUTH_PROVIDER_LABELS[provider]
  );

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail || !password) {
      setStatus("Enter an email and password.");
      return;
    }

    setSubmitting("email");
    setStatus("");

    try {
      if (authMode === "signUp") {
        await onEmailSignUp({ email: normalizedEmail, password });
      } else {
        await onEmailSignIn({ email: normalizedEmail, password });
      }
      setPassword("");
      setStatus(authMode === "signUp" ? "Account created." : "Signed in.");
    } catch (error) {
      setStatus(error?.message || "Unable to authenticate.");
    } finally {
      setSubmitting("");
    }
  };

  const handleProvider = async (provider) => {
    setSubmitting(provider);
    setStatus("");

    try {
      await onSignInProvider(provider);
    } catch (error) {
      setStatus(error?.message || "Unable to start sign in.");
      setSubmitting("");
    }
  };

  return (
    <div className="grid gap-ui-4">
      {authOptions.emailPassword ? (
        <form className="grid gap-ui-3" onSubmit={handleEmailSubmit}>
          <EmailAuthModeToggle value={authMode} onChange={setAuthMode} />

          <label className="grid gap-ui-2 type-label text-ink-secondary">
            Email
            <span className="relative">
              <EnvelopeIcon
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="pl-ui-10"
              />
            </span>
          </label>

          <label className="grid gap-ui-2 type-label text-ink-secondary">
            Password
            <span className="relative">
              <LockClosedIcon
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                aria-hidden="true"
              />
              <Input
                type="password"
                autoComplete={authMode === "signUp" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="pl-ui-10"
              />
            </span>
          </label>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={Boolean(submitting)}
          >
            {submitting === "email"
              ? "Working..."
              : authMode === "signUp"
              ? "Create account"
              : copy.submit}
          </Button>
        </form>
      ) : null}

      {socialProviders.length > 0 ? (
        <div className="grid gap-ui-2 border-t border-edge-subtle pt-ui-4">
          {socialProviders.map((provider) => (
            <Button
              key={provider}
              type="button"
              variant="secondary"
              size="md"
              className="w-full justify-start"
              disabled={Boolean(submitting)}
              onClick={() => handleProvider(provider)}
            >
              <ProviderIcon provider={provider} />
              {submitting === provider
                ? `Opening ${provider}...`
                : AUTH_PROVIDER_LABELS[provider]}
            </Button>
          ))}
        </div>
      ) : null}

      {onContinueAsGuest ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          className="w-full"
          disabled={Boolean(submitting)}
          onClick={onContinueAsGuest}
        >
          Continue as guest
        </Button>
      ) : null}

      {status ? (
        <div role="status" className="settlex-ui-inset px-ui-4 py-ui-3 type-body-small text-ink-secondary">
          {status}
        </div>
      ) : null}
    </div>
  );
}

function AvatarPreview({
  emoji,
  color,
  onEmojiChange,
  onColorChange,
}) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const colorOption = getPlayerColorOption(color || "gold");
  const onAvatarPreviewClick = (nextOpen) => setPickerOpen(nextOpen);

  return (
    <Popover
      open={isPickerOpen}
      onOpenChange={onAvatarPreviewClick}
      triggerAriaLabel="Change avatar and color"
      triggerClassName="settlex-ui-focus group mx-auto flex flex-col items-center rounded-small"
      triggerContent={
        <>
          <span
            className={`settlex-ui-avatar-preview relative grid h-20 w-20 place-items-center overflow-hidden rounded-panel bg-gradient-to-br ${colorOption.gradient} transition group-hover:-translate-y-0.5 motion-reduce:transition-none`}
          >
            {emoji}
            <span
              aria-hidden="true"
              className="settlex-ui-avatar-preview-shadow absolute bottom-2 h-2 w-10 rounded-pill blur-[1px]"
            />
          </span>
          <span className="mt-ui-2 type-caption text-ink-secondary">
            Optional
          </span>
        </>
      }
      className="w-[19rem] p-ui-4"
    >
      <div className="text-center">
        <div className="type-action-small text-ink-secondary">
          Avatar and color
        </div>
        <div className="mt-ui-3">
          <EmojiPicker
            value={emoji}
            onChange={onEmojiChange}
            colorGradient={colorOption.gradient}
          />
        </div>
        <SwatchPicker
          options={PLAYER_COLOR_PICKER_OPTIONS}
          value={color}
          onChange={onColorChange}
          className="mt-ui-3 gap-x-ui-4 gap-y-ui-4"
        />
      </div>
    </Popover>
  );
}

function PlayUsernameForm({
  intent,
  identity,
  onPlayUsernameSubmit,
  onSwitchToAuth,
}) {
  const suggestedIdentity = useRef(buildSuggestedGuestIdentity()).current;
  const [name, setName] = useState(identity.name || suggestedIdentity.name);
  const [emoji, setEmoji] = useState(identity.emoji || suggestedIdentity.emoji);
  const [color, setColor] = useState(
    normalizePlayerColorId(identity.color || suggestedIdentity.color)
  );
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);
  const trimmedName = name.trim();
  const copy = getPlayCopy(intent, trimmedName);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!trimmedName) {
      setStatus("Enter a username.");
      return;
    }

    setSubmitting(true);
    setStatus("");

    try {
      await onPlayUsernameSubmit({
        name: trimmedName,
        usernameSource:
          trimmedName === suggestedIdentity.name ? "generated" : "custom",
        emoji,
        color: normalizePlayerColorId(color),
      });
    } catch (error) {
      setStatus(error?.message || "Unable to create profile.");
      setSubmitting(false);
    }
  };

  return (
    <form className="grid gap-ui-4" onSubmit={handleSubmit}>
      <div className="grid gap-ui-3 text-center">
        <AvatarPreview
          emoji={emoji}
          color={color}
          onEmojiChange={setEmoji}
          onColorChange={(nextColor) => setColor(normalizePlayerColorId(nextColor))}
        />
        <p className="mx-auto max-w-[19rem] type-body-small text-ink-secondary">
          This creates a guest profile on this browser. You can save it later.
        </p>
      </div>

      <label className="grid gap-ui-2 type-label text-ink-secondary">
        Username
        <Input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Username"
          placeholder="Username"
          autoComplete="nickname"
          maxLength={28}
          className="text-center"
        />
      </label>

      <Button
        type="submit"
        size="lg"
        className={`w-full whitespace-normal break-words ${styles.playAction}`}
        disabled={!trimmedName || submitting}
      >
        {submitting ? "Creating profile..." : copy.cta}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="md"
        className="w-full"
        disabled={submitting}
        onClick={onSwitchToAuth}
      >
        Sign in instead
      </Button>

      {status ? (
        <div role="alert" className="settlex-ui-inline-error px-ui-4 py-ui-3 type-body-small">
          {status}
        </div>
      ) : null}
    </form>
  );
}

export function AccountEntryModal({
  open,
  mode,
  intent = "online",
  identity = {},
  authOptions = { emailPassword: true, socialProviders: [] },
  onClose,
  onSwitchToAuth,
  onPlayUsernameSubmit,
  onEmailSignIn,
  onEmailSignUp,
  onSignInProvider,
  onContinueAsGuest,
}) {
  const isPlayMode = mode === "play-username";
  const playCopy = getPlayCopy(intent, identity.name);
  const copy = isPlayMode
    ? {
        title: playCopy.title,
        description: null,
      }
    : MODE_COPY[mode] ?? MODE_COPY["auth-first"];

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={copy.description}
      maxWidthClassName="max-w-md"
      className={`p-ui-5 sm:p-ui-6 ${styles.entry}`}
    >
      {isPlayMode ? (
        <PlayUsernameForm
          intent={intent}
          identity={identity}
          onPlayUsernameSubmit={onPlayUsernameSubmit}
          onSwitchToAuth={onSwitchToAuth}
        />
      ) : (
        <AccountAuthForm
          mode={mode}
          authOptions={authOptions}
          onEmailSignIn={onEmailSignIn}
          onEmailSignUp={onEmailSignUp}
          onSignInProvider={onSignInProvider}
          onContinueAsGuest={onContinueAsGuest}
        />
      )}
    </Dialog>
  );
}
