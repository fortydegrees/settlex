
import { ResourceType, TileTypes } from "./types.js";
import {
  applyBuildCity,
  applyBuildRoad,
  applyBuildSettlement,
  applyFreeRoad,
  applyEndTurn,
  applyKnight,
  applyMonopoly,
  applyMoveRobber,
  getRobberVictims,
  applyPlaceRoad,
  applyPlaceSettlement,
  applyRollDice,
  applyYearOfPlenty,
  applyDiscard,
  applyMaritimeTrade,
  buildableEdges,
  buildableNodes,
  buyDevCard as applyBuyDevCard,
  canPlaceRobber,
  canPlayDevCard,
  playDevCard
} from "@settlex/game-core";
import { appendGameLog } from "./utils/gameLog.js";

const countResources = (resources = []) =>
  resources.reduce((acc, resource) => {
    acc[resource] = (acc[resource] ?? 0) + 1;
    return acc;
  }, {});

const logResourceDistributions = (G, ctx, distributions, options) => {
  if (!Array.isArray(distributions) || distributions.length === 0) return;
  const byPlayer = new Map();
  for (const dist of distributions) {
    if (!dist?.playerId || !dist?.resource) continue;
    const existing = byPlayer.get(dist.playerId) ?? {};
    existing[dist.resource] = (existing[dist.resource] ?? 0) + 1;
    byPlayer.set(dist.playerId, existing);
  }
  const playerIds = Array.from(byPlayer.keys()).sort();
  playerIds.forEach((playerId) => {
    appendGameLog(G, ctx, {
      type: "resource:gain",
      actorId: playerId,
      data: { resources: byPlayer.get(playerId) },
      forced: options?.forced
    });
  });
};

const getAwardOwners = (core) => ({
  longestRoadOwnerId: core?.awards?.longestRoadOwnerId ?? null,
  largestArmyOwnerId: core?.awards?.largestArmyOwnerId ?? null
});

const logAwardChanges = (G, ctx, previousAwards, options) => {
  if (!previousAwards) return;
  const currentAwards = getAwardOwners(G?.core);
  const changes = [
    {
      type: "award:longestRoad",
      previousOwnerId: previousAwards.longestRoadOwnerId,
      nextOwnerId: currentAwards.longestRoadOwnerId
    },
    {
      type: "award:largestArmy",
      previousOwnerId: previousAwards.largestArmyOwnerId,
      nextOwnerId: currentAwards.largestArmyOwnerId
    }
  ];

  changes.forEach(({ type, previousOwnerId, nextOwnerId }) => {
    if (!nextOwnerId) return;
    if (nextOwnerId === previousOwnerId) return;
    appendGameLog(G, ctx, {
      type,
      actorId: nextOwnerId,
      data: previousOwnerId ? { previousOwnerId } : {},
      forced: options?.forced
    });
  });
};

export const maybeLogGameOver = (G, ctx) => {
  if (!G?.core?.gameOver || G.gameOverLogged) return;
  const { winnerId, reason } = G.core.gameOver;
  appendGameLog(G, ctx, {
    type: "game:over",
    actorId: winnerId ?? "system",
    data: { winnerId, reason }
  });
  G.gameOverLogged = true;
};

export const GAME_OVER_REASONS = {
  RESIGNATION: "Resignation",
  DISCONNECT_FORFEIT: "Disconnect Forfeit"
};

const getOpponentWinnerId = (G, losingPlayerId) => {
  const playerIds = G?.core?.players?.map(String) ?? [];
  return playerIds.find((playerId) => playerId !== String(losingPlayerId)) ?? null;
};

const resolveTerminalForfeit = (
  context,
  losingPlayerId,
  reason,
  { serverLogType = null } = {}
) => {
  const { G, ctx, events } = context;
  if (!G?.core || G.core.gameOver || losingPlayerId == null) {
    return;
  }

  const winnerId = getOpponentWinnerId(G, losingPlayerId);
  if (winnerId == null) {
    return;
  }

  const gameOver = { winnerId, reason };
  if (serverLogType) {
    appendGameLog(G, ctx, {
      type: serverLogType,
      actorId: "system",
      data: {
        playerId: String(losingPlayerId),
        winnerId
      }
    });
  }
  G.core.gameOver = gameOver;
  maybeLogGameOver(G, ctx);
  events?.endGame?.(gameOver);
};

