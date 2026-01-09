
import { current } from "immer";
import { ResourceType } from "./game/types";
import {
  applyBuildCity,
  applyBuildRoad,
  applyBuildSettlement,
  applyMoveRobber,
  applyPlaceRoad,
  applyPlaceSettlement,
  applyRollDice,
  buildableEdges,
  buildableNodes
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
      .filter(t => t.tile.resource !== ResourceType.DESERT)
      .map(t => t.tile.resource);

      //we want to provide [{tile}]
      const cardAnims = [];
      for (var tile of resourceTiles) {
        tile = current(tile);
        //check that it's a resource tile AND not blocked
        if (tile.tile.resource !== ResourceType.DESERT){
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


export const getBuildableEdges = (playerID, G) =>{
  const isPlacement = G.core?.phase === "placement";
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
    const { G, events, ctx } = context;
    const result = applyMoveRobber(G.core, G.coreTopology, tileID, ctx.currentPlayer);
    if (!result.ok) {
      console.log(`Invalid robber placement on tile ${tileID}`);
      return;
    }

    const returnTo =
      context.ctx.activePlayers[context.ctx.currentPlayer].returnTo || "postRoll";
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

    if (diceScore === 7) {
      // Temporary: skip robber UI and continue so the game doesn't stall.
      events.setStage("postRoll");
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
