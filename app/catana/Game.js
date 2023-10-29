import { spec } from "./game/spec";
import { generateBoard } from "./game/generateBoard";
//import { generateBalancedBoard } from "./game/generateBalancedBoard";
import { TurnOrder, PlayerView } from "boardgame.io/core";
import { placeSettlement, placeRoad, updateValids, rollDice } from "./Moves";
import { EffectsPlugin } from 'bgio-effects/plugin';
import {TileTypes, } from "./game/types"
//setup board and convert tiles/edges into right format to render
const tiles = generateBoard(spec);
//const tiles = generateBalancedBoard(spec);

const configuredEffectsPlugin = EffectsPlugin({
  effects: {
    distributeCardsFromTile: {
      create: (value) => value,
      duration: 2,
    },
    roll: {
      create: (value) => value,
      duration: 1.5
    }
  },
});

//console.log(board)
const nodes = {};
const edges = {};
for (let tile of tiles) {
  if (tile.type == TileTypes.RESOURCE){
  for (let node of Object.entries(tile.tile.nodes)) {
    nodes[node[1]] = {
      tileId: tile.tile.id,
      tile_coordinate: tile.coordinate,
      direction: node[0],
      //building: {type: null, owner: null},
      building: null
    };
  }
  for (let edge of Object.entries(tile.tile.edges)) {
    edges[edge[1]] = {
      tileId: tile.tile.id,
      tile_coordinate: tile.coordinate,
      direction: edge[0],
      color: null,
    };
  }
}
}

//tiles.push({coordinate:[-1,0,3], tile:{edges:{}, id:100, nodes: {}, number: 2, resource: "Sheep"}})
//debug/testing color. atm purely sets css for settlement color
const playerColors = {
  0: "red",
  1: "blue",
};


const TURN_ORDER_ONCE = {
  first: 0,
  next: ({ G, ctx }) => {
    if (getFirstPlayer(G) === ctx.playOrderPos) {
      return (ctx.playOrderPos + 1) % ctx.numPlayers;
    }
    return undefined;
  },
};

export const Catan = {
  //get spec to use (i.e. script to generate board)
  //spec is game rules, e.g. dev cards, vps to win
  //strategy is how to generate map

  plugins: [configuredEffectsPlugin],

  //generate map here
  setup: ({ ctx }) => {
    //TODO: set this based on spec e.g. numRoads
    //TODO: add team?
    const players = new Array(ctx.numPlayers).fill(0).map((_, i) => ({
      //name: "",
      id: i,
      username: "",
      VPs: 0,
      privateVPs: 0,
      resourceCards: [],
      devCards: [],
      color: playerColors[i],
      numRoads: 15,
      numSettles: 5,
      numCities: 4,
    }));
    const bank = {
      resourceCards: spec.initialBank(), 
      devCards: [],// TODO: get from spec
    }
    const settings = {
      turnTimer: 60,
      discardLimit: 7,
      VPsToWin: 10,
    }
    const valids = { nodes: [], edges: [], tiles: [] };
    const diceRoll = [3,4]
    //board: generateBoard(spec),
    //tiles: gameState.tiles,

    return { tiles, nodes, edges, ports: spec.ports, valids, bank, settings, players, diceRoll };
  },

//https://github.com/freeboardgames/FreeBoardGames.org/blob/master/web/src/games/sixtysix/game.ts#L23
//dummy card thing^^
  // playerView: ({G, ctx, playerID})=>{
  //   return StripSecrets(G, playerID)
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
        order: TurnOrder.CUSTOM(['0','1','1','0']), //TODO: set custom play order
        // playOrder: (G, ctx) => {
        //   // generate an array of sequential player IDs ['0', '1', '2', ...]
        //   const defaultPlayOrder = Array(ctx.numPlayers).fill().map((_, i) => i + '');
        //   // return a shuffled version of the array
        //   return ctx.random.Shuffle(defaultPlayOrder);
        // },
        //order: TurnOrder.ONCE, //does work, but only goes once.
        activePlayers: { currentPlayer: "settlement" },
        onBegin: ( context) => {
          //TODO: don't think this should be here // updating valids here...
          //TODO: randomize player order (could even do this in a pre-phase)
          console.log("placement phase") 

            updateValids(context, "settlement")
        },
        stages: {
          settlement: { moves: { placeSettlement } },
          road: { moves: { placeRoad } },
        },
      },

      endIf: ({G, ctx }) => ctx.turn > G.players.length * 2, // end if each player has 2 settlements & 2 roads
      next: "main",
      start: true,
      // onBegin: ({ G, ctx }) => { ... },
      // onEnd: ({ G, ctx }) => { ... },
    },
    main: {
      turn: {
        onBegin: ( context) => {
          console.log("main phase")

            updateValids(context, "preRoll")
        },
        order: TurnOrder.CONTINUE,
        activePlayers: { currentPlayer: "preRoll" },
        stages: {
          preRoll: { moves: {
            //playDev,
            rollDice, //after roll dice (and no 7) go to main
          }},
          // overSeven: { //only available to some. have to manage stage
          //   moves:{
          //     discard,
          //     moveRobber
          //   }
          // },
          postRoll: {
            moves:{
              // placeRoad,
              // placeSettlement,
              // placeCity,
              // buyDev,
              // offerTrade,
              // tradeWithBank,
              // playDev,
              //endTurn,
            }
          },
        },
      },
      endIf: ()=> {}, //player VPs > VP to win, or resign (if allowed). maybe can just do this somewhere else: https://github.com/mbrinkl/santorini/blob/4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb/src/game/index.ts
      onEnd: () => {}

    },
  },

  // moves: {
  //   clickCell: ({ G, playerID }, id) => {
  //     G.cells[id] = playerID;
  //   },
  // },
};
