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
  const [selectedPresetId, setSelectedPresetId] = useState(SANDBOX_PRESETS[0].id);
  const [viewerSeat, setViewerSeat] = useState(
    SANDBOX_PRESETS[0].defaultViewerSeat
  );
  const [resetVersion, setResetVersion] = useState(0);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const preset = useMemo(
    () => cloneSandboxPreset(selectedPresetId),
    [selectedPresetId]
  );
  const resolvedViewerSeat = coerceViewerSeat(preset, viewerSeat);

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
      playerID={resolvedViewerSeat}
      preset={preset}
      presets={SANDBOX_PRESETS}
      viewerSeat={resolvedViewerSeat}
      isPanelCollapsed={isPanelCollapsed}
      onPresetChange={setSelectedPresetId}
      onViewerSeatChange={setViewerSeat}
      onReset={() => setResetVersion((currentVersion) => currentVersion + 1)}
      onTogglePanelCollapsed={() =>
        setIsPanelCollapsed((currentCollapsed) => !currentCollapsed)
      }
    />
  );
}
