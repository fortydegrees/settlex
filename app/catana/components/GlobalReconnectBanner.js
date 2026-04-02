"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GlassPillButton } from "./GlassPillButton";
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
      <div className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl bg-white/80 px-4 py-3 text-slate-800 shadow-xl ring-1 ring-white/70 backdrop-blur-md">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">
            {"You're already in a game"}
          </div>
          <div className="text-sm text-slate-600">{bodyText}</div>
        </div>

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
      </div>
    </div>
  );
}
