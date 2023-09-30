import * as nx from "jsnetworkx";

function getAllTiles(tiles, nodeId) {

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
export const takeCardsFromBank = (context, cards, playerID)=> {

    const { G } = context;
    console.log('giving cards',G,  cards, playerID)

    const bank = G.bank.resourceCards

    const playerHand = G.players[playerID].resourceCards
    const cardLog = []
    for (const card of cards) {
        const cardIndex = bank.indexOf(card);
        
        // Check if the card exists in the bank
        if (cardIndex !== -1) {
          // Remove the card from the bank
          bank.splice(cardIndex, 1);
          
          // Add the card to the player's hand (assuming playerId is an identifier)
          playerHand.push(card);
          cardLog.push(card)
        }
      }
      context.log.setMetadata({
        message: `player ${playerID} received ${cardLog}`,
      });
  }
  export const diceRoll = {
    move: (context) => {

        //if 7:
        //move activePlayer to placeRobber stage
        //event.setStage("placeRobber")
        
        //check all resource cards are in bank first
        //get total resources to distribute
        //if amount of each resource is >= amount in bank:
        //for each player, takeCardsFromBank
        //else, return 'can't distribute as not enough cards in bank'
    }
}

export const placeSettlement = {
  move: (context, node) => {
    const { G, playerID, events } = context;
    console.log("placing settlement");
    G.nodes[node].buildingType = "settlement";
    G.nodes[node].color = G.players[playerID].color;


    //IF placement phase && second settle:
    console.log(context)
    if (context.ctx.phase == "placement" && context.ctx.turn > context.ctx.numPlayers){
    const resourceTiles = getAllTiles(G.tiles, node)
    const resources = resourceTiles.map(t=>t.tile.resource)

    takeCardsFromBank(context, resources, playerID)
    }

    updateValids(context, "road");

    //if initial placement
    events.setStage("road");
    //events.endTurn();

    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
};

export const placeRoad = {
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

export const updateValids = (context, stage) => {
  //get player info. color etc
  const { G, ctx, playerID } = context;
  G.valids.nodes = [];
  G.valids.edges = [];
  switch (stage) {
    case "road":
      var validEdges = [];
      for (var edge of Object.keys(G.edges)) {
        var realedge = G.edges[edge];
        realedge["id"] = edge;
        if (!realedge.color) {
          validEdges.push(realedge);
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

        if (node.buildingType !== null) {
          console.log("node", node);
          //remove node
          invalidNodes.push(node.id);
          //get all neighbors and also remove
          console.log(STATIC_GRAPH.neighbors(parseInt(node.id)));
          for (const builtNode of STATIC_GRAPH.neighbors(parseInt(node.id))) {
            console.log(builtNode);
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
      console.log(finalValidNodes);
      G.valids.nodes = finalValidNodes;
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
