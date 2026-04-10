import { useMemo } from "react";
import { GameScreenWithEffects } from "../../GameScreen";
import { buildSandboxMatchMetadata } from "./presets";

export function SandboxBoardShell(bgioProps) {
  const playerIds = bgioProps.G?.core?.players?.map(String) ?? [];
  const playerIdsKey = playerIds.join("|");
  const matchMetadata = useMemo(
    () => buildSandboxMatchMetadata({ playerIds }),
    [playerIdsKey]
  );

  return (
    <GameScreenWithEffects
      {...bgioProps}
      matchID="dev-sandbox"
      isConnected={true}
      isMultiplayer={false}
      timerSnapshot={null}
      disconnectPresence={null}
      idlePresence={null}
      matchData={matchMetadata}
      matchMetadata={matchMetadata}
    />
  );
}
