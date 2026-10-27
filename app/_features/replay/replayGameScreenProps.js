import { maskGameLogEntries } from "../../../lib/game-runtime/log/gameLogPrivacy.js";

const ignoreReplayMove = () => undefined;

export const READ_ONLY_REPLAY_MOVES = Object.freeze({
  autoStartGame: ignoreReplayMove,
  readyUp: ignoreReplayMove,
  rollDice: ignoreReplayMove,
  endTurn: ignoreReplayMove,
  discardResources: ignoreReplayMove,
  moveRobber: ignoreReplayMove,
  placeRoad: ignoreReplayMove,
  placeSettlement: ignoreReplayMove,
  placeCity: ignoreReplayMove,
  buyDevCard: ignoreReplayMove,
  playDevCardStart: ignoreReplayMove,
  cancelDevCardPlay: ignoreReplayMove,
  confirmDevCardPlay: ignoreReplayMove,
  placeRoadFromDevCard: ignoreReplayMove,
  maritimeTrade: ignoreReplayMove,
  resign: ignoreReplayMove,
});

export const buildReplayGameScreenProps = ({
  event,
  logEntries = event?.visibleLogEntries ?? [],
  perspectiveId,
  matchID,
  matchData,
  resultsOpen,
  isComplete = true,
  revealAllHands = true,
}) => ({
  ...event?.state,
  matchID,
  matchData,
  matchMetadata: matchData,
  playerID: perspectiveId,
  credentials: null,
  moves: READ_ONLY_REPLAY_MOVES,
  events: {},
  plugins: event?.state?.plugins ?? {},
  isConnected: true,
  isMultiplayer: false,
  isReplay: true,
  replayRevealAllHands: revealAllHands,
  replayTurn: event?.turn ?? null,
  replayResultsOpen: resultsOpen,
  replayCanShowResults: isComplete,
  // The transcript is a navigation surface; only the board and highlight follow the cursor.
  replayLogEntries: revealAllHands
    ? logEntries
    : maskGameLogEntries(logEntries, perspectiveId),
  replayActiveLogEntryKey: event?.logEntryKey ?? null,
});
