"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { joinAlertMatch } from "./matchAlertJoin.js";

const initialDialogState = (alert) => {
  if (alert?.status === "open") return "confirm";
  if (alert?.status === "stale") return "stale";
  if (alert?.status === "error") return "error";
  return "checking";
};

export function MatchAlertDialog({
  alert,
  currentGame,
  onClose,
  onJoiningChange = () => {},
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initialDialogState(alert));
  const joiningRef = useRef(false);

  useEffect(() => {
    if (joiningRef.current) return;
    joiningRef.current = false;
    setState(initialDialogState(alert));
  }, [alert]);

  if (!alert) return null;

  const seekerName = alert.seekerName || "Someone";
  const isJoining = state === "joining";
  const isPufferGame = currentGame?.opponentType === "bot";

  const close = () => {
    if (isJoining) return;
    onClose();
  };

  const handleJoin = async () => {
    if (joiningRef.current) return;
    joiningRef.current = true;
    onJoiningChange(true);
    setState("joining");

    try {
      const result = await joinAlertMatch({
        matchID: alert.matchID,
        currentGame,
      });
      if (result.status === "stale") {
        setState("stale");
        return;
      }
      if (result.status !== "joined") {
        setState("error");
        return;
      }
      onClose();
      router.push(`/g/${result.matchID}`);
    } catch {
      setState("error");
    } finally {
      joiningRef.current = false;
      onJoiningChange(false);
    }
  };

  const keepLooking = () => {
    onClose();
    window.location.assign("/?playOnline=1");
  };

  let title = "Checking that table…";
  let description = "Making sure the seat is still open.";
  if (state === "confirm" || state === "joining") {
    title = `${seekerName} is looking for a duel`;
    description = isPufferGame
      ? `Leave your Puffer game and join ${seekerName}?`
      : "Take the open seat?";
  } else if (state === "stale") {
    title = "That table has already filled";
    description =
      "Someone else got there first. Match alerts are still on, or we can find you another duel.";
  } else if (state === "error") {
    title = "We couldn’t join that table";
    description = "Check your connection, or look for another open duel.";
  }

  const actions =
    state === "confirm" || state === "joining" ? (
      <>
        <Button variant="secondary" onClick={close} disabled={isJoining}>
          Not now
        </Button>
        <Button onClick={handleJoin} disabled={isJoining}>
          {isJoining ? "Joining…" : "Join duel"}
        </Button>
      </>
    ) : state === "stale" || state === "error" ? (
      <>
        <Button variant="secondary" onClick={close}>
          Not now
        </Button>
        <Button onClick={keepLooking}>Keep looking</Button>
      </>
    ) : (
      <Button variant="secondary" onClick={close}>
        Not now
      </Button>
    );

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
      }}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
