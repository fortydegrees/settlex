//board
board.push({
    id: tileAutoinc++,
    coordinate: [hex.q, hex.r, hex.s],
    type: TileTypes.EMPTY, //i.e. landTile, waterTile (can't have number)
    nodes: nodes,
    edges: edges
  });
  
//tile


//node
// {
//     tileId: tile.tile.id,
//     tile_coordinate: tile.coordinate,
//     direction: node[0],
//     buildingType: null,
//     color: null,
//   }
//edges 


    // edges[edge[1]] = {
    //   tileId: tile.tile.id,
    //   tile_coordinate: tile.coordinate,
    //   direction: edge[0],
    //   color: null,
    // };