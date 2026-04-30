"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Input } from "../../ui/Input";
import { cn } from "../../ui/cn";

const formatTimeRemaining = (expiresAt) => {
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return "";
  }

  const remainingMs = Math.max(expiresAtMs - Date.now(), 0);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

function CopyIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.25 5.75A2.5 2.5 0 0 1 9.75 3.25h5a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-5a2.5 2.5 0 0 1-2.5-2.5v-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4.5 15.5A1.75 1.75 0 0 1 2.75 13.75V7.5A1.75 1.75 0 0 1 4.5 5.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon(props) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="m4.75 10.5 3.25 3.25 7.25-7.25"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FriendChallengeModal({
  phase = "waiting",
  challengeUrl,
  expiresAt,
  onClose,
}) {
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(
    () => formatTimeRemaining(expiresAt)
  );

  const shareUrl = useMemo(() => {
    if (!challengeUrl) {
      return "";
    }

    if (typeof window === "undefined") {
      return challengeUrl;
    }

    return new URL(challengeUrl, window.location.origin).toString();
  }, [challengeUrl]);

  useEffect(() => {
    if (phase !== "waiting" || !expiresAt) {
      setTimeRemaining("");
      return;
    }

    const update = () => {
      setTimeRemaining(formatTimeRemaining(expiresAt));
    };

    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, [expiresAt, phase]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => clearTimeout(timeoutId);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch (error) {
      setCopied(false);
    }
  };

  const isExpired = phase === "expired";
  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      onClose();
    }
  };

  return (
    <Dialog
      open
      onOpenChange={handleOpenChange}
      title={isExpired ? "Challenge expired" : "Waiting for friend to join"}
      description={
        isExpired
          ? "Your friend did not join in time."
          : "Keep this open while your friend joins. Closing it cancels the invite."
      }
      maxWidthClassName="max-w-lg"
    >
      <div className="mt-4 rounded-[1.45rem] border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(191,219,254,0.14))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Invite Link
          </div>
          {!isExpired && timeRemaining ? (
            <div className="shrink-0 rounded-full border border-white/42 bg-white/42 px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
              Expires in {timeRemaining}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "mt-3 rounded-[1.25rem] border p-1.5 transition-[border-color,background-color,box-shadow] duration-[var(--settlex-ui-duration-fast)]",
            copied
              ? "border-lime-200/80 bg-[linear-gradient(180deg,rgba(236,252,203,0.95),rgba(217,249,157,0.72))] shadow-[0_18px_34px_-24px_rgba(101,163,13,0.52),inset_0_1px_0_rgba(255,255,255,0.3)]"
              : "border-white/34 bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(239,246,255,0.3))] shadow-[0_18px_34px_-24px_rgba(15,23,42,0.3),inset_0_1px_0_rgba(255,255,255,0.24)]"
          )}
        >
          <div className="flex items-stretch gap-0">
            <Input
              readOnly
              value={shareUrl}
              onClick={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 border-transparent bg-transparent px-4 py-3 text-sm font-medium text-slate-800 shadow-none focus:ring-0 focus-visible:ring-0 rounded-r-[0.45rem] border-r-0 pr-3"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              aria-label={copied ? "Link copied" : "Copy invite link"}
              className={cn(
                "w-[3.5rem] shrink-0 rounded-l-[0.45rem] rounded-r-[0.95rem] border-white/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,255,0.78))] px-0 shadow-none hover:translate-y-0 active:translate-y-0",
                copied &&
                  "border-lime-200/85 bg-[linear-gradient(180deg,rgba(236,252,203,1),rgba(217,249,157,0.82))] text-lime-900"
              )}
            >
              <span className="inline-flex items-center justify-center">
                {copied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </span>
            </Button>
          </div>
        </div>
        <div
          className={cn(
            "mt-2 text-xs transition-colors duration-[var(--settlex-ui-duration-fast)]",
            copied ? "text-lime-700" : "text-slate-500"
          )}
        >
          {copied
            ? "Link copied. Send it to your friend to join instantly."
            : "Send this link to invite your friend directly into the match."}
        </div>
      </div>

      <Button
        type="button"
        onClick={onClose}
        variant={isExpired ? "secondary" : "danger"}
        className="mt-5 w-full"
      >
        {isExpired ? "Close" : "Close & cancel invite"}
      </Button>
    </Dialog>
  );
}
