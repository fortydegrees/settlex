import {
  buildTopology,
  createEmptyState,
  DUEL_RULESET,
  STANDARD_RULESET,
  generateBoard,
  resolveBoardConfig,
  ResourceType
} from "@settlex/game-core";
import { TurnOrder } from "boardgame.io/dist/cjs/core.js";
import { placeSettlement, autoPlaceSettlement, placeRoad, autoPlaceRoad, placeCity, updateValids, rollDice, autoRoll, moveRobber, autoMoveRobber, DEBUG_takeCardsFromBank, DEBUG_takeDevCards, DEBUG_captureScenarioState, DEBUG_clearCapturedScenarioState, endTurn, autoEndTurn, discardResources, autoDiscard, maritimeTrade, buyDevCard, playDevCardStart, confirmDevCardPlay, autoResolveDevCard, cancelDevCardPlay, placeRoadFromDevCard, readyUp, autoStartGame, resign, resolveDisconnectForfeit, DEBUG_loadState, DEBUG_setScenario } from "./Moves.js";
import { appendGameLog } from "./utils/gameLog.js";
import { EffectsPlugin } from "bgio-effects/dist/plugin.js";
import {
  PLACE_PIECE_DEFAULT_TUNING,
  getPlacementEffectDuration
} from "./effects/placePieceDefaults.js";

const DEBUG_MOVES = {
  DEBUG_takeCardsFromBank,
  DEBUG_takeDevCards,
  DEBUG_captureScenarioState,
  DEBUG_clearCapturedScenarioState,
  DEBUG_loadState,
  DEBUG_setScenario
};

const isDebugEnvironment = (nodeEnv = process.env.NODE_ENV) =>
  nodeEnv !== "production";

const isScenarioStateLike = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      value.core &&
      Array.isArray(value.core.players)
  );

const extractScenarioState = (value) => {
  if (isScenarioStateLike(value?.state)) return value.state;
  if (isScenarioStateLike(value?.G)) return value.G;
  if (isScenarioStateLike(value)) return value;
  return null;
};

const cloneScenarioState = (value) => JSON.parse(JSON.stringify(value));

const mergeScenarioState = (baseState, scenarioState) => ({
  ...baseState,
  ...scenarioState,
  core: scenarioState.core ?? baseState.core,
  coreTopology: scenarioState.coreTopology ?? baseState.coreTopology,
  tiles: scenarioState.tiles ?? baseState.tiles,
  valids: scenarioState.valids ?? baseState.valids,
  diceRoll: scenarioState.diceRoll ?? baseState.diceRoll,
  robberTileId: scenarioState.robberTileId ?? baseState.robberTileId,
  placementOrder: scenarioState.placementOrder ?? baseState.placementOrder,
  preGame: scenarioState.preGame ?? baseState.preGame,
  devCardPlay: scenarioState.devCardPlay ?? baseState.devCardPlay,
  robberReturnToStage:
    scenarioState.robberReturnToStage ?? baseState.robberReturnToStage,
  gameLog: scenarioState.gameLog ?? baseState.gameLog,
  gameLogSeq: scenarioState.gameLogSeq ?? baseState.gameLogSeq,
  rulesetId: scenarioState.rulesetId ?? baseState.rulesetId,
  boardConfigId: scenarioState.boardConfigId ?? baseState.boardConfigId
});

const derivePlacementStage = (scenarioState, currentPlayerId) => {
  const hasRoadTargets = (scenarioState?.valids?.edges?.length ?? 0) > 0;
  if (hasRoadTargets) return "road";
  const pendingRoadNodeId =
    scenarioState?.core?.pendingRoadFromNodeIdByPlayer?.[currentPlayerId];
  if (pendingRoadNodeId != null) return "road";
  return "settlement";
};

const deriveNormalActivePlayers = (scenarioState, currentPlayerId) => {
  const turnPhase = scenarioState?.core?.turn?.phase;
  if (turnPhase === "robberDiscard") {
    const pendingDiscards = scenarioState?.core?.turn?.pendingDiscards ?? [];
    if (pendingDiscards.length > 0) {
      return pendingDiscards.reduce((acc, playerId) => {
        acc[playerId] = "robberDiscard";
        return acc;
      }, {});
    }
    if (currentPlayerId != null) {
      return { [currentPlayerId]: "robberDiscard" };
    }
  }

  if (turnPhase === "robberMove") {
    return currentPlayerId != null ? { [currentPlayerId]: "moveRobber" } : null;
  }

  if (turnPhase === "postRoll") {
    return currentPlayerId != null ? { [currentPlayerId]: "postRoll" } : null;
  }

  return currentPlayerId != null ? { [currentPlayerId]: "preRoll" } : null;
};

