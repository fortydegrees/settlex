"use client";

import React, { useEffect, useMemo, useState } from "react";

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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch (error) {
      setCopied(false);
    }
  };

  const isExpired = phase === "expired";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-xl bg-blue-200/95 p-6 shadow-2xl ring-2 ring-slate-300">
        <h2 className="text-center text-lg font-bold text-slate-800">
          {isExpired ? "Challenge expired" : "Waiting for friend to join"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isExpired
            ? "Your friend did not join in time."
            : "Keep this open while your friend joins. Closing it cancels the invite."}
        </p>

        <div className="mt-5 rounded-xl bg-white/50 p-3 shadow-inner ring-1 ring-white/60">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-700">
            Share link
          </label>
          <div className="mt-2 flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-inner ring-1 ring-white/60"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-white/60 transition hover:bg-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {!isExpired && timeRemaining && (
            <div className="mt-2 text-xs text-slate-500">
              Expires in {timeRemaining}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${
            isExpired
              ? "bg-slate-600 hover:bg-slate-700"
              : "bg-rose-500 hover:bg-rose-600"
          }`}
        >
          {isExpired ? "Close" : "Close & cancel invite"}
        </button>
      </div>
    </div>
  );
}
