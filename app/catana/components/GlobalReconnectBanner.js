"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../../ui/Button";
import { GlassPillButton } from "./GlassPillButton";
import { StatusBanner } from "./StatusBanner";
import { resolveReconnectBannerCandidate } from "../utils/reconnectBanner";

export function getReconnectStatusBannerProps(candidate) {
  return {
    variant: "neutral",
    title: "You're already in a game",
    body: candidate?.playerName
      ? `Return to your latest match as ${candidate.playerName}.`
      : "Return to your latest match.",
    className: "max-w-2xl",
  };
}

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

  const statusBannerProps = getReconnectStatusBannerProps(candidate);

  return (
    <StatusBanner
      overlay
      {...statusBannerProps}
      actions={
        <>
          <GlassPillButton
            className="w-full justify-center sm:w-auto sm:min-w-[11rem]"
            onClick={() => router.push(candidate.href)}
          >
            Rejoin match
          </GlassPillButton>

          <Button
            variant="ghost"
            className="w-full justify-center sm:w-auto"
            onClick={() => setDismissed(true)}
          >
            Dismiss
          </Button>
        </>
      }
    />
  );
}