const seedContextFromScenario = (ctx, scenarioState) => {
  const scenarioPlayers = scenarioState?.core?.players?.map(String) ?? null;
  const currentPlayerId =
    scenarioState?.core?.turn?.currentPlayerId != null
      ? String(scenarioState.core.turn.currentPlayerId)
      : null;

  if (scenarioPlayers?.length) {
    ctx.playOrder = [...scenarioPlayers];
    ctx.numPlayers = scenarioPlayers.length;
  }

  if (currentPlayerId != null) {
    ctx.currentPlayer = currentPlayerId;
    const nextPlayOrderPos = ctx.playOrder?.indexOf?.(currentPlayerId) ?? -1;
    if (nextPlayOrderPos >= 0) {
      ctx.playOrderPos = nextPlayOrderPos;
    }
  }

  if (scenarioState?.core?.phase === "placement") {
    ctx.phase = "placement";
    const stage = derivePlacementStage(scenarioState, currentPlayerId);
    ctx.activePlayers =
      currentPlayerId != null ? { [currentPlayerId]: stage } : ctx.activePlayers;
    return;
  }

  if (scenarioState?.core?.phase === "normal") {
    ctx.phase = "main";
    const activePlayers = deriveNormalActivePlayers(
      scenarioState,
      currentPlayerId
    );
    if (activePlayers) {
      ctx.activePlayers = activePlayers;
    }
  }
};

const validateScenarioSetupData = (setupData, numPlayers) => {
  const scenarioState = extractScenarioState(setupData?.devScenarioState);
  if (!scenarioState) return undefined;
  if (!isDebugEnvironment()) {
    return "Dev scenarios are disabled in production.";
  }
  const scenarioPlayerCount = scenarioState.core?.players?.length;
  if (
    Number.isFinite(scenarioPlayerCount) &&
    Number.isFinite(numPlayers) &&
    scenarioPlayerCount !== numPlayers
  ) {
    return `Scenario requires ${scenarioPlayerCount} players.`;
  }
  return undefined;
};
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

const resolveRulesetSpec = ({ numPlayers, setupData }) => {
  const requestedRulesetId = setupData?.rulesetId;
  if (requestedRulesetId === "duel") {
    return { rulesetId: "duel", rulesetSpec: DUEL_RULESET };
  }
  if (requestedRulesetId === "standard") {
    return { rulesetId: "standard", rulesetSpec: STANDARD_RULESET };
  }
  if (numPlayers === 2) {
    return { rulesetId: "duel", rulesetSpec: DUEL_RULESET };
  }
  return { rulesetId: "standard", rulesetSpec: STANDARD_RULESET };
};

export const createCatanGame = ({
  includeDebugMoves = isDebugEnvironment(),
  includeEffects = true,
  includeServerMoves = false
} = {}) => {
  const debugMoves = includeDebugMoves ? DEBUG_MOVES : {};
  const serverMoves = includeServerMoves
    ? { resolveDisconnectForfeit }
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
    const defaultBoardConfigId = "standard-official";
    const selectedBoardConfigId = setupData?.boardConfigId ?? defaultBoardConfigId;
    const boardConfig = setupData?.boardConfig ?? resolveBoardConfig(selectedBoardConfigId);
    const boardConfigId = setupData?.boardConfigId ?? (setupData?.boardConfig ? "custom" : defaultBoardConfigId);
    const tiles = generateBoard(boardConfig, rng);
    const valids = { nodes: [], edges: [], tiles: [] };
    const diceRoll = [3,4]
    const robberTile = tiles.find((tile) => tile.tile.resource === ResourceType.DESERT)?.tile.id ?? null;
    const coreTopology = buildTopology(tiles);
    const playerIds = Array.from({ length: ctx.numPlayers }, (_, i) => i.toString());
    const { rulesetId, rulesetSpec } = resolveRulesetSpec({
      numPlayers: ctx.numPlayers,
      setupData
    });
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

    const initialState = {
      core,
      coreTopology,
      rulesetId,
      boardConfigId,
      tiles,
      valids,
      diceRoll,
      robberTileId: robberTile,
      placementOrder,
      preGame: { readyByPlayerId: {} },
      devCardPlay: null,
      robberReturnToStage: null,
      gameLog: [],
      gameLogSeq: 0
    };

    const scenarioState = extractScenarioState(setupData?.devScenarioState);
    if (!isDebugEnvironment() || !scenarioState) {
      return initialState;
    }

    const nextState = mergeScenarioState(
      initialState,
      cloneScenarioState(scenarioState)
    );
    seedContextFromScenario(ctx, nextState);
    return nextState;
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
        activePlayers: { currentPlayer: "settlement" },
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
              confirmDevCardPlay,
              autoResolveDevCard,
              cancelDevCardPlay,
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
