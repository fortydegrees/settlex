"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
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
      className="min-h-screen px-4 py-10 text-slate-800"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <div className="mx-auto max-w-xl rounded-3xl bg-white/35 p-6 shadow-xl ring-1 ring-white/50 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
              Settlehex account
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {profileCopy.title}
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              {profileCopy.description}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-md ring-1 ring-white/70"
          >
            Back
          </Link>
        </div>

        {authOptions.emailPassword ? (
          <form className="mt-6 grid gap-3" onSubmit={handleEmailAuth}>
            <div
              className="grid grid-cols-2 gap-1 rounded-full bg-white/45 p-1 ring-1 ring-white/60"
              aria-label="Email auth mode"
            >
              {[
                ["signIn", "Sign in"],
                ["signUp", "Create account"]
              ].map(([mode, label]) => (
                <Button
                  key={mode}
                  type="button"
                  variant={authMode === mode ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full shadow-none"
                  onClick={() => setAuthMode(mode)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Email
              <Input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
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
          <div className="mt-5 grid gap-2 border-t border-white/45 pt-5">
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
          <div className="mt-4 rounded-2xl bg-white/70 px-4 py-3 text-sm text-slate-700 ring-1 ring-white/70">
            {statusMessage}
          </div>
        ) : null}
      </div>
    </main>
  );
}
