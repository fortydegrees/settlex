"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authClient } from "../../lib/client/authClient";
import { CATANA_TABLE_BACKGROUND } from "../catana/theme/backgrounds";

const DEFAULT_AUTH_OPTIONS = Object.freeze({
  emailPassword: true,
  socialProviders: []
});

const AUTH_PROVIDER_LABELS = Object.freeze({
  discord: "Continue with Discord",
  google: "Continue with Google"
});

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export function AccountPageClient() {
  const [account, setAccount] = useState(null);
  const [authOptions, setAuthOptions] = useState(DEFAULT_AUTH_OPTIONS);
  const [authMode, setAuthMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState("");

  const refreshAccount = async () => {
    return fetch("/api/account/me", { cache: "no-store" })
      .then(safeJson)
      .then((data) => setAccount(data?.account ?? null))
      .catch(() => setAccount(null));
  };

  useEffect(() => {
    refreshAccount();
    fetch("/api/auth/options", { cache: "no-store" })
      .then(safeJson)
      .then((data) =>
        setAuthOptions({
          emailPassword: data?.emailPassword !== false,
          socialProviders: Array.isArray(data?.socialProviders)
            ? data.socialProviders
            : []
        })
      )
      .catch(() => setAuthOptions(DEFAULT_AUTH_OPTIONS));
  }, []);

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
      const result =
        authMode === "signUp"
          ? await authClient.signUp.email({
              email: normalizedEmail,
              password,
              name:
                account?.currentUsername ||
                normalizedEmail.split("@")[0] ||
                "Settlehex player",
            })
          : await authClient.signIn.email({
              email: normalizedEmail,
              password,
            });

      if (result?.error) {
        throw new Error(result.error.message || "Unable to authenticate.");
      }

      setStatusMessage(
        authMode === "signUp" ? "Account created." : "Signed in."
      );
      setPassword("");
      await refreshAccount();
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
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
        errorCallbackURL: window.location.href,
        disableRedirect: true,
      });

      if (result?.error) {
        throw new Error(result.error.message || "Unable to start sign in.");
      }

      if (result?.data?.url) {
        window.location.assign(result.data.url);
        return;
      }

      setStatusMessage("Sign in started.");
    } catch (error) {
      setStatusMessage(error?.message ?? "Unable to start sign in.");
    } finally {
      setIsSubmitting("");
    }
  };

  const socialProviders = authOptions.socialProviders.filter(
    (provider) => AUTH_PROVIDER_LABELS[provider]
  );
  const emailSubmitLabel =
    authMode === "signUp" ? "Create account" : "Sign in";

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
              {account?.currentUsername ?? "No profile yet"}
            </h1>
            <p className="mt-2 text-sm text-slate-700">
              {account
                ? account.status === "claimed"
                  ? "Your profile is connected to a sign-in method."
                  : "You are playing as a guest. Connect a provider to keep this profile across devices."
                : "Create a profile from the home table, then connect a provider here."}
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
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full px-3 py-2 text-sm font-bold transition ${
                    authMode === mode
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:bg-white/45 hover:text-slate-900"
                  }`}
                  onClick={() => setAuthMode(mode)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Email
              <input
                type="email"
                autoComplete="email"
                className="w-full rounded-xl bg-white/65 px-3 py-3 text-sm font-semibold text-slate-900 shadow-inner ring-1 ring-white/60 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/85"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">
              Password
              <input
                type="password"
                autoComplete={authMode === "signUp" ? "new-password" : "current-password"}
                className="w-full rounded-xl bg-white/65 px-3 py-3 text-sm font-semibold text-slate-900 shadow-inner ring-1 ring-white/60 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white/85"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
              />
            </label>
            <button
              type="submit"
              className="rounded-xl bg-lime-500 px-4 py-3 text-center text-sm font-black text-white shadow-md transition hover:bg-lime-600 disabled:bg-slate-300 disabled:text-slate-500"
              disabled={Boolean(isSubmitting)}
            >
              {isSubmitting === "email" ? "Working..." : emailSubmitLabel}
            </button>
          </form>
        ) : null}

        {socialProviders.length > 0 ? (
          <div className="mt-5 grid gap-2 border-t border-white/45 pt-5">
            {socialProviders.map((provider) => (
              <button
                key={provider}
                type="button"
                className="rounded-xl bg-white/80 px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-md ring-1 ring-white/70 transition hover:bg-white disabled:bg-slate-100 disabled:text-slate-400"
                disabled={Boolean(isSubmitting)}
                onClick={() => signInWithProvider(provider)}
              >
                {isSubmitting === provider
                  ? `Opening ${provider}...`
                  : AUTH_PROVIDER_LABELS[provider]}
              </button>
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
