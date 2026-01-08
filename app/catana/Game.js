import { spec, BalancedBoard, buildTopology, createEmptyState } from "@settlex/game-core";
import { TurnOrder, PlayerView } from "boardgame.io/core";
import { placeSettlement, placeRoad, updateValids, rollDice, moveRobber, initialiseGraph, DEBUG_takeCardsFromBank } from "./Moves";
import { EffectsPlugin } from 'bgio-effects/plugin';
import * as nx from "jsnetworkx";
//setup board and convert tiles/edges into right format to render

//   new BalancedBoard({
//     desertPlacement:
//     this.desertPlacementEnabled ? state.desertPlacement : DesertPlacement.RANDOM,
// resourceDistribution:
//     this.resourceDistributionEnabled ?
//     state.resourceDistribution / CONFIG_SLIDER_MAX_VALUE : 1,
// numberDistribution: state.numberDistribution / CONFIG_SLIDER_MAX_VALUE,
// shufflePorts: this.hasDefaultPorts ? state.shufflePorts : true,
// allowResourceOnPort: state.allowResourceOnPort,
// });


// const b = new Board(spec, true)


export const STATIC_GRAPH = new nx.Graph();


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

//tiles.push({coordinate:[-1,0,3], tile:{edges:{}, id:100, nodes: {}, number: 2, resource: "Sheep"}})
//debug/testing color. atm purely sets css for settlement color
const playerColors = {
  0: "red",
  1: "blue",
  2: "green",
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

const players = new Array(2).fill(0).map((_, i) => ({
  //name: "",
  id: i.toString(), //TODO: doesn't this make things hard?
  username: "",
  VPs: 0,
  privateVPs: 0,
  resourceCards: [],
  devCards: [],
  color: playerColors[i],
  numRoads: 15,
  numSettlements: 5,
  numCities: 4,
}));

export const Catan =  {
  //get spec to use (i.e. script to generate board)
  //spec is game rules, e.g. dev cards, vps to win
  //strategy is how to generate map

  name: 'catan',
  plugins: [configuredEffectsPlugin],
  minPlayers: 2,

  maxPlayers: 4,
  //seed:Date.now(),
  //generate map here
  setup: ({ ctx, random }) => {
    //ctx.numPlayers = 3
    const rng = () => {
      if (!random || typeof random.Number !== "function") {
        throw new Error("random.Number is required for deterministic board generation.");
      }
      return random.Number();
    };
    const b = new BalancedBoard({
      desertPlacement: 'Random', //Random, Center, Off Center, Inland, Coast
      resourceDistribution: 0.85,
      numberDistribution: 0.85,
      shufflePorts: true,
      allowResourceOnPort: true
    }, rng).generateBoard(spec).board
    
    
    //TODO: set this based on spec e.g. numRoads
    //TODO: add team?
    
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
    //TODO: improve/abstract. get from spec.
    const robberTile = b.tiles.find(tile => tile.tile.resource === 'Desert').tile.id;
    //board: generateBoard(spec),
    //tiles: gameState.tiles,

    const connectedComponents = players.reduce((acc, _, index) => {
      acc[index] = [];
      return acc;
  }, {});

    for (const tile of Object.values(b.tiles)) {
      STATIC_GRAPH.addNodesFrom(Object.values(tile.tile.nodes));
      STATIC_GRAPH.addEdgesFrom(Object.values(tile.tile.edges));
    }

    const coreTopology = buildTopology(b.tiles);
    const core = createEmptyState(players.map((p) => p.id));
    core.phase = ctx.phase === "placement" ? "placement" : "normal";

    return {
      core,
      coreTopology,
      tiles: b.tiles,
      ports: spec.ports,
      valids,
      bank,
      settings,
      players,
      diceRoll,
      robberTile
    };
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
              placeRoad,
              placeSettlement,
              DEBUG_takeCardsFromBank,
              // placeCity,
              // buyDev,55
              // offerTrade,
              // tradeWithBank,
              // playDev,
              //endTurn,
              endTurn: (context)=>context.events.endTurn()
            }
          },
          moveRobber: {
            moves:{
              moveRobber
            }
          }
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
