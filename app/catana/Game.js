
import { spec } from "./game/spec";
import { generateBoard } from "./game/generateBoard";
import { TurnOrder } from "boardgame.io/core";
import {placeSettlement, placeRoad} from "./Moves"
//setup board and convert tiles/edges into right format to render
const tiles = generateBoard(spec);

const nodes = {};
const edges = [];
for (let tile of tiles) {
  for (let node of Object.entries(tile.tile.nodes)) {
    nodes[node[1]] = {
      id: tile.tile.id,
      tile_coordinate: tile.coordinate,
      direction: node[0],
      building: null,
      color: null,
    };
  }
  for (let edge of Object.entries(tile.tile.edges)) {
    edges.push({
      id: edge[1],
      tile_coordinate: tile.coordinate,
      direction: edge[0],
      color: null,
    });
  }
}

//debug/testing color. atm purely sets css for settlement color
const playerColors = {
  0: 'red',
  1: 'blue'
}
export const Catan = {
  //get spec to use (i.e. script to generate board)
  //spec is game rules, e.g. dev cards, vps to win
  //strategy is how to generate map

  //generate map here
  setup: ({ ctx }) => {
    const players = new Array(ctx.numPlayers).fill(0).map((_, i) => ({
      //name: "",
      score: 0,
      hand: [],
      id: i,
      color: playerColors[i]
    }));
    const valids = {'nodes': nodes}
    //board: generateBoard(spec),
    //tiles: gameState.tiles,

    return { tiles, nodes, edges, valids, players };
  },

  // turn: {
  //   minMoves: 1,
  //   maxMoves: 1,
  // },

  //on placement phase
  //send active player to placeInitialSettlement phase
  //where they place a settlement and then a road

  //need like a global state thing where
  //if player in 'placeSettlement' stage, available nodes flash.
  //available nodes determined by player color, building type
  //e.g. if settlement, nodes determined by distance from other settlements, connected roads
      //if city, determined by player color's settlements


  //so game starts
  //determine player order (automatic)

  //phase: placement phase
    //p1: place settlement
    //p1: place road

    //p2: place settlement
    //p2: place road
  //https://boardgame.io/documentation/#/phases
  phases: {

    placement: {
      turn: {
        activePlayers: { currentPlayer: 'settlement' },
        //activePlayers: { currentPlayer: 'select' },
        onBegin: ({ G, ctx }) => console.log("placement phase"), //randomize player order
        //order: { playOrder: ()=> ['0','1','1','0']} ,// snake
        stages:{
          settlement: {moves: {placeSettlement}},
          road: {moves: {placeRoad}},
        }
      },
     
      // moves: {
      //   placeSettlement: ({ G, playerID }, node) => {
      //     console.log('placing at node:', node)
      //     G.nodes[node].building = "settlement"; //make a const or w/e
      //     //getPlayerColor (or can we just pass 'player' object and make that the color?)
      //     G.nodes[node].color = G.players[playerID].color

      //     //if player.settlementCount > settlementCount at start of turn
      //     //setStage('placeRoad')
      //   },
      // },
      endIf: ({ G }) => G.settlements > 2, // end if each player has 2 settlements & 2 roads
      next: "main",
      start: true,
      // onBegin: ({ G, ctx }) => { ... },
      // onEnd: ({ G, ctx }) => { ... },
    },
    main:{
      stages:{
        playDev: {moves: {}},
        rollDice: {moves: {}},
        discard: {moves : {}}
      }
    },
  },


  // moves: {
  //   clickCell: ({ G, playerID }, id) => {
  //     G.cells[id] = playerID;
  //   },
  // },
};
