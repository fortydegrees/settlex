"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../ui/Button";
import { CATANA_TABLE_BACKGROUND } from "../../catana/theme/backgrounds";

const COPY = {
  preparing: [
    "Preparing replay…",
    "The finished match is being archived.",
  ],
  active: [
    "Replay available after the match",
    "This match is still in progress.",
  ],
  invalid: [
    "Replay unavailable",
    "The archived match could not be reconstructed.",
  ],
};

export function ReplayStatusPage({ matchID, status }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const canPoll = status === "preparing" && attempt < 10;

  useEffect(() => {
    if (!canPoll) return undefined;
    const timeoutId = window.setTimeout(() => {
      setAttempt((value) => value + 1);
      router.refresh();
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [attempt, canPoll, router]);

  const [title, description] = COPY[status] ?? COPY.invalid;

  return (
    <main
      className="grid min-h-screen place-items-center p-6"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <section className="w-full max-w-md rounded-[1.4rem] border border-white/60 bg-blue-100/90 p-6 text-center shadow-2xl ring-1 ring-white/40 backdrop-blur-2xl">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm font-medium text-slate-600">
          {description}
        </p>
        {status === "preparing" ? (
          <p className="mt-3 text-xs font-bold text-slate-500">
            {canPoll
              ? `Checking… ${attempt + 1}/10`
              : "Automatic checks finished."}
          </p>
        ) : null}
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {status !== "active" ? (
            <Button
              variant="primary"
              onClick={() => {
                setAttempt(0);
                router.refresh();
              }}
            >
              Retry
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={() => {
              if (status === "invalid") {
                router.push("/");
                return;
              }
              router.push(`/g/${encodeURIComponent(matchID)}`);
            }}
          >
            {status === "invalid" ? "Return to lobby" : "Return to game"}
          </Button>
        </div>
      </section>
    </main>
  );
}
