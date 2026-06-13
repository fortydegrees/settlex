import { canPlaceRobber } from "@settlex/game-core";
import { TileTypes } from "../types";
import { tilePixelVector } from "./coordinates";

export const getValidRobberTiles = (G) => {
  if (!G.core) return [];

  return G.tiles
    .filter((tile) => tile.tile.id !== G.core?.robberTileId)
    .filter((tile) => canPlaceRobber(G.core, G.coreTopology, tile.tile.id))
    .map((tile) => tile.tile.id);
};

export const buildMagneticRobberTargets = ({
  robberTiles,
  robberTargetElementsByTileId
}) =>
  robberTiles
    .map((tileId) => ({
      tileId,
      element: robberTargetElementsByTileId[tileId]
    }))
    .filter((target) => Boolean(target.element));

export const buildLandRobberPreviewTiles = ({
  tiles,
  size,
  boardCenterX,
  boardCenterY
}) => {
  if (!size) {
    return [];
  }

  return tiles.flatMap(({ coordinate, type, tile }) => {
    if (type !== TileTypes.LAND) {
      return [];
    }

    const [tileCenterX, tileCenterY] = tilePixelVector(
      coordinate,
      size,
      boardCenterX,
      boardCenterY
    );

    return [
      {
        tileId: tile.id,
        centerX: tileCenterX,
        centerY: tileCenterY
      }
    ];
  });
};

export const buildMagneticBuildTargets = ({
  isBuildPickupActive,
  activeBuildPickupPieceType,
  buildTargetElementsById,
  buildableRoads,
  mainBuildableNodes
}) => {
  if (!isBuildPickupActive) {
    return [];
  }

  if (activeBuildPickupPieceType === "road") {
    return buildableRoads
      .map((edgeId) => {
        const target = buildTargetElementsById[String(edgeId)] ?? null;
        if (!target?.element) {
          return null;
        }

        return {
          id: edgeId,
          element: target.element,
          rotationDegrees: target.rotationDegrees ?? 90
        };
      })
      .filter(Boolean);
  }

  return mainBuildableNodes
    .map((nodeId) => {
      const target = buildTargetElementsById[String(nodeId)] ?? null;
      if (!target?.element) {
        return null;
      }

      return {
        id: nodeId,
        element: target.element,
        rotationDegrees: 0
      };
    })
    .filter(Boolean);
};
