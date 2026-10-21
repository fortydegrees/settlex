"use client";

import { useEffect, useState } from "react";
import { getLobbyServerOrigin } from "../utils/serverOrigins";

export function useIdleAcknowledgement({
  matchID, playerID, credentials, activeIdlePlayerId, isGameOver
}) {
  const [idleAckError, setIdleAckError] = useState(null);
  const [isAcknowledgingIdle, setIsAcknowledgingIdle] = useState(false);

  useEffect(() => {
    setIdleAckError(null);
    setIsAcknowledgingIdle(false);
  }, [matchID]);

  useEffect(() => {
    if (isGameOver || activeIdlePlayerId == null) {
      setIdleAckError(null);
      setIsAcknowledgingIdle(false);
    }
  }, [activeIdlePlayerId, isGameOver]);

  const handleAcknowledgeIdle = async () => {
    if (isAcknowledgingIdle) return;
    if (!matchID || playerID == null) return;
    if (typeof window === "undefined") return;
    if (!credentials) {
      setIdleAckError("Missing player credentials.");
      return;
    }

    setIsAcknowledgingIdle(true);
    setIdleAckError(null);
    try {
      const baseUrl = getLobbyServerOrigin();
      const response = await fetch(`${baseUrl}/idle/${matchID}/ack`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerID,
          credentials: credentials
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Unable to clear idle warning.");
      }

      setIdleAckError(null);
    } catch (error) {
      setIdleAckError(error?.message ?? "Unable to clear idle warning.");
    } finally {
      setIsAcknowledgingIdle(false);
    }
  };

  return { idleAckError, isAcknowledgingIdle, handleAcknowledgeIdle };
}