export const resign = {
  move: (context, losingPlayerIdArg) => {
    const losingPlayerId =
      losingPlayerIdArg ?? context.playerID ?? context.ctx?.currentPlayer;
    resolveTerminalForfeit(
      context,
      losingPlayerId,
      GAME_OVER_REASONS.RESIGNATION,
      { serverLogType: "server:resign" }
    );
  }
};

export const resolveDisconnectForfeit = {
  client: false,
  move: (context, losingPlayerIdArg) => {
    resolveTerminalForfeit(
      context,
      losingPlayerIdArg ?? context.playerID,
      GAME_OVER_REASONS.DISCONNECT_FORFEIT
    );
  }
};

//used for giving cards to a player by clicking on icon for testing
//TODO: remove
export const DEBUG_takeCardsFromBank = {
  move: (context, playerID, cards) => {
    const { G } = context;
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
    //updateValids(context, stage);
  },




  
};

export const DEBUG_takeDevCards = {
  move: (context, playerID, cards) => {
    const { G, log } = context;
    const devDeck = G.core?.devDeck ?? [];
    const playerState = G.core?.playerStateById?.[playerID];
    if (!playerState) {
      return;
    }

    const grantedCards = [];
    for (const card of cards ?? []) {
      const cardIndex = devDeck.indexOf(card);
      if (cardIndex === -1) {
        continue;
      }

      devDeck.splice(cardIndex, 1);
      playerState.devCards.push(card);
      grantedCards.push(card);
    }

    log?.setMetadata?.({
      message: `player ${playerID} received dev cards ${grantedCards.join(",")}`,
    });
  }
};

export const DEBUG_captureScenarioState = {
  move: (context) => {
    const snapshot = JSON.parse(JSON.stringify(context.G ?? {}));
    delete snapshot.debugScenarioState;
    context.G.debugScenarioState = snapshot;
  }
};

export const DEBUG_clearCapturedScenarioState = {
  move: (context) => {
    context.G.debugScenarioState = null;
  }
};


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
    logAwardChanges(G, ctx, previousAwards, options);
    logResourceDistributions(G, ctx, distributions, options);
    maybeLogGameOver(G, ctx);

    if (isPlacement) {
      updateValids(context, "road", nodeId);
    }

    //if initial placement
    if (isPlacement) {
      events.setStage("road");
    }
    //events.endTurn();

    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
};


export const getBuildableEdges = (playerID, G, ctx) =>{
  const isPlacement = ctx?.phase === "placement";
  return buildableEdges(G.core, G.coreTopology, playerID, {
    initialPlacement: Boolean(isPlacement)
  });

}

`
def buildable_node_ids(self, color: Color, initial_build_phase=False):
if initial_build_phase:
    return sorted(list(self.board_buildable_ids))

subgraphs = self.find_connected_components(color)
nodes = set().union(*subgraphs)
return sorted(list(nodes.intersection(self.board_buildable_ids)))
`

//catanatron stores buildable_ids and then removes neighbours when built
//that approach does kind of make sense
//like storing buildable edges/nodes in a cache and only changing when boardState changes
//but that doesn't seem like data that should stay in _my_ gamestate.
//should be with client
export const getBuildableNodes = (playerID, G, ctx) => {
  const isPlacement = ctx && ctx.phase === "placement";
  if (G.core) {
    G.core.phase = isPlacement ? "placement" : "normal";
  }
  return buildableNodes(G.core, G.coreTopology, playerID, {
    initialPlacement: Boolean(isPlacement)
  });
}

export const readyUp = {
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

const pickRandom = (items, random) => {
  if (!items || items.length === 0) return null;
  if (random?.Shuffle) {
    return random.Shuffle([...items])[0];
  }
  if (random?.Number) {
    const index = Math.floor(random.Number() * items.length);
    return items[index];
  }
  return items[0];
};

const getRobberCandidateTileIds = (G) => {
  const tiles = G?.tiles ?? [];
  return tiles
    .filter((tile) => tile.type === TileTypes.LAND)
    .map((tile) => tile.tile.id)
    .filter((tileId) => tileId !== G.core?.robberTileId)
    .filter((tileId) => canPlaceRobber(G.core, G.coreTopology, tileId));
};

const getRobberReturnStage = (context) =>
  context.G.robberReturnToStage ||
  context.ctx.activePlayers?.[context.ctx.currentPlayer]?.returnTo ||
  "postRoll";

const finishRobberResolution = (context) => {
  const { G, events } = context;
  const returnTo = getRobberReturnStage(context);
  if (G.core) {
    G.core.turn.phase = returnTo === "preRoll" ? "preRoll" : "postRoll";
  }
  G.robberReturnToStage = null;
  events.setStage(returnTo);
  return returnTo;
};

const skipRobberMoveNoValidTile = (context, options) => {
  const { G, ctx } = context;
  appendGameLog(G, ctx, {
    type: "robber:skip",
    actorId: ctx.currentPlayer,
    data: { reason: "no-valid-tile" },
    forced: options?.forced
  });
  return finishRobberResolution(context);
};

const beginRobberMoveStage = (context, options) => {
  const { G, events } = context;
  if (getRobberCandidateTileIds(G).length === 0) {
    skipRobberMoveNoValidTile(context, options);
    return false;
  }
  events.setStage("moveRobber");
  return true;
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
    logAwardChanges(G, ctx, previousAwards, options);
    maybeLogGameOver(G, ctx);

    //if we're in placement phase, end turn after placing road
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
    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
}

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
    logAwardChanges(G, ctx, previousAwards, options);
    maybeLogGameOver(G, ctx);
  }
};


