"use client";

import { useMemo } from "react";
import { Client } from "boardgame.io/react";
import { createSandboxGame } from "./createSandboxGame";
import { SandboxBoardShell } from "./SandboxBoardShell";

export function SandboxClient() {
  const SandboxMatch = useMemo(
    () =>
      Client({
        game: createSandboxGame(),
        board: SandboxBoardShell,
        debug: false
      }),
    []
  );

  return <SandboxMatch />;
}
