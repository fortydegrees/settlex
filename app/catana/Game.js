import {
  buildTopology,
  createBalancedDiceState,
  createEmptyState,
  generateBoard,
  resolveDefaultGameModeId,
  resolveBoardConfig,
  resolveGameMode,
  resolveRuleset,
  ResourceType
} from "@settlex/game-core";
import { TurnOrder } from "boardgame.io/dist/cjs/core.js";
import { placeSettlement, autoPlaceSettlement, placeRoad, autoPlaceRoad, placeCity, updateValids, rollDice, autoRoll, moveRobber, autoMoveRobber, endTurn, autoEndTurn, discardResources, autoDiscard, maritimeTrade, buyDevCard, playDevCardStart, confirmDevCardPlay, autoResolveDevCard, placeRoadFromDevCard, readyUp, autoStartGame, resign, resolveDisconnectForfeit, resolveIdleForfeit } from "./Moves.js";
import { DEBUG_MOVES } from "./moves/debugMoves.js";
import { appendGameLog } from "./utils/gameLog.js";
import { EffectsPlugin } from "bgio-effects/dist/plugin.js";
import {
  PLACE_PIECE_DEFAULT_TUNING,
  getPlacementEffectDuration
} from "./effects/placePieceDefaults.js";
import {
  applyDevScenarioSetup,
  isDebugEnvironment,
  validateScenarioSetupData
} from "./gameSetup/devScenarios.js";
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
    },
    placePiece: {
      create: (value) => value,
      duration: getPlacementEffectDuration(PLACE_PIECE_DEFAULT_TUNING)
    },
    buyDevCardReveal: {
      create: (value) => value,
      duration: 0
    },
    robberSteal: {
      create: (value) => value,
      duration: 0
    },
    robberMove: {
      create: (value) => value,
      duration: 0
    },
    awardClaimed: {
      create: (value) => value,
      duration: 0
    },
    maritimeTrade: {
      create: (value) => value,
      duration: 0
    },
    discardResources: {
      create: (value) => value,
      duration: 0
    },
    devCardPlayStarted: {
      create: (value) => value,
      duration: 0
    },
    devCardPlayResolved: {
      create: (value) => value,
      duration: 0
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

const resolveGameSettings = (setupData) => ({
  showYearOfPlentyBankCounts:
    setupData?.gameSettings?.showYearOfPlentyBankCounts === true
});

const resolveModeSetup = ({ numPlayers, setupData }) => {
  const modeId = setupData?.modeId ?? resolveDefaultGameModeId(numPlayers);
  const mode = resolveGameMode(modeId);
  const rulesetId = setupData?.rulesetId ?? mode.rulesetId;
  const boardConfigId =
    setupData?.boardConfigId ??
    (setupData?.boardConfig ? "custom" : mode.boardConfigId);

  return {
    modeId: mode.id,
    rulesetId,
    rulesetSpec: resolveRuleset(rulesetId),
    boardConfigId
  };
};

export const createCatanGame = ({
  includeDebugMoves = isDebugEnvironment(),
  includeEffects = true,
  includeServerMoves = false
} = {}) => {
  const debugMoves = includeDebugMoves ? DEBUG_MOVES : {};
  const serverMoves = includeServerMoves
    ? { resolveDisconnectForfeit, resolveIdleForfeit }
    : {};
  const terminalStageMoves = { resign, ...serverMoves };
  const plugins = includeEffects ? [configuredEffectsPlugin] : [];
  return {
  //get spec to use (i.e. script to generate board)
  //spec is game rules, e.g. dev cards, vps to win
  //strategy is how to generate map

  name: 'catan',
  plugins,
  minPlayers: 2,

  maxPlayers: 4,

  validateSetupData: (setupData, numPlayers) =>
    validateScenarioSetupData(setupData, numPlayers),

  // Hide secret state from opponents
  // Each player sees their own resources/devCards but only counts for others
  // Uses placeholder values to preserve .length for UI compatibility
  playerView: ({ G, ctx, playerID }) => {
    // After game over (core or ctx), reveal everything
    if (ctx.gameover || G.core?.gameOver) return G;

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

    if (masked.diceState?.mode === "balanced") {
      masked.diceState = { mode: "balanced" };
    }

    return masked;
  },

  //seed:Date.now(),
  //generate map here
  setup: ({ ctx, random }, setupData) => {
    //ctx.numPlayers = 3
    const rng = () => {
      if (!random || typeof random.Number !== "function") {
        throw new Error("random.Number is required for deterministic board generation.");
      }
      return random.Number();
    };
    const {
      modeId,
      rulesetId,
      rulesetSpec,
      boardConfigId
    } = resolveModeSetup({
      numPlayers: ctx.numPlayers,
      setupData
    });
    const selectedBoardConfigId = setupData?.boardConfigId ?? boardConfigId;
    const boardConfig = setupData?.boardConfig ?? resolveBoardConfig(selectedBoardConfigId);
    const tiles = generateBoard(boardConfig, rng);
    const valids = { nodes: [], edges: [], tiles: [] };
    const diceRoll = [3,4]
    const robberTile = tiles.find((tile) => tile.tile.resource === ResourceType.DESERT)?.tile.id ?? null;
    const coreTopology = buildTopology(tiles);
    const playerIds = Array.from({ length: ctx.numPlayers }, (_, i) => i.toString());
    const core = createEmptyState(playerIds, rulesetSpec);
    core.phase = ctx.phase === "placement" ? "placement" : "normal";
    core.robberTileId = robberTile;
    const placementOrder = getPlacementOrder(ctx.numPlayers);
    
    // Enable Friendly Robber by default for testing/deployment
    core.ruleset.friendlyRobber = { enabled: true, vpThreshold: 2 };

    // Shuffle Dev Deck
    if (core.devDeck && core.devDeck.length > 0) {
      core.devDeck = random.Shuffle(core.devDeck);
    }

    const diceState =
      core.ruleset.diceMode === "balanced"
        ? createBalancedDiceState(playerIds)
        : null;

    const initialState = {
      core,
      coreTopology,
      modeId,
      rulesetId,
      gameSettings: resolveGameSettings(setupData),
      boardConfigId,
      tiles,
      valids,
      diceRoll,
      diceState,
      robberTileId: robberTile,
      placementOrder,
      preGame: { readyByPlayerId: {} },
      devCardPlay: null,
      robberReturnToStage: null,
      gameLog: [],
      gameLogSeq: 0
    };

    return applyDevScenarioSetup({
      initialState,
      ctx,
      setupData
    });
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
          waiting: {
            moves: {
              readyUp,
              autoStartGame,
              ...terminalStageMoves,
              ...debugMoves
            }
          }
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
        activePlayers: { currentPlayer: "settlement", others: null },
        onBegin: ( context) => {
          //TODO: don't think this should be here // updating valids here...
          //TODO: randomize player order (could even do this in a pre-phase)
          console.log("placement phase") 

            if (context.G?.core) {
              context.G.core.phase = "placement";
            }
            const currentStage =
              context.ctx?.activePlayers?.[context.ctx.currentPlayer] ?? "settlement";
            const pendingRoadNodeId =
              context.G?.core?.pendingRoadFromNodeIdByPlayer?.[
                context.ctx.currentPlayer
              ];
            updateValids(
              context,
              currentStage,
              currentStage === "road" ? pendingRoadNodeId : undefined
            )
        },
        stages: {
          settlement: {
            moves: {
              placeSettlement,
              autoPlaceSettlement,
              ...terminalStageMoves,
              ...debugMoves
            }
          },
          road: {
            moves: {
              placeRoad,
              autoPlaceRoad,
              ...terminalStageMoves,
              ...debugMoves
            }
          },
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
      onEnd: ({ G, ctx }) => {
        if (G.core) {
          G.core.phase = "normal";
        }
        appendGameLog(G, ctx, { type: "phase:main", actorId: "system", data: {} });
      },
    },
    main: {
      turn: {
        onBegin: ( context) => {
          console.log("main phase")

            const currentStage =
              context.ctx?.activePlayers?.[context.ctx.currentPlayer] ?? "preRoll";
            updateValids(context, currentStage)
        },
        order: TurnOrder.DEFAULT,
        activePlayers: { currentPlayer: "preRoll", others: null },
        stages: {
          preRoll: { moves: {
            rollDice, //after roll dice (and no 7) go to main
            autoRoll,
            playDevCardStart,
            placeRoadFromDevCard,
            ...terminalStageMoves,
            ...debugMoves
          }},
          robberDiscard: { // Explicit phase for discarding
             moves: {
               discardResources,
               autoDiscard,
               ...terminalStageMoves,
               ...debugMoves
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
              placeRoadFromDevCard,
              ...terminalStageMoves,
              // buyDev,55
              // offerTrade,
              // tradeWithBank,
              // playDev,
              //endTurn,
              endTurn,
              autoEndTurn,
              ...debugMoves
            }
          },
          moveRobber: {
            moves:{
              moveRobber,
              autoMoveRobber,
              ...terminalStageMoves,
              ...debugMoves
            }
          },
          devCardChoice: {
            moves: {
              confirmDevCardPlay,
              autoResolveDevCard,
              ...terminalStageMoves,
              ...debugMoves
            }
          }
        },
      },
      endIf: ({ G }) => G.core.gameOver ?? undefined, //player VPs > VP to win, or resign (if allowed). maybe can just do this somewhere else: https://github.com/mbrinkl/santorini/blob/4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb/src/game/index.ts
      onEnd: () => {}

    },
  },

  moves: {
    resign,
    ...serverMoves,
    ...debugMoves
  },
  };
};

export const Catan = createCatanGame();