//we need to either return to preRoll (if robber moved from knight played before rolling dice)
//or postRoll (if played from rolling a 7 or knight mid-turn)
export const moveRobber = {
  move: (context, tileID, options) =>{
    const { G, ctx, random } = context;
    
    // Generate a random number for stealing (deterministic)
    // We pass this to the core logic, which will use modulo to select the actual card if needed
    const stolenCardIndex = random.Number(); 
    const potentialVictims = getRobberVictims(
      G.core,
      G.coreTopology,
      tileID,
      ctx.currentPlayer
    ).filter((id) => (G.core?.playerStateById?.[id]?.resources?.length ?? 0) > 0);
    
    const result = applyMoveRobber(G.core, G.coreTopology, tileID, ctx.currentPlayer, stolenCardIndex);
    if (!result.ok) {
      console.log(`Invalid robber placement on tile ${tileID}: ${result.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "robber:move",
      actorId: ctx.currentPlayer,
      data: { tileId: tileID },
      forced: options?.forced
    });
    if (potentialVictims.length === 1) {
      appendGameLog(G, ctx, {
        type: "robber:steal",
        actorId: ctx.currentPlayer,
        data: { victimId: potentialVictims[0] },
        forced: options?.forced
      });
    }

    finishRobberResolution(context);
}
}

export const rollDice = {
  canDo: () => console.log("hi roll dive"),
  move: (context, options) => {
    const { G, random, effects, events } = context;
    const roll = random.D6(2);
    G.diceRoll = roll;
    effects?.roll?.([roll[0], roll[1]]);

    const diceScore = roll[0] + roll[1];
    const result = applyRollDice(G.core, G.coreTopology, diceScore);
    if (!result.ok) {
      console.log("Invalid dice roll");
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "roll",
      actorId: context.ctx?.currentPlayer,
      data: { dice: roll, total: diceScore },
      forced: options?.forced
    });
    logResourceDistributions(G, context.ctx, result.distributions, options);

    // Trigger resource distribution and blocked tile animations together
    const hasDistributions = result.distributions?.length > 0;
    const hasBlocked = result.blockedTiles?.length > 0;

    if (hasDistributions || hasBlocked) {
      const cardAnims = (result.distributions || []).map(d => {
        const tile = G.tiles.find(t => t.tile.id === d.tileId);
        return {
          tileId: d.tileId,
          coordinate: tile?.coordinate ? [...tile.coordinate] : null,
          playerID: d.playerId,
          resource: d.resource,
        };
      });

      // Pass combined payload so both flash simultaneously
      effects?.distributeCardsFromTile?.({
        cards: cardAnims,
        blockedTileIds: result.blockedTiles || [],
      });
    }

    if (G.core.turn.phase.startsWith("robber")) {
      if (G.core.turn.phase === "robberDiscard") {
        const pendingPlayers = G.core.turn.pendingDiscards;
        const activePlayersConfig = {};

        pendingPlayers.forEach(pid => {
          activePlayersConfig[pid] = "robberDiscard";
        });

        events.setActivePlayers({
          value: activePlayersConfig,
        });

      } else {
        beginRobberMoveStage(context, options);
      }
      return;
    }

    events.setStage("postRoll");
  },
};

//'meta' is a lil ?hack? (is it?) to pass relevant context for the action,
//e.g. for road, pass a nodeID to make it super easy for initial settle/road placement
export const updateValids = (context, stage, meta) => {
  //get player info. color etc
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

export const getAvailableMoves = (context) => {};

export const endTurn = {
  move: (context, options) => {
    const { G, ctx, events } = context;
    if (G.core) {
      G.core.phase = ctx.phase === "placement" ? "placement" : "normal";
    }
    const result = applyEndTurn(G.core);
    if (!result.ok) {
      console.log(`Invalid end turn: ${result.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "turn:end",
      actorId: ctx.currentPlayer,
      data: {},
      forced: options?.forced
    });

    const nextPlayerId = G.core.turn.currentPlayerId;
    events.endTurn({ next: nextPlayerId });
  }
};

export const discardResources = {
  move: (context, resources, options) => {
    const { G, playerID, events } = context;
    // Assume core G structure
    const result = applyDiscard(G.core, playerID, resources);
    if (!result.ok) {
      console.log(`Invalid discard: ${result.error}`);
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "discard",
      actorId: playerID,
      data: { resources: countResources(resources) },
      forced: options?.forced
    });

    // After a successful discard, this player is done with this stage.
    // We remove them from the active players.
    events.endStage();

    // Check if we need to advance phase/stage for the *game*
    // applyDiscard updates pendingDiscards and potentially state.turn.phase to 'robberMove'
    if (G.core.turn.phase === "robberMove") {
       beginRobberMoveStage(context, options);
    }
  }
};

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

