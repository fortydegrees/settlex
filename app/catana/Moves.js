
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
  applyMaritimeTradeBatch,
  buildableEdges,
  buildableNodes,
  buyDevCard as applyBuyDevCard,
  canPlaceRobber,
  canPlayDevCard,
  createBalancedDiceState,
  drawBalancedDice,
  playDevCard
} from "@settlex/game-core";
import { appendGameLog } from "./utils/gameLog.js";

const DEV_CARD_CHOICE_STAGE = "devCardChoice";
const CHOICE_DEV_CARD_TYPES = new Set(["yearOfPlenty", "monopoly"]);
const STANDARD_RESOURCE_TYPES = [
  ResourceType.WOOD,
  ResourceType.BRICK,
  ResourceType.SHEEP,
  ResourceType.WHEAT,
  ResourceType.ORE
];

const countResources = (resources = []) =>
  resources.reduce((acc, resource) => {
    acc[resource] = (acc[resource] ?? 0) + 1;
    return acc;
  }, {});

const getTileLogData = (G, tileId) => {
  const tile = G?.tiles?.find((entry) => String(entry?.tile?.id) === String(tileId));
  return {
    tileId,
    tileResource: tile?.tile?.resource ?? null,
    tileNumber: tile?.tile?.number ?? null
  };
};

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

const logResourceShortages = (G, ctx, shortages, options) => {
  if (!Array.isArray(shortages) || shortages.length === 0) return;
  shortages.forEach((shortage) => {
    if (!shortage?.resource) return;
    appendGameLog(G, ctx, {
      type: "resource:shortage",
      data: shortage,
      forced: options?.forced
    });
  });
};

const drawDiceForRoll = ({ G, ctx, random }) => {
  if (G.core?.ruleset?.diceMode !== "balanced") {
    return random.D6(2);
  }

  const playerIds = G.core?.players ?? ctx?.playOrder ?? [];
  if (!G.diceState || G.diceState.mode !== "balanced") {
    G.diceState = createBalancedDiceState(playerIds);
  }

  return drawBalancedDice(G.diceState, {
    playerId: String(ctx?.currentPlayer ?? G.core?.turn?.currentPlayerId ?? "0"),
    playerIds: playerIds.map(String),
    rng: () => random.Number()
  });
};

const getAwardOwners = (core) => ({
  longestRoadOwnerId: core?.awards?.longestRoadOwnerId ?? null,
  largestArmyOwnerId: core?.awards?.largestArmyOwnerId ?? null
});

const buildDevCardPlayEffectId = ({ playerId, cardType, turn }) =>
  `devcard:${cardType}:${playerId}:turn-${turn ?? "unknown"}`;

const buildKnightPlayPayload = ({
  G,
  ctx,
  playerId,
  phase,
  startedFromStage,
  previousKnightsPlayed,
  previousLargestArmyOwnerId
}) => {
  const currentPlayerState = G?.core?.playerStateById?.[playerId];
  const nextKnightsPlayed = currentPlayerState?.knightsPlayed ?? previousKnightsPlayed;
  const currentAwards = getAwardOwners(G?.core);
  return {
    effectId: buildDevCardPlayEffectId({
      playerId,
      cardType: "knight",
      turn: ctx?.turn
    }),
    playerId,
    cardType: "knight",
    phase,
    startedFromStage: startedFromStage ?? null,
    previousKnightsPlayed,
    nextKnightsPlayed,
    previousLargestArmyOwnerId: previousLargestArmyOwnerId ?? null,
    nextLargestArmyOwnerId: currentAwards.largestArmyOwnerId ?? null
  };
};

const buildRoadBuildingPlayPayload = ({
  ctx,
  playerId,
  phase,
  startedFromStage,
  pendingRoads,
  previousRoadsRemaining,
  nextRoadsRemaining,
  effectId
}) => ({
  effectId:
    effectId ??
    buildDevCardPlayEffectId({
      playerId,
      cardType: "roadBuilding",
      turn: ctx?.turn
    }),
  playerId,
  cardType: "roadBuilding",
  phase,
  startedFromStage: startedFromStage ?? null,
  pendingRoads,
  previousRoadsRemaining,
  nextRoadsRemaining
});

