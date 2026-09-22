"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  EnvelopeIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Input } from "../../ui/Input";
import { Popover } from "../../ui/Popover";
import { SwatchPicker } from "../../ui/SwatchPicker";
import {
  PLAYER_COLOR_PICKER_OPTIONS,
  getPlayerColorOption,
  normalizePlayerColorId,
} from "../theme/playerColors";
import { EmojiPicker } from "./IdentityModal";
import { buildSuggestedGuestIdentity } from "./playerIdentityStorage";

const AUTH_PROVIDER_LABELS = Object.freeze({
  discord: "Continue with Discord",
  google: "Continue with Google",
});

const MODE_COPY = Object.freeze({
  "auth-first": {
    title: "Sign in or play as guest",
    description:
      "Use email or a provider to keep your profile across devices, or keep playing as a guest.",
    submit: "Sign in",
  },
  "save-profile": {
    title: "Save this profile",
    description:
      "Attach email or a provider so this username and profile are recoverable later.",
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
    <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center text-sm font-bold text-slate-600">
      {provider === "discord" ? "D" : "G"}
    </span>
  );
}

function AuthModeToggle({ value, onChange }) {
  return (
    <div
      className="settlex-ui-inset grid grid-cols-2 gap-1 p-1"
      aria-label="Email auth mode"
    >
      {[
        ["signIn", "Sign in"],
        ["signUp", "Create account"],
      ].map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          className={`settlex-ui-focus min-h-[2.75rem] rounded-lg px-3 py-2 text-sm font-semibold ${
            value === mode
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:bg-white/48 hover:text-slate-900"
          }`}
          onClick={() => onChange(mode)}
        >
          {label}
        </button>
      ))}
    </div>
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
    <div className="grid gap-4">
      {authOptions.emailPassword ? (
        <form className="grid gap-3" onSubmit={handleEmailSubmit}>
          <AuthModeToggle value={authMode} onChange={setAuthMode} />

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Email
            <span className="relative">
              <EnvelopeIcon
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="pl-10"
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Password
            <span className="relative">
              <LockClosedIcon
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <Input
                type="password"
                autoComplete={authMode === "signUp" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="pl-10"
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
        <div className="grid gap-2 border-t border-slate-200/80 pt-4">
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
        <div role="status" className="settlex-ui-inset px-4 py-3 text-sm text-slate-700">
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
      triggerClassName="settlex-ui-focus group mx-auto flex flex-col items-center rounded-lg"
      triggerContent={
        <>
          <span
            className={`relative grid h-20 w-20 place-items-center overflow-hidden rounded-[1.45rem] bg-gradient-to-br ${colorOption.gradient} text-5xl shadow-[0_20px_42px_-28px_rgba(15,23,42,0.68)] ring-4 ring-white/80 transition group-hover:-translate-y-0.5 motion-reduce:transition-none`}
          >
            {emoji}
            <span
              aria-hidden="true"
              className="absolute bottom-2 h-2 w-10 rounded-full bg-black/18 blur-[1px]"
            />
          </span>
          <span className="mt-2 text-xs font-medium text-slate-600">
            Optional
          </span>
        </>
      }
      className="w-[19rem] p-4"
    >
      <div className="text-center">
        <div className="text-sm font-semibold text-slate-700">
          Avatar and color
        </div>
        <div className="mt-3">
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
          className="mt-3 gap-x-4 gap-y-4"
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
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 text-center">
        <AvatarPreview
          emoji={emoji}
          color={color}
          onEmojiChange={setEmoji}
          onColorChange={(nextColor) => setColor(normalizePlayerColorId(nextColor))}
        />
        <p className="mx-auto max-w-[19rem] text-sm leading-relaxed text-slate-600">
          This creates a guest profile on this browser. You can save it later.
        </p>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Username
        <Input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Username"
          placeholder="Username"
          autoComplete="nickname"
          maxLength={28}
          className="text-center text-base font-semibold"
        />
      </label>

      <Button
        type="submit"
        size="lg"
        className="w-full whitespace-normal break-words"
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
        <div role="alert" className="rounded-[var(--settlex-ui-radius-control)] bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200/70">
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
      className="p-5 sm:p-6"
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
