import * as nx from "jsnetworkx";
import { current } from "immer";
import { NodeBuildingTypes } from "./game/types";
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

  const bank = G.bank.resourceCards;

  const playerHand = G.players[playerID].resourceCards;
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
    console.log("placing settlement");
    G.nodes[node].building = {type: NodeBuildingTypes.SETTLEMENT, owner: playerID};
    //G.nodes[node].color = G.players[playerID].color;

    //IF placement phase && second settle:
    console.log(context);
    if (ctx.phase == "placement" && ctx.turn > ctx.numPlayers) {
      //get all tiles connected to node
      const resourceTiles = getAllTilesConnectedToNode(G.tiles, node);

      //get the resource of the tile
      const resources = resourceTiles.map((t) => t.tile.resource);

      //we want to provide [{tile}]
      const cardAnims = [];
      for (var tile of resourceTiles) {
        tile = current(tile);
        //check that it's a resource tile AND not blocked

        //TODO: change this to be an array of tile, playerIDs so animations aren't staggered
        cardAnims.push({ tile, playerID });
      }

      effects.distributeCardsFromTile(cardAnims);
      takeCardsFromBank(context, resources, playerID);
    }

    updateValids(context, "road", node);

    //if initial placement
    events.setStage("road");
    //events.endTurn();

    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
};