const buildChoiceDevCardPlayPayload = ({
  ctx,
  playerId,
  cardType,
  phase,
  startedFromStage,
  effectId,
  resources,
  resource,
  transfers,
  totalTransferred
}) => ({
  effectId:
    effectId ??
    buildDevCardPlayEffectId({
      playerId,
      cardType,
      turn: ctx?.turn
    }),
  playerId,
  cardType,
  phase,
  startedFromStage: startedFromStage ?? null,
  ...(resources ? { resources } : {}),
  ...(resource ? { resource } : {}),
  ...(transfers ? { transfers } : {}),
  ...(totalTransferred != null ? { totalTransferred } : {})
});

const buildMonopolyTransfers = (core, playerId, resource) =>
  Object.entries(core?.playerStateById ?? {})
    .filter(([otherId]) => otherId !== playerId)
    .map(([otherId, other]) => ({
      fromPlayerId: otherId,
      toPlayerId: playerId,
      resource,
      count: (other?.resources ?? []).filter((entry) => entry === resource).length
    }))
    .filter((entry) => entry.count > 0);

const hasMaskedOpponentResources = (core, playerId) =>
  Object.entries(core?.playerStateById ?? {}).some(
    ([otherId, other]) =>
      otherId !== playerId &&
      (other?.resources ?? []).some((resource) => resource === "hidden")
  );

const storePendingKnightPlayAnimation = (G, payload) => {
  G.pendingDevCardPlayAnimation = {
    ...payload,
    phase: "pending"
  };
};

const emitPendingDevCardPlayResolved = (context) => {
  const { G, ctx, effects } = context;
  const pending = G?.pendingDevCardPlayAnimation;
  if (!pending || pending.cardType !== "knight") return;
  const payload = buildKnightPlayPayload({
    G,
    ctx,
    playerId: pending.playerId,
    phase: "resolve",
    startedFromStage: pending.startedFromStage,
    previousKnightsPlayed: pending.previousKnightsPlayed,
    previousLargestArmyOwnerId: pending.previousLargestArmyOwnerId
  });
  effects?.devCardPlayResolved?.(payload);
  G.pendingDevCardPlayAnimation = null;
};

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
  DISCONNECT_FORFEIT: "Disconnect Forfeit",
  AFK_FORFEIT: "AFK Forfeit"
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

