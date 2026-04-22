"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { Input } from "../../ui/Input";
import { Panel } from "../../ui/Panel";

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
      maxWidthClassName="max-w-md"
    >
      <Panel title="Share Link" bodyClassName="p-4">
        <div className="flex gap-2">
          <Input readOnly value={shareUrl} className="min-w-0 flex-1 text-sm" />
          <Button type="button" variant="secondary" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        {!isExpired && timeRemaining && (
          <div className="mt-2 text-xs text-slate-500">
            Expires in {timeRemaining}
          </div>
        )}
      </Panel>

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
