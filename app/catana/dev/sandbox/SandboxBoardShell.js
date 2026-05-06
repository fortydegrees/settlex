import { useEffect } from "react";
import { GameScreenWithEffects } from "../../GameScreen";
import { TileTypes } from "../../types";
import { buildSandboxMatchMetadata } from "./presets";
import { SandboxPanel } from "./SandboxPanel";
import {
  buildSandboxActivePlayers,
  serializeActivePlayers
} from "./activePlayers";

const getTileDistance = (a, b) => {
  if (!Array.isArray(a?.coordinate) || !Array.isArray(b?.coordinate)) {
    return 0;
  }
  const [aq = 0, ar = 0] = a.coordinate;
  const [bq = 0, br = 0] = b.coordinate;
  return Math.abs(aq - bq) + Math.abs(ar - br);
};

const buildRobberMoveReplayPayload = ({ G, actorId }) => {
  const landTiles = (G?.tiles ?? []).filter(
    (entry) => entry?.type === TileTypes.LAND && entry?.tile?.id != null
  );
  if (landTiles.length < 2) return null;

  const currentRobberTileId = G?.core?.robberTileId ?? landTiles[0].tile.id;
  const sourceTile =
    landTiles.find(
      (entry) => String(entry.tile.id) === String(currentRobberTileId)
    ) ?? landTiles[0];
  const destinationTile = landTiles
    .filter((entry) => String(entry.tile.id) !== String(sourceTile.tile.id))
    .sort((a, b) => getTileDistance(b, sourceTile) - getTileDistance(a, sourceTile))[0];

  if (!destinationTile) return null;

  return {
    actorId,
    fromTileId: sourceTile.tile.id,
    toTileId: destinationTile.tile.id
  };
};

const buildLongestRoadAwardReplayPayload = ({
  G,
  playerId,
  previousOwnerId = null
}) => {
  const roadIds = Object.entries(G?.core?.roadsByEdgeId ?? {})
    .filter(([, ownerId]) => String(ownerId) === String(playerId))
    .map(([edgeId]) => edgeId);
  if (roadIds.length === 0) return null;

  return {
    awardType: "longestRoad",
    playerId,
    previousOwnerId,
    roadIds
  };
};

const buildLargestArmyAwardReplayPayload = ({
  playerId,
  previousOwnerId = null
}) => ({
  awardType: "largestArmy",
  playerId,
  previousOwnerId
});

export function SandboxBoardShell({
  preset,
  presets,
  viewerSeat,
  isViewportWall = false,
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

  const handleRemoteRobberMoveReplay = () => {
    if (typeof window === "undefined") return;
    const payload = buildRobberMoveReplayPayload({
      G: bgioProps.G,
      actorId: getSyntheticOpponentId()
    });
    if (!payload) return;
    window.dispatchEvent(
      new CustomEvent("catana:dev-sandbox:robber-move", {
        detail: payload
      })
    );
  };

  const handleLongestRoadAwardReplay = () => {
    if (typeof window === "undefined") return;
    const payload = buildLongestRoadAwardReplayPayload({
      G: bgioProps.G,
      playerId: getSyntheticOpponentId()
    });
    if (!payload) return;
    window.dispatchEvent(
      new CustomEvent("catana:dev-sandbox:award-claim", {
        detail: payload
      })
    );
  };

  const handleLongestRoadTakeoverReplay = () => {
    if (typeof window === "undefined") return;
    const nextOwnerId = getSyntheticOpponentId();
    const previousOwnerId =
      playerIds.find((playerId) => String(playerId) !== String(nextOwnerId)) ??
      null;
    const payload = buildLongestRoadAwardReplayPayload({
      G: bgioProps.G,
      playerId: nextOwnerId,
      previousOwnerId
    });
    if (!payload) return;
    window.dispatchEvent(
      new CustomEvent("catana:dev-sandbox:award-claim", {
        detail: payload
      })
    );
  };

  const handleLargestArmyAwardReplay = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("catana:dev-sandbox:award-claim", {
        detail: buildLargestArmyAwardReplayPayload({
          playerId: getSyntheticOpponentId()
        })
      })
    );
  };

  const handleLargestArmyTakeoverReplay = () => {
    if (typeof window === "undefined") return;
    const nextOwnerId = getSyntheticOpponentId();
    const previousOwnerId =
      playerIds.find((playerId) => String(playerId) !== String(nextOwnerId)) ??
      null;
    window.dispatchEvent(
      new CustomEvent("catana:dev-sandbox:award-claim", {
        detail: buildLargestArmyAwardReplayPayload({
          playerId: nextOwnerId,
          previousOwnerId
        })
      })
    );
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

      {!isViewportWall ? (
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
            onRemoteRobberMoveReplay={handleRemoteRobberMoveReplay}
            onLongestRoadAwardReplay={handleLongestRoadAwardReplay}
            onLongestRoadTakeoverReplay={handleLongestRoadTakeoverReplay}
            onLargestArmyAwardReplay={handleLargestArmyAwardReplay}
            onLargestArmyTakeoverReplay={handleLargestArmyTakeoverReplay}
          />
        </div>
      ) : null}
    </>
  );
}
