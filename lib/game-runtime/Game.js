// Historical implementation references (retained for provenance):
// https://github.com/freeboardgames/FreeBoardGames.org/blob/master/web/src/games/sixtysix/game.ts#L23
// https://boardgame.io/documentation/#/phases
// https://github.com/mbrinkl/santorini/blob/4d89b4bedbbb8c5cf57a123c42f7febe2fdf0dcb/src/game/index.ts

import { TurnOrder } from "boardgame.io/dist/cjs/core.js";
import {
  placeCity,
  placeRoad,
  placeSettlement,
  updateValids
} from "./moves/buildMoves.js";
import {
  autoPlaceRoad,
  autoPlaceSettlement
} from "./moves/forcedPlacementMoves.js";
import { autoStartGame, readyUp } from "./moves/preGameMoves.js";
import { autoMoveRobber, moveRobber } from "./moves/robberMoves.js";
import {
  autoDiscard,
  autoEndTurn,
  autoRoll,
  discardResources,
  endTurn,
  rollDice
} from "./moves/turnMoves.js";
import {
  autoResolveDevCard,
  autoPlaceRoadFromDevCard,
  buyDevCard,
  cancelDevCardPlay,
  confirmDevCardPlay,
  placeRoadFromDevCard,
  playDevCardStart
} from "./moves/devCardMoves.js";
import { maritimeTrade } from "./moves/tradeMoves.js";
import {
  resign,
  resolveDisconnectForfeit,
  resolveIdleForfeit
} from "./moves/terminalMoves.js";
import { DEBUG_MOVES } from "./moves/debugMoves.js";
import { appendGameLog } from "./log/gameLog.js";
import { EffectsPlugin } from "bgio-effects/dist/plugin.js";
import { getPlacementEffectDuration } from "../shared/placementEffectTiming.js";
import {
  applyDevScenarioSetup,
  isDebugEnvironment,
  validateScenarioSetupData
} from "./setup/devScenarios.js";
import { createInitialGameState } from "./setup/initialState.js";
import { maskPlayerView } from "./setup/playerView.js";
import { maskEffectsPlayerView } from "./setup/effectsPlayerView.js";
export { getPlacementOrder } from "./setup/initialState.js";

const configuredEffectsPlugin = {
  ...EffectsPlugin({
    effects: {
      distributeCardsFromTile: {
        create: (value) => value,
        duration: 2
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
        duration: getPlacementEffectDuration()
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
    }
  }),
  playerView: maskEffectsPlayerView
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
    name: "catan",
    plugins,
    minPlayers: 2,
    maxPlayers: 4,
    validateSetupData: (setupData, numPlayers) =>
      validateScenarioSetupData(setupData, numPlayers),
    playerView: maskPlayerView,
    setup: ({ ctx, random }, setupData) => {
      const initialState = createInitialGameState({ ctx, random, setupData });

      return applyDevScenarioSetup({
        initialState,
        ctx,
        setupData
      });
    },
    // Game-level endIf: sets ctx.gameover for VP wins. The phase-level endIf on
    // "main" only ends the phase, which never marks the game finished for the
    // server (archive/replay/cleanup all gate on ctx.gameover).
    endIf: ({ G }) => G.core?.gameOver ?? undefined,
    phases: {
      preGame: {
        turn: {
          activePlayers: { all: "waiting" },
          stages: {
            waiting: {
              moves: {
                readyUp,
                ...(includeServerMoves ? { autoStartGame } : {}),
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
          activePlayers: { currentPlayer: "settlement", others: null },
          onBegin: (context) => {
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
            );
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
            }
          }
        },
        endIf: ({ G }) => {
          // End placement when all players have placed 2 settlements AND 2 roads
          const ruleset = G.core.ruleset;
          const startingSettlements = ruleset.pieceLimits.settlements;
          const startingRoads = ruleset.pieceLimits.roads;
          return G.core.players.every((id) => {
            const playerState = G.core.playerStateById[id];
            return (
              playerState.settlementsRemaining === startingSettlements - 2 &&
              playerState.roadsRemaining === startingRoads - 2
            );
          });
        },
        next: "main",
        start: false,
        onEnd: ({ G, ctx }) => {
          if (G.core) {
            G.core.phase = "normal";
          }
          appendGameLog(G, ctx, {
            type: "phase:main",
            actorId: "system",
            data: {}
          });
        }
      },
      main: {
        turn: {
          onBegin: (context) => {
            const currentStage =
              context.ctx?.activePlayers?.[context.ctx.currentPlayer] ?? "preRoll";
            updateValids(context, currentStage);
          },
          order: TurnOrder.DEFAULT,
          activePlayers: { currentPlayer: "preRoll", others: null },
          stages: {
            preRoll: {
              moves: {
                rollDice,
                autoRoll,
                playDevCardStart,
                placeRoadFromDevCard,
                ...terminalStageMoves,
                ...debugMoves
              }
            },
            robberDiscard: {
              moves: {
                discardResources,
                autoDiscard,
                ...terminalStageMoves,
                ...debugMoves
              }
            },
            postRoll: {
              moves: {
                placeRoad,
                placeSettlement,
                placeCity,
                maritimeTrade,
                buyDevCard,
                playDevCardStart,
                placeRoadFromDevCard,
                ...terminalStageMoves,
                endTurn,
                autoEndTurn,
                ...debugMoves
              }
            },
            moveRobber: {
              moves: {
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
            },
            roadBuilding: {
              moves: {
                placeRoadFromDevCard,
                autoPlaceRoadFromDevCard,
                cancelDevCardPlay,
                endTurn,
                autoEndTurn,
                ...terminalStageMoves,
                ...debugMoves
              }
            }
          }
        },
        endIf: ({ G }) => G.core.gameOver ?? undefined,
        onEnd: () => {}
      }
    },
    moves: {
      resign,
      ...serverMoves,
      ...debugMoves
    }
  };
};

export const Catan = createCatanGame();
