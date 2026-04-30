import { useEffect } from "react";
import { GameScreenWithEffects } from "../../GameScreen";
import { buildSandboxMatchMetadata } from "./presets";
import { SandboxPanel } from "./SandboxPanel";
import {
  buildSandboxActivePlayers,
  serializeActivePlayers
} from "./activePlayers";

export function SandboxBoardShell({
  preset,
  presets,
  viewerSeat,
  isPanelCollapsed,
  onPresetChange,
  onViewerSeatChange,
  onReset,
  onTogglePanelCollapsed,
  ...bgioProps
}) {
  const playerIds = bgioProps.G?.core?.players?.map(String) ?? [];
  const matchMetadata = buildSandboxMatchMetadata({ playerIds });
  const moves = bgioProps.moves;
  const desiredActivePlayers = buildSandboxActivePlayers(bgioProps.G);
  const currentActivePlayersKey = serializeActivePlayers(
    bgioProps.ctx?.activePlayers
  );
  const desiredActivePlayersKey = serializeActivePlayers(desiredActivePlayers);

  useEffect(() => {
    if (!desiredActivePlayers) {
      return;
    }
    if (currentActivePlayersKey === desiredActivePlayersKey) {
      return;
    }
    if (typeof bgioProps.events?.setActivePlayers !== "function") {
      return;
    }
    bgioProps.events.setActivePlayers({ value: desiredActivePlayers });
  }, [
    bgioProps.events,
    currentActivePlayersKey,
    desiredActivePlayers,
    desiredActivePlayersKey
  ]);

  const handleGiveResource = (resource) => {
    if (typeof moves.DEBUG_takeCardsFromBank !== "function") {
      return;
    }
    moves.DEBUG_takeCardsFromBank(viewerSeat, [resource]);
  };

  const handleGiveDevCard = (cardType) => {
    if (typeof moves.DEBUG_takeDevCards !== "function") {
      return;
    }
    moves.DEBUG_takeDevCards(viewerSeat, [cardType]);
  };

  const getSyntheticOpponentId = () =>
    playerIds.find((playerId) => String(playerId) !== String(viewerSeat)) ??
    playerIds[0] ??
    viewerSeat;

  const dispatchDevCardPlayEffect = (detail) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("catana:dev-sandbox:devcard-play", { detail })
    );
  };

  const handleOpponentDevCardPlayStart = (cardType = "knight") => {
    dispatchDevCardPlayEffect({
      playerId: getSyntheticOpponentId(),
      cardType,
      phase: "start"
    });
  };

  const handleOpponentDevCardPlayResolve = (cardType = "knight") => {
    dispatchDevCardPlayEffect({
      playerId: getSyntheticOpponentId(),
      cardType,
      phase: "resolve"
    });
  };

  const handleDevCardPlayReset = () => {
    dispatchDevCardPlayEffect({ action: "reset" });
  };

  return (
    <>
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

      <div className="pointer-events-none fixed right-4 top-16 z-50 w-80 max-w-[calc(100vw-2rem)]">
        <SandboxPanel
          presets={presets}
          presetId={preset?.id ?? ""}
          viewerSeat={viewerSeat}
          playerIds={playerIds}
          isCollapsed={isPanelCollapsed}
          onPresetChange={onPresetChange}
          onViewerSeatChange={onViewerSeatChange}
          onReset={onReset}
          onToggleCollapsed={onTogglePanelCollapsed}
          onGiveResource={handleGiveResource}
          onGiveDevCard={handleGiveDevCard}
          onOpponentDevCardPlayStart={handleOpponentDevCardPlayStart}
          onOpponentDevCardPlayResolve={handleOpponentDevCardPlayResolve}
          onDevCardPlayReset={handleDevCardPlayReset}
        />
      </div>
    </>
  );
}
