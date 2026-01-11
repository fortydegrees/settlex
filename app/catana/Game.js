import { buildTopology, createEmptyState, generateBoard, resolveBoardPreset, ResourceType } from "@settlex/game-core";
import { TurnOrder } from "boardgame.io/core";
import { placeSettlement, placeRoad, placeCity, updateValids, rollDice, moveRobber, initialiseGraph, DEBUG_takeCardsFromBank, endTurn, discardResources, maritimeTrade } from "./Moves";
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


const TURN_ORDER_ONCE = {
  first: 0,
  next: ({ G, ctx }) => {
    if (getFirstPlayer(G) === ctx.playOrderPos) {
      return (ctx.playOrderPos + 1) % ctx.numPlayers;
    }
    return undefined;
  },
};

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
    const boardPresetId = "standard-random";
    const boardPreset = resolveBoardPreset(boardPresetId);
    const tiles = generateBoard(boardPreset, rng);
    const valids = { nodes: [], edges: [], tiles: [] };
    const diceRoll = [3,4]
    const robberTile = tiles.find((tile) => tile.tile.resource === ResourceType.DESERT)?.tile.id ?? null;
    for (const tile of tiles) {
      STATIC_GRAPH.addNodesFrom(Object.values(tile.tile.nodes));
      STATIC_GRAPH.addEdgesFrom(Object.values(tile.tile.edges));
    }

    const coreTopology = buildTopology(tiles);
    const playerIds = Array.from({ length: ctx.numPlayers }, (_, i) => i.toString());
    const core = createEmptyState(playerIds);
    core.phase = ctx.phase === "placement" ? "placement" : "normal";
    core.robberTileId = robberTile;

    return {
      core,
      coreTopology,
      boardPresetId,
      tiles,
      valids,
      diceRoll,
      robberTileId: robberTile
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

      endIf: ({ G }) => {
        // End placement when all players have placed 2 settlements AND 2 roads
        const ruleset = G.core.ruleset;
        const startingSettlements = ruleset.pieceLimits.settlements;
        const startingRoads = ruleset.pieceLimits.roads;
        return G.core.players.every(id => {
          const playerState = G.core.playerStateById[id];
          return playerState.settlementsRemaining === startingSettlements - 2 &&
                 playerState.roadsRemaining === startingRoads - 2;
        });
      },
      next: "main",
      start: true,
      onEnd: ({ G }) => {
        if (G.core) {
          G.core.phase = "normal";
        }
      },
    },
    main: {
      turn: {
        onBegin: ( context) => {
          console.log("main phase")

            updateValids(context, "preRoll")
        },
        order: TurnOrder.DEFAULT,
        activePlayers: { currentPlayer: "preRoll" },
        stages: {
          preRoll: { moves: {
            //playDev,
            rollDice, //after roll dice (and no 7) go to main
          }},
          robberDiscard: { // Explicit phase for discarding
             moves: {
               discardResources,
             }
          },
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
              placeCity,
              DEBUG_takeCardsFromBank,
              maritimeTrade,
              // buyDev,55
              // offerTrade,
              // tradeWithBank,
              // playDev,
              //endTurn,
              endTurn
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