export const resolveIdleForfeit = {
  client: false,
  move: (context, losingPlayerIdArg) => {
    resolveTerminalForfeit(
      context,
      losingPlayerIdArg ?? context.playerID,
      GAME_OVER_REASONS.AFK_FORFEIT
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
  client: false,
  move: (context) => {
    const snapshot = JSON.parse(JSON.stringify(context.G ?? {}));
    delete snapshot.debugScenarioState;
    context.G.debugScenarioState = snapshot;
  }
};

export const DEBUG_clearCapturedScenarioState = {
  client: false,
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

const setCurrentPlayerStage = (context, stage) => {
  const { events } = context;
  if (typeof events?.setActivePlayers === "function") {
    events.setActivePlayers({ currentPlayer: stage, others: null });
    return;
  }
  events?.setStage?.(stage);
};

const finishRobberResolution = (context) => {
  const { G } = context;
  const returnTo = getRobberReturnStage(context);
  if (G.core) {
    G.core.turn.phase = returnTo === "preRoll" ? "preRoll" : "postRoll";
  }
  G.robberReturnToStage = null;
  setCurrentPlayerStage(context, returnTo);
  emitPendingDevCardPlayResolved(context);
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
  const { G } = context;
  if (getRobberCandidateTileIds(G).length === 0) {
    skipRobberMoveNoValidTile(context, options);
    return false;
  }
  setCurrentPlayerStage(context, "moveRobber");
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
      data: getTileLogData(G, tileID),
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
    const roll = drawDiceForRoll(context);
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
    logResourceShortages(G, context.ctx, result.shortages, options);

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
          others: null,
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

    if (G.devCardPlay?.playerId === ctx.currentPlayer) {
      G.devCardPlay = null;
    }
    G.robberReturnToStage = null;

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

    if (G.core.turn.phase === "robberMove") {
      beginRobberMoveStage(context, options);
      return;
    }

    // After a successful discard, this player is done with this stage.
    // We remove them from the active players.
    events.endStage();
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
      data: getTileLogData(G, tileId),
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
    const { G, playerID } = context;

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
  }
};

export const buyDevCard = {
  client: false,
  move: (context) => {
    const { G, playerID, effects } = context;
    const result = applyBuyDevCard(G.core, playerID);
    if (!result.ok) {
      console.log(`Invalid buy dev card: ${result.error}`);
      return;
    }
    effects?.buyDevCardReveal?.({
      playerId: playerID,
      cardType: result.cardType
    });
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

const isDevCardChoiceStage = (ctx, playerID) =>
  ctx.activePlayers?.[playerID] === DEV_CARD_CHOICE_STAGE;

const getDevCardReturnStage = (devPlay) =>
  devPlay?.startedFromStage === "preRoll" ? "preRoll" : "postRoll";

const finishDevCardChoice = (context, devPlay) => {
  context.G.devCardPlay = null;
  setCurrentPlayerStage(context, getDevCardReturnStage(devPlay));
};

const buildAutoYearOfPlentyPayload = (core, random) => {
  if (!core?.ruleset?.bank?.finite) {
    const shuffled = random?.Shuffle
      ? random.Shuffle(STANDARD_RESOURCE_TYPES)
      : STANDARD_RESOURCE_TYPES;
    return [shuffled[0], shuffled[1] ?? shuffled[0]];
  }

  const available = [];
  for (const resource of STANDARD_RESOURCE_TYPES) {
    const count = (core.bank?.resources ?? []).filter((entry) => entry === resource).length;
    for (let index = 0; index < Math.min(2, count); index += 1) {
      available.push(resource);
    }
  }
  const shuffled = random?.Shuffle ? random.Shuffle(available) : available;
  return shuffled.slice(0, 2);
};

export const playDevCardStart = {
  move: (context, cardType, options) => {
    const { G, playerID, ctx, events, effects } = context;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardStage(ctx, playerID)) return;
    if (G.devCardPlay) return;
    if (cardType === "victoryPoint") return;
    if (!canPlayDevCard(G.core, playerID, cardType)) return;

    const currentStage = ctx.activePlayers?.[playerID] ?? "postRoll";
    if (cardType === "knight") {
      const previousAwards = getAwardOwners(G.core);
      const previousKnightsPlayed =
        G.core?.playerStateById?.[playerID]?.knightsPlayed ?? 0;
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
      const startPayload = buildKnightPlayPayload({
        G,
        ctx,
        playerId: playerID,
        phase: "start",
        startedFromStage: currentStage,
        previousKnightsPlayed,
        previousLargestArmyOwnerId: previousAwards.largestArmyOwnerId
      });
      storePendingKnightPlayAnimation(G, startPayload);
      effects?.devCardPlayStarted?.(startPayload);
      G.robberReturnToStage = currentStage;
      beginRobberMoveStage(context, options);
      return;
    }

    if (cardType === "roadBuilding") {
      const player = G.core?.playerStateById?.[playerID];
      if (!player || player.roadsRemaining <= 0) return;
      const previousRoadsRemaining = player.roadsRemaining;
      const legalEdges = buildableEdges(G.core, G.coreTopology, playerID, {
        initialPlacement: false
      });
      const pendingRoads = Math.min(2, player.roadsRemaining, legalEdges.length);
      if (pendingRoads <= 0) return;
      const startPayload = buildRoadBuildingPlayPayload({
        ctx,
        playerId: playerID,
        phase: "start",
        startedFromStage: currentStage,
        pendingRoads,
        previousRoadsRemaining,
        nextRoadsRemaining: player.roadsRemaining
      });
      G.devCardPlay = {
        type: "roadBuilding",
        playerId: playerID,
        pendingRoads,
        effectId: startPayload.effectId,
        startedFromStage: currentStage,
        previousRoadsRemaining
      };
      effects?.devCardPlayStarted?.(startPayload);
      return;
    }

    if (cardType === "yearOfPlenty" || cardType === "monopoly") {
      const startPayload = buildChoiceDevCardPlayPayload({
        ctx,
        playerId: playerID,
        cardType,
        phase: "start",
        startedFromStage: currentStage
      });
      G.devCardPlay = {
        type: cardType,
        playerId: playerID,
        effectId: startPayload.effectId,
        startedFromStage: currentStage
      };
      effects?.devCardPlayStarted?.(startPayload);
      setCurrentPlayerStage(context, DEV_CARD_CHOICE_STAGE);
    }
  }
};

export const confirmDevCardPlay = {
  move: (context, payload, options) => {
    const { G, playerID, ctx, effects } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.playerId !== playerID) return;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardChoiceStage(ctx, playerID)) return;

    let applied = { ok: false, error: "unknown" };
    let resolvePayload = null;
    if (devPlay.type === "yearOfPlenty") {
      applied = applyYearOfPlenty(G.core, playerID, payload);
      resolvePayload = buildChoiceDevCardPlayPayload({
        ctx,
        playerId: playerID,
        cardType: devPlay.type,
        phase: "resolve",
        startedFromStage: devPlay.startedFromStage,
        effectId: devPlay.effectId,
        resources: Array.isArray(payload) ? payload : []
      });
    } else if (devPlay.type === "monopoly") {
      const transfersAreKnown = !hasMaskedOpponentResources(G.core, playerID);
      const transfers = transfersAreKnown
        ? buildMonopolyTransfers(G.core, playerID, payload)
        : [];
      applied = applyMonopoly(G.core, playerID, payload);
      if (transfersAreKnown) {
        resolvePayload = buildChoiceDevCardPlayPayload({
          ctx,
          playerId: playerID,
          cardType: devPlay.type,
          phase: "resolve",
          startedFromStage: devPlay.startedFromStage,
          effectId: devPlay.effectId,
          resource: payload,
          transfers,
          totalTransferred: transfers.reduce((total, entry) => total + entry.count, 0)
        });
      }
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
    if (devPlay.type === "monopoly") {
      appendGameLog(G, ctx, {
        type: "dev:monopolyResult",
        actorId: playerID,
        data: {
          resource: applied.resource,
          amountStolen: applied.amountStolen ?? 0
        },
        forced: options?.forced
      });
    }

    if (resolvePayload) {
      effects?.devCardPlayResolved?.(resolvePayload);
    }
    finishDevCardChoice(context, devPlay);
  }
};

export const autoResolveDevCard = {
  move: (context) => {
    const { G, ctx, random, log } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.playerId !== ctx.currentPlayer) return;
    if (!isDevCardChoiceStage(ctx, devPlay.playerId)) return;
    appendGameLog(G, ctx, {
      type: "forced:devCardResolution",
      actorId: "system",
      data: { playerId: devPlay.playerId, cardType: devPlay.type }
    });

    if (devPlay.type === "yearOfPlenty") {
      const payload = buildAutoYearOfPlentyPayload(G.core, random);
      log.setMetadata({ message: "auto-resolving Year of Plenty" });
      confirmDevCardPlay.move(context, payload, { forced: true });
      return;
    }

    if (devPlay.type === "monopoly") {
      const choice = pickRandom(STANDARD_RESOURCE_TYPES, random);
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
    if (CHOICE_DEV_CARD_TYPES.has(G.devCardPlay.type)) return;
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
    const remainingLegalEdges = buildableEdges(G.core, G.coreTopology, playerID, {
      initialPlacement: false
    });
    if (devPlay.pendingRoads <= 0 || remainingLegalEdges.length === 0) {
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
      effects?.devCardPlayResolved?.(
        buildRoadBuildingPlayPayload({
          ctx,
          playerId: playerID,
          phase: "resolve",
          startedFromStage: devPlay.startedFromStage,
          pendingRoads: devPlay.pendingRoads,
          previousRoadsRemaining: devPlay.previousRoadsRemaining,
          nextRoadsRemaining:
            G.core?.playerStateById?.[playerID]?.roadsRemaining ?? null,
          effectId: devPlay.effectId
        })
      );
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
