import { buildableEdges } from "@settlex/game-core";
import { appendGameLog } from "../utils/gameLog.js";
import {
  getBuildableNodes,
  placeRoad,
  placeSettlement
} from "./buildMoves.js";
import { pickRandom } from "./randomChoice.js";

export const autoPlaceSettlement = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;
    const nodes =
      G.valids?.nodes?.length > 0
        ? G.valids.nodes
        : getBuildableNodes(playerID, G, ctx);
    const nodeId = pickRandom(nodes, random);
    if (nodeId == null) {
      return;
    }
    appendGameLog(G, ctx, {
      type: "forced:placeSettlement",
      actorId: "system",
      data: { playerId: playerID }
    });
    log.setMetadata({ message: `auto-placing settlement at ${nodeId}` });
    placeSettlement.move(context, nodeId, { forced: true });
  }
};

export const autoPlaceRoad = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;
    const edges =
      G.valids?.edges?.length > 0
        ? G.valids.edges
        : buildableEdges(G.core, G.coreTopology, playerID, {
            initialPlacement: ctx.phase === "placement"
          });
    const edgeId = pickRandom(edges, random);
    if (!edgeId) {
      return;
    }
    appendGameLog(G, ctx, {
      type: "forced:placeRoad",
      actorId: "system",
      data: { playerId: playerID }
    });
    log.setMetadata({ message: `auto-placing road at ${edgeId}` });
    placeRoad.move(context, edgeId, { forced: true });
  }
};
