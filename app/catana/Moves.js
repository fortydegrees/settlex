
import { current } from "immer";
import { ResourceType, TileTypes } from "./game/types";
import {
  applyBuildCity,
  applyBuildRoad,
  applyBuildSettlement,
  applyFreeRoad,
  applyEndTurn,
  applyKnight,
  applyMonopoly,
  applyMoveRobber,
  applyPlaceRoad,
  applyPlaceSettlement,
  applyRollDice,
  applyYearOfPlenty,
  applyDiscard,
  applyMaritimeTrade,
  buildableEdges,
  buildableNodes,
  buyDevCard as applyBuyDevCard,
  canPlayDevCard,
  playDevCard
} from "@settlex/game-core";

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


//used for giving out resources on 2nd placement
function getAllTilesConnectedToNode(tiles, nodeId) {
  // Initialize an array to store the matching tiles
  const matchingTiles = [];

  // Iterate through the tiles array
  for (const tile of tiles) {
    // Iterate through the keys of the nodes object in the tile
    for (const direction in tile.tile.nodes) {
      // Check if the nodeId matches the value in the nodes object
      //TODO: make nodeID either a string or an integer..
      if (tile.tile.nodes[direction] === parseInt(nodeId)) {
        // If it matches, add the tile to the matchingTiles array
        matchingTiles.push(tile);
        // Break out of the loop for this tile since we found a match
        break;
      }
    }
  }

  return matchingTiles;
}

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
  move: (context, node) => {
    const { G, playerID, events, ctx, effects } = context;
    const nodeId = parseInt(node);
    const isPlacement = ctx.phase === "placement";
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
    //distribute initial resource cards IF placement phase && second settle:
    if (isPlacement && ctx.turn > ctx.numPlayers) {
      //get all tiles connected to node
      const resourceTiles = getAllTilesConnectedToNode(G.tiles, node);

      //get the resource of the tile
      const resources = resourceTiles
      .filter(t => t.type === TileTypes.LAND && t.tile.resource !== ResourceType.DESERT)
      .map(t => t.tile.resource);

      //we want to provide [{tile}]
      const cardAnims = [];
      for (var tile of resourceTiles) {
        tile = current(tile);
        //check that it's a resource tile AND not blocked
        if (tile.type === TileTypes.LAND && tile.tile.resource !== ResourceType.DESERT){
        //TODO: change this to be an array of tile, playerIDs so animations aren't staggered
        cardAnims.push({ tile, playerID });
        }


      }

      effects.distributeCardsFromTile(cardAnims);
      takeCardsFromBank(context, resources, playerID);
    }

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


export const placeRoad = {
  move: (context, edge) => {
    const { G, playerID, events, ctx } = context;
    const isPlacement = ctx.phase === "placement";
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

    //if we're in placement phase, end turn after placing road
    if (isPlacement){
    events.endTurn();
    }
    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
}

export const placeCity = {
  move: (context, node) => {
    const { G, playerID, ctx } = context;
    if (ctx.phase === "placement") {
      return;
    }
    const nodeId = parseInt(node);
    const result = applyBuildCity(G.core, G.coreTopology, nodeId, playerID);
    if (!result.ok) {
      console.log(`Invalid city placement at node ${node}`);
    }
  }
};


//we need to either return to preRoll (if robber moved from knight played before rolling dice)
//or postRoll (if played from rolling a 7 or knight mid-turn)
export const moveRobber = {
  move: (context, tileID) =>{
    const { G, events, ctx, random } = context;
    
    // Generate a random number for stealing (deterministic)
    // We pass this to the core logic, which will use modulo to select the actual card if needed
    const stolenCardIndex = random.Number(); 
    
    const result = applyMoveRobber(G.core, G.coreTopology, tileID, ctx.currentPlayer, stolenCardIndex);
    if (!result.ok) {
      console.log(`Invalid robber placement on tile ${tileID}: ${result.error}`);
      return;
    }

    const returnTo =
      G.robberReturnToStage ||
      context.ctx.activePlayers?.[context.ctx.currentPlayer]?.returnTo ||
      "postRoll";
    if (G.core) {
      G.core.turn.phase = returnTo === "preRoll" ? "preRoll" : "postRoll";
    }
    G.robberReturnToStage = null;
    events.setStage(returnTo);
}
}

export const rollDice = {
  canDo: () => console.log("hi roll dive"),
  move: (context) => {
    const { G, random, effects, events } = context;
    const roll = random.D6(2);
    G.diceRoll = roll;
    effects.roll([roll[0], roll[1]]);

    const diceScore = roll[0] + roll[1];
    const result = applyRollDice(G.core, G.coreTopology, diceScore);
    if (!result.ok) {
      console.log("Invalid dice roll");
      return;
    }

    // Trigger resource distribution animations
    if (result.distributions?.length > 0) {
      const cardAnims = result.distributions.map(d => ({
        tile: G.tiles.find(t => t.tile.id === d.tileId),
        playerID: d.playerId,
        resource: d.resource,
      }));
      effects.distributeCardsFromTile(cardAnims);
    }

    // Trigger robber-blocked feedback
    if (result.blockedTiles?.length > 0) {
      effects.robberBlocked(result.blockedTiles);
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
        events.setStage("moveRobber");
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
  move: (context) => {
    const { G, ctx, events } = context;
    if (G.core) {
      G.core.phase = ctx.phase === "placement" ? "placement" : "normal";
    }
    const result = applyEndTurn(G.core);
    if (!result.ok) {
      console.log(`Invalid end turn: ${result.error}`);
      return;
    }

    const nextPlayerId = G.core.turn.currentPlayerId;
    events.endTurn({ next: nextPlayerId });
  }
};

export const discardResources = {
  move: (context, resources) => {
    const { G, playerID, events } = context;
    // Assume core G structure
    const result = applyDiscard(G.core, playerID, resources);
    if (!result.ok) {
      console.log(`Invalid discard: ${result.error}`);
      return;
    }

    // After a successful discard, this player is done with this stage.
    // We remove them from the active players.
    events.endStage();

    // Check if we need to advance phase/stage for the *game*
    // applyDiscard updates pendingDiscards and potentially state.turn.phase to 'robberMove'
    if (G.core.turn.phase === "robberMove") {
       // Everyone has discarded. Now the CURRENT PLAYER needs to move the robber.
       // We explicitly set the active player back to the current player for the moveRobber stage.
       events.setActivePlayers({
         currentPlayer: "moveRobber",
         // ensure others are not active? setActivePlayers overwrites previous configuration by default unless strictly additive?
         // Documentation says "This takes the stage configuration to the value..." implying it sets the state.
       });
    }
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
    }
  }
};

export const buyDevCard = {
  move: (context) => {
    const { G, playerID } = context;
    const result = applyBuyDevCard(G.core, playerID);
    if (!result.ok) {
      console.log(`Invalid buy dev card: ${result.error}`);
    }
  }
};

const isDevCardStage = (ctx, playerID) => {
  const stage = ctx.activePlayers?.[playerID];
  return stage === "preRoll" || stage === "postRoll";
};

export const playDevCardStart = {
  move: (context, cardType) => {
    const { G, playerID, ctx, events } = context;
    if (playerID !== ctx.currentPlayer) return;
    if (!isDevCardStage(ctx, playerID)) return;
    if (G.devCardPlay) return;
    if (cardType === "victoryPoint") return;
    if (!canPlayDevCard(G.core, playerID, cardType)) return;

    const currentStage = ctx.activePlayers?.[playerID] ?? "postRoll";
    if (cardType === "knight") {
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
      G.robberReturnToStage = currentStage;
      events.setStage("moveRobber");
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
  move: (context, payload) => {
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

    G.devCardPlay = null;
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
  move: (context, edge) => {
    const { G, playerID, ctx } = context;
    const devPlay = G.devCardPlay;
    if (!devPlay || devPlay.type !== "roadBuilding") return;
    if (devPlay.playerId !== playerID) return;
    if (!isDevCardStage(ctx, playerID)) return;

    const result = applyFreeRoad(G.core, G.coreTopology, edge, playerID);
    if (!result.ok) {
      console.log(`Invalid dev road: ${result.error}`);
      return;
    }

    devPlay.pendingRoads -= 1;
    if (devPlay.pendingRoads <= 0) {
      const played = playDevCard(G.core, playerID, "roadBuilding");
      if (!played.ok) {
        console.log(`Invalid play dev card: ${played.error}`);
        return;
      }
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
