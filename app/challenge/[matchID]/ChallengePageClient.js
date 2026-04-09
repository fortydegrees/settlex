"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { IdentityModal } from "../../catana/lobby/IdentityModal";
import { readStoredPlayerIdentity } from "../../catana/lobby/playerIdentityStorage";
import {
  getCredentialsStorageKey,
  writeLastActiveMatch,
} from "../../catana/utils/activeMatchStorage";

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

const appRequest = async ({ route, init }) => {
  const response = await fetch(route, init);
  if (response.ok) {
    return safeJson(response);
  }

  const details = await safeJson(response);
  throw new Error(
    details?.error ?? details?.message ?? `HTTP ${response.status} ${response.statusText}`
  );
};

const persistJoinedSeat = ({ matchID, playerID, credentials, playerName }) => {
  if (!credentials) {
    throw new Error("Join succeeded but returned no credentials.");
  }

  window.localStorage.setItem(
    getCredentialsStorageKey({ matchID, playerID }),
    credentials
  );
  writeLastActiveMatch(window.localStorage, {
    matchID,
    playerID: String(playerID),
    playerName,
  });
};

const isExpiredError = (error) =>
  /expired/i.test(error?.message ?? "");

export function ChallengePageClient({ matchID }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [initialIdentity, setInitialIdentity] = useState({
    name: "",
    emoji: "",
    color: "",
  });

  const acceptChallenge = useCallback(
    async (playerName) => {
      const joined = await appRequest({
        route: `/api/challenges/${matchID}/accept`,
        init: {
          method: "POST",
        },
      });

      persistJoinedSeat({
        matchID,
        playerID: joined?.playerID,
        credentials: joined?.playerCredentials,
        playerName,
      });

      router.push(`/g/${matchID}?playerID=${encodeURIComponent(joined.playerID)}`);
    },
    [matchID, router]
  );

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const challenge = await appRequest({
          route: `/api/challenges/${matchID}`,
        });

        if (challenge?.status !== "pending") {
          if (isMounted) {
            setStatus("expired");
          }
          return;
        }

        const current = await appRequest({
          route: "/api/account/me",
        }).catch(() => ({ account: null }));

        if (!isMounted) {
          return;
        }

        if (current?.account) {
          setStatus("joining");
          await acceptChallenge(current.account.currentUsername);
          return;
        }

        setInitialIdentity(readStoredPlayerIdentity(window.localStorage));
        setStatus("identity");
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err?.message ?? "Failed to load challenge.");
        setStatus(isExpiredError(err) ? "expired" : "identity");
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [acceptChallenge, matchID]);

  const handleIdentitySubmit = useCallback(
    async ({ name, emoji, color }) => {
      try {
        setError("");
        setStatus("joining");

        const guestResponse = await appRequest({
          route: "/api/account/guest",
          init: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: name,
              avatarEmoji: emoji,
              avatarColor: color,
            }),
          },
        });

        await acceptChallenge(guestResponse?.account?.currentUsername ?? name);
      } catch (err) {
        setError(err?.message ?? "Failed to join challenge.");
        setStatus(isExpiredError(err) ? "expired" : "identity");
      }
    },
    [acceptChallenge]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600">
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 py-12">
        <div className="w-full rounded-xl bg-white/25 p-6 shadow-lg ring-1 ring-white/30 backdrop-blur-sm">
          <h1 className="text-center text-2xl font-bold text-slate-800">
            Friend Challenge
          </h1>

          {status === "expired" ? (
            <p className="mt-3 text-center text-sm text-slate-700">
              This invite has expired.
            </p>
          ) : (
            <p className="mt-3 text-center text-sm text-slate-700">
              {status === "joining"
                ? "Joining game..."
                : status === "identity"
                ? "Pick how you want to join."
                : "Checking this invite..."}
            </p>
          )}

          {error && status !== "expired" && (
            <div className="mt-4 rounded-lg bg-rose-100 px-4 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
              {error}
            </div>
          )}
        </div>
      </div>

      {status === "identity" && (
        <IdentityModal
          onSubmit={handleIdentitySubmit}
          onClose={() => router.push("/")}
          initialName={initialIdentity.name}
          initialEmoji={initialIdentity.emoji}
          initialColor={initialIdentity.color}
        />
      )}
    </div>
  );
}
