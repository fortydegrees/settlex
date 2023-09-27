import * as nx from "jsnetworkx";

export const placeSettlement = {
  move: (context, node) => {
    const { G, playerID, events } = context;
    console.log("placing settlement");
    G.nodes[node].buildingType = "settlement";
    G.nodes[node].color = G.players[playerID].color;

    updateValids(context, "road");
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
        var allNodes = G.nodes;
      

      //add all nodes to a graph
      const STATIC_GRAPH = new nx.Graph();
      for (const tile of Object.values(G.tiles)) {
        STATIC_GRAPH.addNodesFrom(Object.values(tile.tile.nodes));
        STATIC_GRAPH.addEdgesFrom(Object.values(tile.tile.edges));
      }

      var invalidNodes = [];
      for (let node in Object.keys(allNodes)) {
        node = allNodes[node]

        if (node.buildingType !== null) {
            console.log('node', node)
          //remove node
          invalidNodes.push(node.id);
          //get all neighbors and also remove
          console.log(STATIC_GRAPH.neighbors(parseInt(node.id)))
          for (const builtNode of STATIC_GRAPH.neighbors(parseInt(node.id))) {
            console.log(builtNode)
            invalidNodes.push(builtNode.toString());
          }
        }
      }

      console.log('invalid nodes', invalidNodes)

      const validNodes = removeNodesByIds(allNodes, invalidNodes);

      console.log(validNodes)

      let finalValidNodes = [];
      for (const node of Object.keys(validNodes)) {
        var realnode = validNodes[node];
        realnode["id"] = node;
        finalValidNodes.push(realnode);
      }
      console.log(finalValidNodes)
      G.valids.nodes = finalValidNodes;
    }
  }


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
