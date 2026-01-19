import { buildTopology, createEmptyState, generateBoard, resolveBoardConfig, ResourceType } from "@settlex/game-core";
import { TurnOrder } from "boardgame.io/dist/cjs/core.js";
import { placeSettlement, autoPlaceSettlement, placeRoad, autoPlaceRoad, placeCity, updateValids, rollDice, autoRoll, moveRobber, autoMoveRobber, DEBUG_takeCardsFromBank, endTurn, autoEndTurn, discardResources, autoDiscard, maritimeTrade, buyDevCard, playDevCardStart, confirmDevCardPlay, autoResolveDevCard, cancelDevCardPlay, placeRoadFromDevCard, readyUp, autoStartGame, DEBUG_loadState, DEBUG_setScenario } from "./Moves.js";
import { EffectsPlugin } from "bgio-effects/dist/plugin.js";

const DEBUG_MOVES = {
  DEBUG_takeCardsFromBank,
  DEBUG_loadState,
  DEBUG_setScenario
};
import nx from "jsnetworkx";
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

export const getPlacementOrder = (numPlayers) => {
  const ids = Array.from({ length: numPlayers }, (_, i) => i.toString());
  if (ids.length <= 1) {
    return ids;
  }
  return ids.concat([...ids].reverse());
};


const configuredEffectsPlugin = EffectsPlugin({
  effects: {
    distributeCardsFromTile: {
      create: (value) => value,
      duration: 2,
    },
    roll: {
      create: (value) => value,
      duration: 1.5
    },
    robberBlocked: {
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

  // Hide secret state from opponents
  // Each player sees their own resources/devCards but only counts for others
  // Uses placeholder values to preserve .length for UI compatibility
  playerView: ({ G, ctx, playerID }) => {
    // After game over, reveal everything
    if (ctx.gameover) return G;

    // Deep clone to avoid mutating authoritative state
    const masked = JSON.parse(JSON.stringify(G));

    // Placeholder value - UI won't render the actual card type, just counts
    const HIDDEN = "hidden";

    // 1. Hide dev deck contents (replace with placeholders to preserve length)
    if (masked.core?.devDeck) {
      masked.core.devDeck = masked.core.devDeck.map(() => HIDDEN);
    }

    // 2. Mask other players' hands (replace with placeholders to preserve length)
    if (masked.core?.playerStateById) {
      for (const pid of Object.keys(masked.core.playerStateById)) {
        if (pid !== playerID) {
          const ps = masked.core.playerStateById[pid];
          // Replace actual values with placeholders - length is preserved
          ps.resources = (ps.resources || []).map(() => HIDDEN);
          ps.devCards = (ps.devCards || []).map(() => HIDDEN);
          ps.devCardsBoughtThisTurn = (ps.devCardsBoughtThisTurn || []).map(() => HIDDEN);
        }
      }
    }

    return masked;
  },

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
    const boardConfigId = "standard-random";
    const boardConfig = resolveBoardConfig(boardConfigId);
    const tiles = generateBoard(boardConfig, rng);
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
    const placementOrder = getPlacementOrder(ctx.numPlayers);
    
    // Enable Friendly Robber by default for testing/deployment
    core.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };

    // Shuffle Dev Deck
    if (core.devDeck && core.devDeck.length > 0) {
      core.devDeck = random.Shuffle(core.devDeck);
    }

    return {
      core,
      coreTopology,
      boardConfigId,
      tiles,
      valids,
      diceRoll,
      robberTileId: robberTile,
      placementOrder,
      preGame: { readyByPlayerId: {} },
      devCardPlay: null,
      robberReturnToStage: null
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
    preGame: {
      turn: {
        activePlayers: { all: "waiting" },
        stages: {
          waiting: { moves: { readyUp, autoStartGame, ...DEBUG_MOVES } }
        }
      },
      start: true,
      next: "placement"
    },
    placement: {
      turn: {
        order: TurnOrder.CUSTOM_FROM("placementOrder"),
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

            if (context.G?.core) {
              context.G.core.phase = "placement";
            }
            updateValids(context, "settlement")
        },
        stages: {
          settlement: { moves: { placeSettlement, autoPlaceSettlement, ...DEBUG_MOVES } },
          road: { moves: { placeRoad, autoPlaceRoad, ...DEBUG_MOVES } },
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
      start: false,
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
            rollDice, //after roll dice (and no 7) go to main
            autoRoll,
            playDevCardStart,
            confirmDevCardPlay,
            autoResolveDevCard,
            cancelDevCardPlay,
            placeRoadFromDevCard,
            ...DEBUG_MOVES
          }},
          robberDiscard: { // Explicit phase for discarding
             moves: {
               discardResources,
               autoDiscard,
               ...DEBUG_MOVES
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
              maritimeTrade,
              buyDevCard,
              playDevCardStart,
              confirmDevCardPlay,
              autoResolveDevCard,
              cancelDevCardPlay,
              placeRoadFromDevCard,
              // buyDev,55
              // offerTrade,
              // tradeWithBank,
              // playDev,
              //endTurn,
              endTurn,
              autoEndTurn,
              ...DEBUG_MOVES
            }
          },
          moveRobber: {
            moves:{
              moveRobber,
              autoMoveRobber,
              ...DEBUG_MOVES
            }
          }
        },
      },
      endIf: ({ G }) => G.core.gameOver ?? undefined, //player VPs > VP to win, or resign (if allowed). maybe can just do this somewhere else: https://github.com/mbrinkl/santorini/blob/4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb/src/game/index.ts
      onEnd: () => {}

    },
  },

  moves: {
    DEBUG_loadState,
    DEBUG_setScenario,
    DEBUG_takeCardsFromBank
  },
};
