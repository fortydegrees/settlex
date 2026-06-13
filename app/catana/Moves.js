import { applyMaritimeTradeBatch, buildableEdges } from "@settlex/game-core";
import { appendGameLog } from "./utils/gameLog.js";
import {
  getBuildableEdges,
  getBuildableNodes,
  placeCity,
  placeRoad,
  placeSettlement,
  updateValids
} from "./moves/buildMoves.js";
import { autoMoveRobber, moveRobber } from "./moves/robberMoves.js";
import { pickRandom } from "./moves/randomChoice.js";
import { countResources } from "./moves/resourceCounts.js";

export {
  getBuildableEdges,
  getBuildableNodes,
  placeCity,
  placeRoad,
  placeSettlement,
  updateValids
} from "./moves/buildMoves.js";
export { autoMoveRobber, moveRobber } from "./moves/robberMoves.js";
export {
  autoDiscard,
  autoEndTurn,
  autoRoll,
  discardResources,
  endTurn,
  rollDice
} from "./moves/turnMoves.js";
export {
  autoResolveDevCard,
  buyDevCard,
  cancelDevCardPlay,
  confirmDevCardPlay,
  placeRoadFromDevCard,
  playDevCardStart
} from "./moves/devCardMoves.js";

//need to allow arrays for both arguments
export const takeCardsFromBank = (context, cards, playerID) => {
  const { G } = context;
  console.log("giving cards", G, cards, playerID);

  const bank = G.core?.bank?.resources ?? [];
  const playerState = G.core?.playerStateById?.[playerID];
  if (!playerState) {
    return;
  }
  const playerHand = playerState.resources;
  const cardLog = [];
  for (const card of cards) {
    const cardIndex = bank.indexOf(card);

    // Check if the card exists in the bank
    if (cardIndex !== -1) {
      // Remove the card from the bank
      bank.splice(cardIndex, 1);

      // Add the card to the player's hand (assuming playerId is an identifier)
      playerHand.push(card);
      cardLog.push(card);
    }
  }
  context.log.setMetadata({
    message: `player ${playerID} received ${cardLog}`,
  });
};

export const readyUp = {
  ignoreStaleStateID: true,
  move: (context) => {
    const { G, ctx, playerID, events } = context;
    if (!playerID) return;
    if (!G.preGame) {
      G.preGame = { readyByPlayerId: {} };
    }
    G.preGame.readyByPlayerId[playerID] = true;

    const allPlayers = G.core?.players ?? ctx.playOrder ?? [];
    if (!Array.isArray(allPlayers) || allPlayers.length === 0) {
      return;
    }
    const allReady = allPlayers.every(
      (id) => G.preGame.readyByPlayerId?.[id]
    );
    if (allReady) {
      events.endPhase();
    }
  }
};

export const autoStartGame = {
  move: (context) => {
    const { events } = context;
    events.endPhase();
  }
};

export const getAvailableMoves = (context) => {};

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

export const autoChooseSteal = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = ctx.currentPlayer;
    const victims = G.core?.players?.filter((id) => id !== playerID) ?? [];
    const victimId = pickRandom(victims, random);
    if (!victimId) {
      return;
    }
    log.setMetadata({ message: `auto-choosing steal target ${victimId}` });
  }
};

export const maritimeTrade = {
  move: (context, trade) => {
    const { G, playerID, ctx, effects } = context;

    const receive = Array.isArray(trade?.receive)
      ? trade.receive
      : trade?.receive
        ? [trade.receive]
        : [];

    if (!trade || !Array.isArray(trade.give) || receive.length === 0) {
      console.log("Invalid trade format");
      return;
    }

    const result = applyMaritimeTradeBatch(G.core, G.coreTopology, playerID, {
      give: trade.give,
      receive
    });

    if (!result.ok) {
      console.log(`Invalid maritime trade: ${result.error}`);
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "trade:maritime",
      actorId: playerID,
      data: {
        give: countResources(trade.give),
        receive: countResources(receive)
      }
    });
    effects?.maritimeTrade?.({
      effectId: `trade:maritime:${playerID}:turn-${ctx?.turn ?? "unknown"}`,
      playerId: playerID,
      give: [...trade.give],
      receive: [...receive]
    });
  }
};