export const autoDiscard = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const playerID = context.playerID ?? ctx.currentPlayer;
    const player = G.core?.playerStateById?.[playerID];
    if (!player) {
      return;
    }
    const requiredCount = Math.floor(player.resources.length / 2);
    if (requiredCount <= 0) {
      return;
    }
    const shuffled = random?.Shuffle
      ? random.Shuffle([...player.resources])
      : [...player.resources];
    const toDiscard = shuffled.slice(0, requiredCount);
    appendGameLog(G, ctx, {
      type: "forced:discardSelection",
      actorId: "system",
      data: { playerId: playerID }
    });
    log.setMetadata({ message: `auto-discarding ${requiredCount} cards` });
    discardResources.move(context, toDiscard, { forced: true });
  }
};

export const autoRoll = {
  move: (context) => {
    rollDice.move(context, { forced: true });
  }
};

export const autoEndTurn = {
  move: (context) => {
    endTurn.move(context, { forced: true });
  }
};

export const autoMoveRobber = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const candidates = getRobberCandidateTileIds(G);
    const tileId = pickRandom(candidates, random);
    if (tileId == null) {
      log?.setMetadata?.({ message: "auto-robber: no valid tile, skipping" });
      skipRobberMoveNoValidTile(context, { forced: true });
      return;
    }
    const potentialVictims = getRobberVictims(
      G.core,
      G.coreTopology,
      tileId,
      ctx.currentPlayer
    ).filter((id) => (G.core?.playerStateById?.[id]?.resources?.length ?? 0) > 0);
    appendGameLog(G, ctx, {
      type: "forced:moveRobber",
      actorId: "system",
      data: { playerId: ctx.currentPlayer }
    });
    const stolenCardIndex = random?.Number ? random.Number() : 0;
    let selectedVictimId = potentialVictims.length === 1 ? potentialVictims[0] : undefined;
    let result = applyMoveRobber(
      G.core,
      G.coreTopology,
      tileId,
      ctx.currentPlayer,
      stolenCardIndex
    );
    if (!result.ok && result.error === "ambiguous-victim") {
      const victims = getRobberVictims(
        G.core,
        G.coreTopology,
        tileId,
        ctx.currentPlayer
      );
      const victimId = pickRandom(victims, random);
      if (victimId) {
        selectedVictimId = victimId;
        result = applyMoveRobber(
          G.core,
          G.coreTopology,
          tileId,
          ctx.currentPlayer,
          stolenCardIndex,
          victimId
        );
      }
    }

    if (!result.ok) {
      console.log(`Invalid robber placement on tile ${tileId}: ${result.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "robber:move",
      actorId: ctx.currentPlayer,
      data: { tileId },
      forced: true
    });
    if (selectedVictimId) {
      appendGameLog(G, ctx, {
        type: "robber:steal",
        actorId: ctx.currentPlayer,
        data: { victimId: selectedVictimId },
        forced: true
      });
    }

    log.setMetadata({ message: `auto-moving robber to ${tileId}` });
    finishRobberResolution(context);
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
    // trade = { give: [Resource], receive: Resource }
    // The UI sends an array for give, but core expects single resource for 'give' if using applyMaritimeTrade
    // Wait, the core applyMaritimeTrade function takes: 
    //   trade: { give: Resource; receive: Resource }
    // This implies it only handles ONE trade at a time, e.g. give 4 wood for 1 brick.
    // If the UI sends { give: ['Wood','Wood','Wood','Wood'], receive: 'Brick' }, we need to parse it.
    
    const { G, playerID } = context;
    
    // Validate input format
    if (!trade || !trade.give || !Array.isArray(trade.give) || !trade.receive) {
        console.log("Invalid trade format");
        return;
    }
    
    // Ensure all given resources are the same type (maritime trade rule)
    const resourceType = trade.give[0];
    if (trade.give.some(r => r !== resourceType)) {
        console.log("Maritime trade requires giving homogenous resources");
        return;
    }
    
    // Call core function
    const result = applyMaritimeTrade(G.core, G.coreTopology, playerID, {
        give: resourceType,
        receive: trade.receive
    });
    
    if (!result.ok) {
        console.log(`Invalid maritime trade: ${result.error}`);
        return;
    }
    appendGameLog(G, context.ctx, {
      type: "trade:maritime",
      actorId: playerID,
      data: {
        give: { [resourceType]: trade.give.length },
        receive: { [trade.receive]: 1 }
      }
    });
  }
};

export const buyDevCard = {
  move: (context) => {
    const { G, playerID } = context;
    const result = applyBuyDevCard(G.core, playerID);
    if (!result.ok) {
      console.log(`Invalid buy dev card: ${result.error}`);
      return;
    }
    appendGameLog(G, context.ctx, {
      type: "dev:buy",
      actorId: playerID,
      data: {}
    });
    maybeLogGameOver(G, context.ctx);
  }
};

const isDevCardStage = (ctx, playerID) => {
  const stage = ctx.activePlayers?.[playerID];
  return stage === "preRoll" || stage === "postRoll";
};

export const playDevCardStart = {
  move: (context, cardType, options) => {
    const { G, playerID, ctx, events } = context;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardStage(ctx, playerID)) return;
    if (G.devCardPlay) return;
    if (cardType === "victoryPoint") return;
    if (!canPlayDevCard(G.core, playerID, cardType)) return;

    const currentStage = ctx.activePlayers?.[playerID] ?? "postRoll";
    if (cardType === "knight") {
      const previousAwards = getAwardOwners(G.core);
      const played = playDevCard(G.core, playerID, "knight");
      if (!played.ok) {
        console.log(`Invalid play dev card: ${played.error}`);
        return;
      }
      const result = applyKnight(G.core, playerID);
      if (!result.ok) {
        console.log(`Invalid knight: ${result.error}`);
        return;
      }
      appendGameLog(G, ctx, {
        type: "dev:play",
        actorId: playerID,
        data: { cardType: "knight" },
        forced: options?.forced
      });
      logAwardChanges(G, ctx, previousAwards, options);
      maybeLogGameOver(G, ctx);
      G.robberReturnToStage = currentStage;
      beginRobberMoveStage(context, options);
      return;
    }

    if (cardType === "roadBuilding") {
      const player = G.core?.playerStateById?.[playerID];
      if (!player || player.roadsRemaining <= 0) return;
      const pendingRoads = player.roadsRemaining >= 2 ? 2 : 1;
      G.devCardPlay = { type: "roadBuilding", playerId: playerID, pendingRoads };
      return;
    }

    if (cardType === "yearOfPlenty" || cardType === "monopoly") {
      G.devCardPlay = { type: cardType, playerId: playerID };
    }
  }
};

export const confirmDevCardPlay = {
  move: (context, payload, options) => {
    const { G, playerID, ctx } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.playerId !== playerID) return;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardStage(ctx, playerID)) return;

    let applied = { ok: false, error: "unknown" };
    if (devPlay.type === "yearOfPlenty") {
      applied = applyYearOfPlenty(G.core, playerID, payload);
    } else if (devPlay.type === "monopoly") {
      applied = applyMonopoly(G.core, playerID, payload);
    } else {
      return;
    }

    if (!applied.ok) {
      console.log(`Invalid dev card play: ${applied.error}`);
      return;
    }

    const played = playDevCard(G.core, playerID, devPlay.type);
    if (!played.ok) {
      console.log(`Invalid play dev card: ${played.error}`);
      return;
    }
    appendGameLog(G, ctx, {
      type: "dev:play",
      actorId: playerID,
      data: { cardType: devPlay.type },
      forced: options?.forced
    });

    G.devCardPlay = null;
  }
};

export const autoResolveDevCard = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.playerId !== ctx.currentPlayer) return;
    if (!isDevCardStage(ctx, devPlay.playerId)) return;
    appendGameLog(G, ctx, {
      type: "forced:devCardResolution",
      actorId: "system",
      data: { playerId: devPlay.playerId, cardType: devPlay.type }
    });

    if (devPlay.type === "yearOfPlenty") {
      const resources = Object.values(ResourceType);
      const shuffled = random?.Shuffle
        ? random.Shuffle(resources)
        : resources;
      const payload = [shuffled[0], shuffled[1] ?? shuffled[0]];
      log.setMetadata({ message: "auto-resolving Year of Plenty" });
      confirmDevCardPlay.move(context, payload, { forced: true });
      return;
    }

    if (devPlay.type === "monopoly") {
      const resources = Object.values(ResourceType);
      const choice = pickRandom(resources, random);
      if (!choice) return;
      log.setMetadata({ message: "auto-resolving Monopoly" });
      confirmDevCardPlay.move(context, choice, { forced: true });
    }
  }
};

export const cancelDevCardPlay = {
  move: (context) => {
    const { G, playerID } = context;
    if (!G.devCardPlay || G.devCardPlay.playerId !== playerID) return;
    G.devCardPlay = null;
  }
};

export const placeRoadFromDevCard = {
  move: (context, edge, options) => {
    const { G, playerID, ctx, effects } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.type !== "roadBuilding") return;
    if (devPlay.playerId !== playerID) return;
    if (!isDevCardStage(ctx, playerID)) return;

    const previousAwards = getAwardOwners(G.core);
    const result = applyFreeRoad(G.core, G.coreTopology, edge, playerID);
    if (!result.ok) {
      console.log(`Invalid dev road: ${result.error}`);
      return;
    }
    effects?.placePiece?.({
      pieceType: "road",
      id: edge,
      playerId: playerID,
      initialPlacement: ctx.phase === "placement"
    });
    appendGameLog(G, ctx, {
      type: "build:road",
      actorId: playerID,
      data: { edgeId: edge, free: true, via: "devCard" },
      forced: options?.forced
    });
    logAwardChanges(G, ctx, previousAwards, options);
    maybeLogGameOver(G, ctx);

    devPlay.pendingRoads -= 1;
    if (devPlay.pendingRoads <= 0) {
      const played = playDevCard(G.core, playerID, "roadBuilding");
      if (!played.ok) {
        console.log(`Invalid play dev card: ${played.error}`);
        return;
      }
      appendGameLog(G, ctx, {
        type: "dev:play",
        actorId: playerID,
        data: { cardType: "roadBuilding" },
        forced: options?.forced
      });
      G.devCardPlay = null;
    }
  }
};


export const DEBUG_loadState = {
  move: (context, newState) => {
    // newState should contain the G object
    if (newState && newState.G) {
       // Returning the new state tells boardgame.io to replace G entirely
       return newState.G;
    }
  }
};

export const DEBUG_setScenario = {
  move: (context, scenarioId) => {
      console.log("DEBUG_setScenario execution started", scenarioId);
      const { G, playerID } = context;
      if (!G.core || !G.core.playerStateById[playerID]) {
          console.error("DEBUG_setScenario: Missing core or playerState", playerID);
          return;
      }
      
      const player = G.core.playerStateById[playerID];

      switch (scenarioId) {
          case 'rich':
              // Give lots of resources
              player.resources = ["Wood", "Wood", "Wood", "Wood", "Brick", "Brick", "Brick", "Brick", "Sheep", "Sheep", "Sheep", "Sheep", "Wheat", "Wheat", "Wheat", "Wheat", "Ore", "Ore", "Ore", "Ore"];
              break;
          case 'devCardReady':
              // Exact cards for a few dev cards
              player.resources = ["Sheep", "Wheat", "Ore", "Sheep", "Wheat", "Ore", "Sheep", "Wheat", "Ore"];
              break;
         case 'midGame':
               // 5 of each
              player.resources = []; // Reset first? Or add? Let's reset for scenario consistency
              ["Wood", "Brick", "Sheep", "Wheat", "Ore"].forEach(r => {
                  for(let i=0; i<5; i++) player.resources.push(r);
              });
             break;
          default:
              console.log("Unknown scenario", scenarioId);
      }
  }
};
