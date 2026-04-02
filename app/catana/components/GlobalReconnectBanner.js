"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlassPillButton } from "./GlassPillButton";
import { StatusBanner } from "./StatusBanner";
import { resolveReconnectBannerCandidate } from "../utils/reconnectBanner";

export function GlobalReconnectBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    if (dismissed || typeof window === "undefined") return;

    let cancelled = false;
    setCandidate(null);

    resolveReconnectBannerCandidate({
      pathname,
      storage: window.localStorage
    }).then((nextCandidate) => {
      if (!cancelled) {
        setCandidate(nextCandidate);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pathname, dismissed]);

  if (dismissed || !candidate) return null;

  const bodyText = candidate.playerName
    ? `Return to your latest Catana match as ${candidate.playerName}.`
    : "Return to your latest Catana match.";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex justify-center px-4">
      <StatusBanner
        variant="neutral"
        title={"You're already in a game"}
        body={bodyText}
        className="pointer-events-auto w-full max-w-xl"
        actions={
          <>
            <GlassPillButton onClick={() => router.push(candidate.href)}>
              Rejoin match
            </GlassPillButton>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/60 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
            >
              Dismiss
            </button>
          </>
        }
      />
    </div>
  );
}
