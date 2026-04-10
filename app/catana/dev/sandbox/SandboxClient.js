"use client";

import { useEffect, useMemo, useState } from "react";
import { Client } from "boardgame.io/react";
import { createSandboxGame } from "./createSandboxGame";
import { SandboxBoardShell } from "./SandboxBoardShell";
import {
  SANDBOX_PRESETS,
  cloneSandboxPreset,
  coerceViewerSeat
} from "./presets";

export function SandboxClient() {
  const [selectedPresetId] = useState(SANDBOX_PRESETS[0].id);
  const [viewerSeat, setViewerSeat] = useState(
    SANDBOX_PRESETS[0].defaultViewerSeat
  );
  const [resetVersion] = useState(0);
  const preset = useMemo(
    () => cloneSandboxPreset(selectedPresetId),
    [selectedPresetId]
  );

  useEffect(() => {
    setViewerSeat((currentSeat) => coerceViewerSeat(preset, currentSeat));
  }, [preset]);

  const SandboxMatch = useMemo(
    () =>
      Client({
        game: createSandboxGame(preset),
        numPlayers: preset.numPlayers,
        board: SandboxBoardShell,
        debug: false
      }),
    [preset]
  );

  return (
    <SandboxMatch
      key={`${preset.id}:${resetVersion}`}
      playerID={coerceViewerSeat(preset, viewerSeat)}
    />
  );
}
