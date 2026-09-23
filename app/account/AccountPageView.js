"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EmailAuthModeToggle } from "./EmailAuthModeToggle";
import { CATANA_TABLE_BACKGROUND } from "../catana/theme/backgrounds";

const AUTH_PROVIDER_LABELS = Object.freeze({
  discord: "Continue with Discord",
  google: "Continue with Google"
});

export function getAccountProfileCopy(account) {
  if (!account) {
    return {
      title: "No profile yet",
      description:
        "Create a profile from the home table, then connect a provider here.",
    };
  }
  if (account.status === "claimed") {
    return {
      title: account.currentUsername,
      description: "Your profile is connected to a sign-in method.",
    };
  }
  return {
    title: account.currentUsername,
    description:
      "You are playing as a guest. Connect a provider to keep this profile across devices.",
  };
}

export function AccountPageView({
  account,
  authOptions = { emailPassword: true, socialProviders: [] },
  onEmailSignIn,
  onEmailSignUp,
  onSignInProvider,
}) {
  const [authMode, setAuthMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState("");
  const profileCopy = getAccountProfileCopy(account);
  const socialProviders = authOptions.socialProviders.filter(
    (provider) => AUTH_PROVIDER_LABELS[provider]
  );
  const emailSubmitLabel =
    authMode === "signUp" ? "Create account" : "Sign in";

  const handleEmailAuth = async (event) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setStatusMessage("Enter an email and password.");
      return;
    }

    setIsSubmitting("email");
    setStatusMessage("");

    try {
      if (authMode === "signUp") {
        await onEmailSignUp({ email: normalizedEmail, password });
      } else {
        await onEmailSignIn({ email: normalizedEmail, password });
      }

      setStatusMessage(
        authMode === "signUp" ? "Account created." : "Signed in."
      );
      setPassword("");
    } catch (error) {
      setStatusMessage(error?.message ?? "Unable to authenticate.");
    } finally {
      setIsSubmitting("");
    }
  };

  const signInWithProvider = async (provider) => {
    setIsSubmitting(provider);
    setStatusMessage("");

    try {
      await onSignInProvider(provider);
      setStatusMessage("Sign in started.");
    } catch (error) {
      setStatusMessage(error?.message ?? "Unable to start sign in.");
    } finally {
      setIsSubmitting("");
    }
  };

  return (
    <main
      className="min-h-screen px-ui-4 py-ui-10 text-ink-primary"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="settlex-ui-pane mx-auto max-w-xl p-ui-5 sm:p-ui-6">
        <div className="flex items-start justify-between gap-ui-4">
          <div className="min-w-0">
            <p className="settlex-ui-label">
              Settlehex account
            </p>
            <h1 className="mt-ui-2 break-words type-title text-ink-primary">
              {profileCopy.title}
            </h1>
            <p className="mt-ui-2 type-body-small text-ink-secondary">
              {profileCopy.description}
            </p>
          </div>
          <Link
            href="/"
            className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus min-h-[2.75rem] shrink-0 px-ui-4 py-ui-2 type-action-small"
          >
            Back
          </Link>
        </div>

        {authOptions.emailPassword ? (
          <form className="mt-ui-6 grid gap-ui-3" onSubmit={handleEmailAuth}>
            <EmailAuthModeToggle value={authMode} onChange={setAuthMode} />
            <label className="grid gap-ui-2 type-label text-ink-secondary">
              Email
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-ui-2 type-label text-ink-secondary">
              Password
              <Input
                type="password"
                autoComplete={
                  authMode === "signUp" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
            </label>
            <Button
              type="submit"
              size="md"
              className="w-full"
              disabled={Boolean(isSubmitting)}
            >
              {isSubmitting === "email" ? "Working..." : emailSubmitLabel}
            </Button>
          </form>
        ) : null}

        {socialProviders.length > 0 ? (
          <div className="mt-ui-6 grid gap-ui-2 border-t border-edge-subtle pt-ui-6">
            {socialProviders.map((provider) => (
              <Button
                key={provider}
                type="button"
                variant="secondary"
                size="md"
                className="w-full justify-start"
                disabled={Boolean(isSubmitting)}
                onClick={() => signInWithProvider(provider)}
              >
                {isSubmitting === provider
                  ? `Opening ${provider}...`
                  : AUTH_PROVIDER_LABELS[provider]}
              </Button>
            ))}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="settlex-ui-inset mt-ui-4 break-words px-ui-4 py-ui-3 type-body-small text-ink-secondary">
            {statusMessage}
          </div>
        ) : null}
      </div>
    </main>
  );
}
