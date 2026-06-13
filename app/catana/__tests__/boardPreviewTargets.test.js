import { describe, expect, it, vi } from "vitest";
import {
  buildLandRobberPreviewTiles,
  buildMagneticBuildTargets,
  buildMagneticRobberTargets,
  getValidRobberTiles
} from "../utils/boardPreviewTargets";
import { TileTypes } from "../types";

vi.mock("@settlex/game-core", async () => {
  const actual = await vi.importActual("@settlex/game-core");
  return {
    ...actual,
    canPlaceRobber: vi.fn((_core, _topology, tileId) => tileId !== 2)
  };
});

describe("boardPreviewTargets", () => {
  it("filters valid robber target tiles through core placement rules", () => {
    expect(
      getValidRobberTiles({
        core: { robberTileId: 1 },
        coreTopology: {},
        tiles: [
          { type: TileTypes.LAND, tile: { id: 1 } },
          { type: TileTypes.LAND, tile: { id: 2 } },
          { type: TileTypes.LAND, tile: { id: 3 } }
        ]
      })
    ).toEqual([3]);
  });

  it("builds magnetic robber targets from registered tile elements", () => {
    const targetEl = {};

    expect(
      buildMagneticRobberTargets({
        robberTiles: [1, 2],
        robberTargetElementsByTileId: { 2: targetEl }
      })
    ).toEqual([{ tileId: 2, element: targetEl }]);
  });

  it("builds land-only robber preview tile centers", () => {
    const targets = buildLandRobberPreviewTiles({
      tiles: [
        {
          type: TileTypes.LAND,
          coordinate: [0, 0, 0],
          tile: { id: 4 }
        },
        {
          type: TileTypes.PORT,
          coordinate: [1, -1, 0],
          tile: { id: 5 }
        }
      ],
      size: 30,
      boardCenterX: 100,
      boardCenterY: 120
    });

    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ tileId: 4 });
    expect(Number.isFinite(targets[0].centerX)).toBe(true);
    expect(Number.isFinite(targets[0].centerY)).toBe(true);
  });

  it("builds magnetic road targets with registered rotation", () => {
    const element = {};

    expect(
      buildMagneticBuildTargets({
        isBuildPickupActive: true,
        activeBuildPickupPieceType: "road",
        buildTargetElementsById: {
          "1,2": { element, rotationDegrees: 35 }
        },
        buildableRoads: ["1,2", "2,3"],
        mainBuildableNodes: [7]
      })
    ).toEqual([
      {
        id: "1,2",
        element,
        rotationDegrees: 35
      }
    ]);
  });

  it("builds magnetic node targets with zero rotation", () => {
    const element = {};

    expect(
      buildMagneticBuildTargets({
        isBuildPickupActive: true,
        activeBuildPickupPieceType: "settlement",
        buildTargetElementsById: {
          7: { element }
        },
        buildableRoads: ["1,2"],
        mainBuildableNodes: [7, 8]
      })
    ).toEqual([
      {
        id: 7,
        element,
        rotationDegrees: 0
      }
    ]);
  });

  it("does not return magnetic build targets when pickup is inactive", () => {
    expect(
      buildMagneticBuildTargets({
        isBuildPickupActive: false,
        activeBuildPickupPieceType: "road",
        buildTargetElementsById: {},
        buildableRoads: ["1,2"],
        mainBuildableNodes: [7]
      })
    ).toEqual([]);
  });
});
