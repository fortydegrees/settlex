import {
  applyBuildCity,
  applyBuildRoad,
  applyBuildSettlement,
  applyPlaceRoad,
  applyPlaceSettlement,
  buildableEdges,
  buildableNodes
} from "@settlex/game-core";
import { appendGameLog } from "../utils/gameLog.js";
import { logAwardChanges } from "./awardLogging.js";
import { getAwardOwners } from "./devCardPresentation.js";
import { maybeLogGameOver } from "./gameOver.js";
import { logResourceDistributions } from "./resourceLogging.js";

export const updateValids = (context, stage, meta) => {
  const { G, ctx, playerID } = context;
  G.valids.nodes = [];
  G.valids.edges = [];
  const isPlacement = ctx.phase === "placement";
  switch (stage) {
    case "road":
      G.valids.edges = buildableEdges(G.core, G.coreTopology, playerID, {
        initialPlacement: isPlacement,
        fromNodeId: meta ?? undefined
      });
      break;
    case "settlement":
      G.valids.nodes = buildableNodes(G.core, G.coreTopology, playerID, {
        initialPlacement: isPlacement
      });
      break;
    default:
      G.valids.edges = [];
      G.valids.nodes = [];
      break;
  }
};

export const getBuildableEdges = (playerID, G, ctx) => {
  const isPlacement = ctx?.phase === "placement";
  return buildableEdges(G.core, G.coreTopology, playerID, {
    initialPlacement: Boolean(isPlacement)
  });
};

export const getBuildableNodes = (playerID, G, ctx) => {
  const isPlacement = ctx && ctx.phase === "placement";
  if (G.core) {
    G.core.phase = isPlacement ? "placement" : "normal";
  }
  return buildableNodes(G.core, G.coreTopology, playerID, {
    initialPlacement: Boolean(isPlacement)
  });
};

export const placeSettlement = {
  move: (context, node, options) => {
    const { G, playerID, events, ctx, effects } = context;
    const nodeId = parseInt(node);
    const isPlacement = ctx.phase === "placement";
    const previousAwards = getAwardOwners(G.core);
    if (G.core) {
      G.core.phase = isPlacement ? "placement" : "normal";
    }

    const result = isPlacement
      ? applyPlaceSettlement(G.core, G.coreTopology, nodeId, playerID, {
          initialPlacement: true
        })
      : applyBuildSettlement(G.core, G.coreTopology, nodeId, playerID);
    if (!result.ok) {
      console.log(`Invalid settlement placement at node ${node}`);
      return;
    }
    effects?.placePiece?.({
      pieceType: "settlement",
      id: nodeId,
      playerId: playerID,
      initialPlacement: isPlacement
    });
    const distributions = result.distributions ?? [];
    if (distributions.length > 0) {
      const cardAnims = distributions.map((d) => {
        const tile = G.tiles.find((t) => t.tile.id === d.tileId);
        return {
          tileId: d.tileId,
          coordinate: tile?.coordinate ? [...tile.coordinate] : null,
          playerID: d.playerId,
          resource: d.resource
        };
      });
      effects?.distributeCardsFromTile?.(cardAnims);
    }
    appendGameLog(G, ctx, {
      type: "build:settlement",
      actorId: playerID,
      data: { nodeId, initialPlacement: isPlacement },
      forced: options?.forced
    });
    logAwardChanges(G, ctx, previousAwards, options, effects);
    logResourceDistributions(G, ctx, distributions, options);
    maybeLogGameOver(G, ctx);

    if (isPlacement) {
      updateValids(context, "road", nodeId);
      events.setStage("road");
    }
  }
};

export const placeRoad = {
  move: (context, edge, options) => {
    const { G, playerID, events, ctx, effects } = context;
    const isPlacement = ctx.phase === "placement";
    const previousAwards = getAwardOwners(G.core);
    if (G.core) {
      G.core.phase = isPlacement ? "placement" : "normal";
    }

    const result = isPlacement
      ? applyPlaceRoad(G.core, G.coreTopology, edge, playerID, {
          initialPlacement: true
        })
      : applyBuildRoad(G.core, G.coreTopology, edge, playerID);
    if (!result.ok) {
      console.log(`Invalid road placement at edge ${edge}`);
      return;
    }
    effects?.placePiece?.({
      pieceType: "road",
      id: edge,
      playerId: playerID,
      initialPlacement: isPlacement
    });
    appendGameLog(G, ctx, {
      type: "build:road",
      actorId: playerID,
      data: { edgeId: edge, initialPlacement: isPlacement },
      forced: options?.forced
    });
    logAwardChanges(G, ctx, previousAwards, options, effects);
    maybeLogGameOver(G, ctx);

    if (isPlacement) {
      const ruleset = G.core?.ruleset;
      const startingSettlements = ruleset?.pieceLimits?.settlements ?? 0;
      const startingRoads = ruleset?.pieceLimits?.roads ?? 0;
      const placementComplete = G.core?.players?.every((id) => {
        const playerState = G.core.playerStateById[id];
        return (
          playerState?.settlementsRemaining === startingSettlements - 2 &&
          playerState?.roadsRemaining === startingRoads - 2
        );
      });
      if (!placementComplete) {
        appendGameLog(G, ctx, {
          type: "turn:end",
          actorId: playerID,
          data: { phase: "placement" },
          forced: options?.forced
        });
      }
      events.endTurn();
    }
  }
};

export const placeCity = {
  move: (context, node, options) => {
    const { G, playerID, ctx, effects } = context;
    if (ctx.phase === "placement") {
      return;
    }
    const previousAwards = getAwardOwners(G.core);
    const nodeId = parseInt(node);
    const result = applyBuildCity(G.core, G.coreTopology, nodeId, playerID);
    if (!result.ok) {
      console.log(`Invalid city placement at node ${node}`);
      return;
    }
    effects?.placePiece?.({
      pieceType: "city",
      id: nodeId,
      playerId: playerID
    });
    appendGameLog(G, ctx, {
      type: "build:city",
      actorId: playerID,
      data: { nodeId },
      forced: options?.forced
    });
    logAwardChanges(G, ctx, previousAwards, options, effects);
    maybeLogGameOver(G, ctx);
  }
};
