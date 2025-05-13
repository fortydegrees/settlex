
import { current } from "immer";
import { NodeBuildingTypes } from "./game/types";
import { STATIC_GRAPH }  from "./Game";

//used for giving cards to a player by clicking on icon for testing
//TODO: remove
export const DEBUG_takeCardsFromBank = {
  move: (context, playerID, cards) => {
    const { G } = context;
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

    const buildable = getBuildableNodes(playerID, G, ctx);

    console.log('buildable nodes', buildable);
    
    // Validate node is buildable
    const nodeId = parseInt(node);
    if (!buildable.includes(nodeId)) {
      console.log(`Invalid settlement placement at node ${node}`);
      return; // Return without placing if invalid
    }
    
    G.nodes[node].building = {
      type: NodeBuildingTypes.SETTLEMENT,
      owner: playerID,
    };
    G.players[playerID].numSettlements--;
    
    if (ctx.phase === "placement") {
      G.connectedComponents[playerID].push([node]);
    }
    else {
      let edgesByColor = {};
      STATIC_GRAPH.edges(node).forEach(edge => {
          let edgeColor = this.roads.get(edge) || null;
          if (!edgesByColor[edgeColor]) {
              edgesByColor[edgeColor] = [];
          }
          edgesByColor[edgeColor].push(edge);
      });

      // for edge in STATIC_GRAPH.edges(node_id):
      //           edges_by_color[self.roads.get(edge, None)].append(edge)
    }



    //distribute initial resource cards IF placement phase && second settle:
    if (ctx.phase == "placement" && ctx.turn > ctx.numPlayers) {
      //get all tiles connected to node
      const resourceTiles = getAllTilesConnectedToNode(G.tiles, node);

      //get the resource of the tile
      const resources = resourceTiles
      .filter(t => t.tile.resource !== "Desert")
      .map(t => t.tile.resource);

      //we want to provide [{tile}]
      const cardAnims = [];
      for (var tile of resourceTiles) {
        tile = current(tile);
        //check that it's a resource tile AND not blocked
        if (tile.tile.resource !== "Desert"){
        //TODO: change this to be an array of tile, playerIDs so animations aren't staggered
        cardAnims.push({ tile, playerID });
        }


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

export const placeRoadOld = {
  move: (context, edge) => {
    const { G, playerID, events } = context;
    G.edges[edge].color = G.players[playerID].color;
    G.players[playerID].numRoads--;
    events.endTurn();
    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
};

export const getBuildableEdges = (playerID, G) =>{
  //TODO: this shouldn't be here but i'm hacking it together to make it work
  //v inefficient doing this every time
  const buildableSubgraph = STATIC_GRAPH.subgraph(Object.keys(G.nodes).map(a=>parseInt(a))) //what does land_nodes look like? atm just getting all numbers of nodes
  
  
  let expandable = new Set();

  let expandableNodes = new Set();
    G.connectedComponents[playerID].forEach(connectedComponent => {
      if (Array.isArray(connectedComponent)){
      connectedComponent.forEach(node=>{
        expandableNodes.add(parseInt(node))
      })
    }
    else{
      expandableNodes.add(parseInt(connectedComponent))
    }
    });


    let candidateEdges = buildableSubgraph.edges(expandableNodes);

    candidateEdges.forEach(edge => {
      let sortedEdge = edge.slice().sort();
        if (G.edges[sortedEdge].color === null) {
            
            expandable.add(sortedEdge.join(',')); // Store as a string to ensure uniqueness
        }
    });

    return Array.from(expandable).map(e => e.split(',').map(Number));

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
  // Check if we're in placement phase
  const isPlacementPhase = ctx && ctx.phase === "placement";

  // Special handling for placement phase
  if (isPlacementPhase) {
    // In placement phase, all nodes are potentially buildable
    // except those with buildings or adjacent to buildings
    const invalidNodeIds = new Set();
  
    // Find all nodes with buildings and their neighbors
    for (const nodeId in G.nodes) {
      const node = G.nodes[nodeId];
      if (node.building !== null) {
        // Add the node with a building
        const id = parseInt(nodeId);
        invalidNodeIds.add(id);
        
        // Add all neighboring nodes (distance rule)
        for (const neighborId of STATIC_GRAPH.neighbors(id)) {
          invalidNodeIds.add(neighborId);
        }
      }
    }
    
    // Directly collect valid nodes in a single pass
    const validNodeIds = [];
    for (const nodeId in G.nodes) {
      const id = parseInt(nodeId);
      if (!invalidNodeIds.has(id)) {
        validNodeIds.push(id);
      }
    }
    
    // Sort and return
    return validNodeIds.sort((a, b) => a - b);
    
  }
  
  // Regular gameplay - use connected components
  let expandableNodes = new Set();

  G.connectedComponents[playerID].forEach(connectedComponent => {
    if (Array.isArray(connectedComponent)) {
      connectedComponent.forEach(node => {
        expandableNodes.add(parseInt(node));
      });
    } else {
      expandableNodes.add(parseInt(connectedComponent));
    }
  });

  // Filter out nodes that already have buildings
  const buildableNodes = Array.from(expandableNodes)
    .filter(node => {
      const nodeObj = G.nodes[node];
      return nodeObj && nodeObj.building === null;
    })
    .sort((a, b) => a - b);

  return buildableNodes;
}

function removeResource(G, playerID, resource) {
  // Find the index of the first occurrence of the resource
  const index = G.players[playerID].resourceCards.indexOf(resource);

  // If the resource is found, remove it
  if (index !== -1) {
    G.players[playerID].resourceCards.splice(index, 1);
  }
}

export const placeRoad = {
  move: (context, edge) => {
    const { G, playerID, events } = context;
    const opponentID = (playerID == "0" ? "1" : "0") //hack
   

    //get buildable edges based on colour
    const buildable = getBuildableEdges(playerID, G)

    console.log('buildable', buildable) //this returns valid buildable edges (for initial placement)

    //TODO: check if edge not in 'buildable'

    console.log('edge before split', edge)

    //place road
    G.edges[edge].color = G.players[playerID].color;
    G.players[playerID].numRoads--;

    //remove resources
    //TODO: check user not playing RB card
    if (context.ctx.phase !== "placement"){
    removeResource(G, playerID, "Wood");
    removeResource(G, playerID, "Brick");
    }

    //update connected components
    //get each nodeId of the edge
    const [a, b] = edge.split(",")

    //get the connected components graph and see which connectedComponent graph the node is in. it will be in one of them.
    const aIndex = G.connectedComponents[playerID].findIndex(group => group.includes(a));
    const bIndex = G.connectedComponents[playerID].findIndex(group => group.includes(b));


    if (aIndex < 0 && G.nodes[a].building?.owner !== opponentID ){
      G.connectedComponents[playerID][bIndex].push(a)
    }
    else if (bIndex < 0 && G.nodes[b].building?.owner !== opponentID ){
      G.connectedComponents[playerID][aIndex].push(b)
    }
    //merge
    else if (aIndex > -1 && bIndex > -1 && aIndex !== bIndex){
      //TODO: might need testing as not sure if we want to remove duplicate values or if it should be stored in another format...
      
      //UPDATE: AI Told me to take this out (see ai_review/A/quick_fixes.js)
      //G.connectedComponents[playerID] = Array.from(new Set(G.connectedComponents[playerID].flat()));
        // Properly merge the two components
      const mergedComponent = [
        ...G.connectedComponents[playerID][aIndex],
        ...G.connectedComponents[playerID][bIndex]
      ];
      
      // Remove the old components
      const newComponents = G.connectedComponents[playerID].filter(
        (comp, index) => index !== aIndex && index !== bIndex
      );
      
      // Add the merged component
      newComponents.push(mergedComponent);
      
      G.connectedComponents[playerID] = newComponents;
    }
    else{
      // # In this case, a_index == b_index, which means that the edge
      // # is already part of one component. No actions needed.
      // chosen_index = a_index if a_index is not None else b_index
      // component = self.connected_components[color][chosen_index]
    }

    //TODO: longest road



    //if we're in placement phase, end turn after placing road
    if (context.ctx.phase == "placement"){
    events.endTurn();
    }
    //updateValids(context, stage);
  },
  //   redact: ({ G, ctx }) =>
  //     G.players[ctx.currentPlayer].charState.hasSecretWorkers,
}

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

const stealCard = (G, random, victim, stealer) => {
  // console.log("Victim's cards before: ", G.players[victim].resourceCards)
  // console.log("Stealer's cards before: ", G.players[stealer].resourceCards)
  if (G.players[victim].resourceCards.length > 0){
    const stolenCard = random.Shuffle(G.players[victim].resourceCards)[0];
    //console.log("Stealing", stolenCard)


    const index = G.players[victim].resourceCards.indexOf(stolenCard);

    if (index > -1) {
      G.players[victim].resourceCards.splice(index, 1);
    }
    //console.log("Victim's cards after steal: ", G.players[victim].resourceCards)
    //G.players[victim].resourceCards
    G.players[stealer].resourceCards.push(stolenCard)
    //console.log("Stealer's cards after: ", G.players[stealer].resourceCards)

  }
  else{
    console.log(`Player ${victim} has no cards to steal`)

  }
  return
}

//we need to either return to preRoll (if robber moved from knight played before rolling dice)
//or postRoll (if played from rolling a 7 or knight mid-turn)
export const moveRobber = {
  move: (context, tileID) =>{
    const { G, events, random,  ctx } = context;
    G.robberTile = tileID
    console.log("context:", context)

    //TODO: steal option (for >2 players)
    //if there's a building on tile and player is not us
    //take a random card from opponent's hand
    //give same card to us

    const tile = G.tiles.find(t => t.tile.id === tileID);

    //get nodes of tile
    const nodeIDs = Object.values(tile.tile.nodes)
    //getTileBuildings
    for (const node of nodeIDs) {
      //check if has a building
      if (G.nodes[node].building !== null) {
        //if building owner is not current player, steal a card
        if (G.nodes[node].building.owner !== ctx.currentPlayer){
          stealCard(G, random, G.nodes[node].building.owner, ctx.currentPlayer)
          break
        }
      }
  }
  //events.endStage()
  //TODO: if it's a knight and played before turn, we need to go back to preRoll
  
  //UPDATE: I commented out this becuase AI suggested a fix where we can return to e.g. preRoll if knight played
  //events.setStage('postRoll');


  const returnTo = context.ctx.activePlayers[context.ctx.currentPlayer].returnTo || 'postRoll';
events.setStage(returnTo);
}
}

export const rollDice = {
  canDo: () => console.log("hi roll dive"),
  move: (context) => {
    const { G, random, effects, events } = context;
    G.diceRoll = random.D6(2); // dieRoll = 1–6
    effects.roll([G.diceRoll[0], G.diceRoll[1]]);

    const diceScore = G.diceRoll[0] + G.diceRoll[1];

    //object of resources to distribution
    const resourcesToDistribute = {};
    for (const p of G.players) {
      resourcesToDistribute[p.id] = [];
    }
    //easy way to count total resources to check that bank has enough
    //if we're being super legit with our code can infer this from resourcesToDistribute
    const totalResourcesDistributed = {
      Wood: 0,
      Brick: 0,
      Sheep: 0,
      Wheat: 0,
      Ore: 0,
    };

    if (diceScore === 7) {
      //get all players over discardLimit
      //if numPlayers > 0, for each player, go to discard stage (and wait for completion)
      //after this, set activePlayer to original player and send to placeRobber phase
      //(place robber always returns to previous stage)
      //e.g. can be preRoll if playing knight before turn
      //or postRoll if played knight in-turn or if 7'd
      console.log("discard");

      //place Robber
      //got to move current player to a stage/phase where UI highlights all tiles
      
      // UPDATE: AI suggested edit. to be able to handle if a knight is played before turn
      //events.setStage("moveRobber")
      
      events.setStage({
        moveRobber: {
        returnTo: 'postRoll'
        }
        });
      console.log('returned to diceRoll after moveRobber')
      //events.setStage('postRoll');

      //then move to steal (if appropriate)

    } else {
      //distribute cards

      //get all tiles with that number
      //TODO: check it's not blocked by robber
      const tilesToProduce = G.tiles.filter((t) => t.tile.number == diceScore);

      const cardAnims = [];
      for (var tile of tilesToProduce) {
        tile = current(tile);
        if (tile.tile.id !== G.robberTile){
        //get all nodes from tile
        const nodeIDs = Object.values(tile.tile.nodes);

        //check each node to see if building exists
        for (const node of nodeIDs) {
          if (G.nodes[node].building !== null) {
            const ownerID = G.nodes[node].building.owner;
            cardAnims.push({ tile, playerID: ownerID });
            if (G.nodes[node].building.type === NodeBuildingTypes.CITY) {
              resourcesToDistribute[ownerID].push(tile.tile.resource);
              resourcesToDistribute[ownerID].push(tile.tile.resource);
              totalResourcesDistributed[tile.tile.resource] += 2;
            } else if (
              G.nodes[node].building.type === NodeBuildingTypes.SETTLEMENT
            ) {
              resourcesToDistribute[ownerID].push(tile.tile.resource);
              totalResourcesDistributed[tile.tile.resource] += 1;
            }
          }
        }
      }
      else{
        console.log("Not producing as tile is blocked!")
      }
      }

      //check if bank has enough
      for (const key in totalResourcesDistributed) {
        if (totalResourcesDistributed.hasOwnProperty(key)) {
          const requiredCount = totalResourcesDistributed[key];
          const availableCount = G.bank.resourceCards.filter(
            (card) => card === key
          ).length;

          console.log(
            `Giving out ${requiredCount} ${key}, have ${availableCount} in bank`
          );

          // Check if the required count is higher than the available count
          if (requiredCount > availableCount) {
            console.log("TOO MANY. NOT GIVING OUT.");

            context.log.setMetadata({
              message: `Not enough ${key} in bank for all players to receive`,
            });
            //TODO: render 'block' animation for the tile here.

            // Remove cards from "resources"
            for (const playerId in resourcesToDistribute) {
              resourcesToDistribute[playerId] = resourcesToDistribute[
                playerId
              ].filter((card) => card !== key);
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
      for (const p in resourcesToDistribute) {
        if (resourcesToDistribute[p].length > 0) {
          takeCardsFromBank(context, resourcesToDistribute[p], p);
        }
      }
      context.events.setStage('postRoll');
      //takeCardsFromBank(context, resources, 0);
    }

    

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
          var realedge = { ...G.edges[edge] };
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
      


      var invalidNodes = [];
      for (let node in Object.keys(allNodes)) {
        node = allNodes[node];

        if (node.building !== null) {
          //remove node
          invalidNodes.push(node.id);
          //get all neighbors and also remove
          // console.log(STATIC_GRAPH.edges)
          // STATIC_GRAPH.edges(node.id).forEach(edge => console.log(edge))

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
      G.valids.nodes = [];
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

export const getAvailableMoves = (context) => {};