export const placeRoad = {
    canDo: ()=>console.log('hi'),
  move: (context, edge) => {
    const { G, playerID, events } = context;
    console.log("placing road", edge);
    G.edges[edge].color = G.players[playerID].color;

    events.endTurn();
    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
};

export const playDev = {
  move: (context, edge) => {
    const { G, playerID, events } = context;
    console.log("placing road", edge);
    G.edges[edge].color = G.players[playerID].color;

    events.endTurn();
    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
};

export const rollDice = {
    canDo: ()=>console.log('hi roll dive'),
  move: (context) => {
    const { G, random, effects} = context
    G.diceRoll = random.D6(2); // dieRoll = 1–6
    effects.roll([G.diceRoll[0], G.diceRoll[1]]);

    const diceScore = G.diceRoll[0] + G.diceRoll[1];


    //object of resources to distribution
    const resourcesToDistribute = {}
    for (const p of G.players){
        resourcesToDistribute[p.id] = []
    }
    //easy way to count total resources to check that bank has enough
    //if we're being super legit with our code can infer this from resourcesToDistribute
    const totalResourcesDistributed = {"Wood": 0, "Brick": 0, "Sheep": 0, "Wheat": 0, "Ore": 0}

    if (diceScore === 7) {
      //get all players over discardLimit
      //if numPlayers > 0, for each player, go to discard stage (and wait for completion)
      //after this, set activePlayer to original player and send to placeRobber phase
      //(place robber always returns to previous stage)
      //e.g. can be preRoll if playing knight before turn
      //or postRoll if played knight in-turn or if 7'd
      console.log("discard");
    } else {
      //distribute cards

      //get all tiles with that number
      //TODO: check it's not blocked by robber
      const tilesToProduce = G.tiles.filter((t) => t.tile.number == diceScore);

      const cardAnims = [];
      for (var tile of tilesToProduce) {
        tile = current(tile);

        //get all nodes from tile
        const nodeIDs = Object.values(tile.tile.nodes)

        //check each node to see if building exists
        for (const node of nodeIDs){
            if(G.nodes[node].building !== null){
                const ownerID = G.nodes[node].building.owner
                cardAnims.push({tile, playerID: ownerID})
                if (G.nodes[node].building.type === NodeBuildingTypes.CITY){
                   
                    resourcesToDistribute[ownerID].push(tile.tile.resource)
                    resourcesToDistribute[ownerID].push(tile.tile.resource)
                    totalResourcesDistributed[tile.tile.resource] += 2
                }
                else if (G.nodes[node].building.type === NodeBuildingTypes.SETTLEMENT){
                    resourcesToDistribute[ownerID].push(tile.tile.resource)
                    totalResourcesDistributed[tile.tile.resource] += 1
                }
            }

        }

    
      }


      //check if bank has enough
      for (const key in totalResourcesDistributed) {
        if (totalResourcesDistributed.hasOwnProperty(key)) {
          const requiredCount = totalResourcesDistributed[key];
          const availableCount = G.bank.resourceCards.filter(card => card === key).length;

          console.log(`Giving out ${requiredCount} ${key}, have ${availableCount} in bank`)
          
          // Check if the required count is higher than the available count
          if (requiredCount > availableCount) {
            console.log("TOO MANY. NOT GIVING OUT.")

            context.log.setMetadata({
                message: `Not enough ${key} in bank for all players to receive`,
              });
            //TODO: render 'block' animation for the tile here.

            // Remove cards from "resources"
            for (const playerId in resourcesToDistribute) {
                resourcesToDistribute[playerId] = resourcesToDistribute[playerId].filter(card => card !== key);
            }

            for (let i = cardAnims.length - 1; i >= 0; i--) {
                const anim = cardAnims[i];
                if (anim.tile.tile.resource === key) {
                    cardAnims.splice(i, 1);
                }
            }
          }
        }
      }
      effects.distributeCardsFromTile(cardAnims);
      for (const p in resourcesToDistribute){
        if (resourcesToDistribute[p].length > 0){
            takeCardsFromBank(context, resourcesToDistribute[p], p);
        }
      }
      //takeCardsFromBank(context, resources, 0);
    }

    //then return to postRoll
  },
};

//'meta' is a lil ?hack? (is it?) to pass relevant context for the action,
//e.g. for road, pass a nodeID to make it super easy for initial settle/road placement
export const updateValids = (context, stage, meta) => {
  //get player info. color etc
  const { G, ctx, playerID } = context;
  G.valids.nodes = [];
  G.valids.edges = [];
  switch (stage) {
    case "road":
      var validEdges = [];
      //cheap way of getting the edges. if starting settlement just find edges with that nodeId
      if (meta) {
        for (var edge of Object.keys(G.edges)) {
          const nodeId = parseInt(meta);
          const edgeIds = edge.split(",").map(Number);
          if (edgeIds.includes(nodeId)) {
            validEdges.push({ ...G.edges[edge], id: edge });
          }
        }
      } else {
        for (var edge of Object.keys(G.edges)) {
          var realedge = {...G.edges[edge]};
          realedge["id"] = edge;
          if (!realedge.color) {
            validEdges.push(realedge);
          }
        }
      }
      G.valids.edges = validEdges;
      break;
    case "settlement":
      //TODO: this is only for initial settlements. doesn't do road detection
      //TODO: return invalid move?
      var allNodes = G.nodes;

      //for each tile, get its nodes
      const STATIC_GRAPH = new nx.Graph();
      for (const tile of Object.values(G.tiles)) {
        STATIC_GRAPH.addNodesFrom(Object.values(tile.tile.nodes));
        STATIC_GRAPH.addEdgesFrom(Object.values(tile.tile.edges));
      }

      var invalidNodes = [];
      for (let node in Object.keys(allNodes)) {
        node = allNodes[node];


        if (node.building !== null) {
          //remove node
          invalidNodes.push(node.id);
          //get all neighbors and also remove
          for (const builtNode of STATIC_GRAPH.neighbors(parseInt(node.id))) {
            invalidNodes.push(builtNode.toString());
          }
        }
      }

      const validNodes = removeNodesByIds(allNodes, invalidNodes);

      let finalValidNodes = [];
      for (const node of Object.keys(validNodes)) {
        var realnode = validNodes[node];
        realnode["id"] = node;
        finalValidNodes.push(realnode);
      }
      G.valids.nodes = finalValidNodes;
      break;
    default:
        G.valids.edges = [];
        G.valids.nodes = []
        break;
  }
};

const filterObjectsWithNotNullBuildingType = (obj) => {
  // Initialize an array to store the filtered objects
  const filteredObjects = [];

  // Iterate through the object properties and values
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const item = obj[key];

      // Check if the "buildingType" property is null
      if (item.buildingType !== null) {
        // Add the object to the filtered array
        filteredObjects.push(item);
      }
    }
  }

  return filteredObjects;
};

function removeNodesByIds(nodeObj, idsToRemove) {
  const filteredNodes = Object.assign({}, nodeObj); // Create a copy of the original object

  idsToRemove.forEach((id) => {
    delete filteredNodes[id]; // Remove the object with the specified ID
  });

  return filteredNodes;
}


export const getAvailableMoves = context =>{

}