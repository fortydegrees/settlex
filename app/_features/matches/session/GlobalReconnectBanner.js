"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "../../../ui/Button";
import { GlassPillButton } from "../../../ui/GlassPillButton";
import { StatusBanner } from "../../../ui/StatusBanner";
import { resolveReconnectBannerCandidate } from "./reconnectBanner";

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

    const refreshCandidate = async () => {
      let nextCandidate = null;
      try {
        nextCandidate = await resolveReconnectBannerCandidate({
          pathname,
          storage: window.localStorage
        });
      } catch {
        // Accessing localStorage itself can fail; recovery is an optional hint.
      }
      if (!cancelled) {
        setCandidate(nextCandidate);
      }
    };
    void refreshCandidate();

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
