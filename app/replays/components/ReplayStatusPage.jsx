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
      className="grid min-h-screen place-items-center p-ui-6"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <section className="settlex-ui-pane w-full max-w-md p-ui-5 text-center sm:p-ui-6">
        <h1 className="type-title text-ink-primary">{title}</h1>
        <p className="mt-ui-2 type-body-small text-ink-secondary">
          {description}
        </p>
        {status === "preparing" ? (
          <p className="mt-ui-3 type-caption text-ink-muted">
            {canPoll
              ? `Checking… ${attempt + 1}/10`
              : "Automatic checks finished."}
          </p>
        ) : null}
        <div className="mt-ui-5 grid gap-ui-2 sm:grid-cols-2">
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
