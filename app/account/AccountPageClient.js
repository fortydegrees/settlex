"use client";

import { useEffect, useState } from "react";
import { authClient } from "../../lib/client/authClient";
import { AccountPageView } from "./AccountPageView";

const DEFAULT_AUTH_OPTIONS = Object.freeze({
  emailPassword: true,
  socialProviders: []
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

  const handleEmailSignIn = async ({ email, password }) => {
    const result = await authClient.signIn.email({ email, password });

    if (result?.error) {
      throw new Error(result.error.message || "Unable to authenticate.");
    }

    await refreshAccount();
  };

  const handleEmailSignUp = async ({ email, password }) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name:
        account?.currentUsername ||
        email.split("@")[0] ||
        "Settlehex player",
    });

    if (result?.error) {
      throw new Error(result.error.message || "Unable to authenticate.");
    }

    await refreshAccount();
  };

  const signInWithProvider = async (provider) => {
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
    }
  };

  return (
    <AccountPageView
      account={account}
      authOptions={authOptions}
      onEmailSignIn={handleEmailSignIn}
      onEmailSignUp={handleEmailSignUp}
      onSignInProvider={signInWithProvider}
    />
  );
}
