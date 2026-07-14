import { getPublicVictoryPoints } from "@settlex/game-core";
import {
  formatLogEntryText,
  getGameLogEntryKey,
} from "../catana/utils/gameText";

const RAW_ACTION_LABELS = {
  autoRoll: "Rolled dice",
  buyDevCard: "Bought a development card",
  discardResources: "Discarded resources",
  endTurn: "Ended turn",
  maritimeTrade: "Made a maritime trade",
  moveRobber: "Moved the robber",
  placeCity: "Placed a city",
  placeRoad: "Placed a road",
  placeRoadFromDevCard: "Placed a road",
  placeSettlement: "Placed a settlement",
  playDevCard: "Played a development card",
  playDevCardStart: "Played a development card",
  resign: "Resigned",
  rollDice: "Rolled dice",
  stealResource: "Stole a card",
};

const getStateTurn = (state) => {
  const ctxTurn = Number(state?.ctx?.turn);
  if (Number.isFinite(ctxTurn)) return ctxTurn;

  const coreTurn = Number(state?.G?.core?.turn);
  return Number.isFinite(coreTurn) ? coreTurn : null;
};

const getEntryTurn = (entry, state) => {
  const entryTurn = Number(entry?.turn);
  return Number.isFinite(entryTurn) ? entryTurn : getStateTurn(state);
};

const getRawActionLabel = (frame) => {
  const action = frame?.logEntry?.action;
  const moveType = action?.payload?.type;
  if (moveType && RAW_ACTION_LABELS[moveType]) {
    return RAW_ACTION_LABELS[moveType];
  }
  return "Game updated";
};

const getPlayerId = (participant, index) =>
  String(participant?.seatId ?? participant?.playerId ?? index);

const buildPlayerData = (participants = []) => {
  const players = participants.map((participant, index) => {
    const id = getPlayerId(participant, index);
    return {
      id,
      name: participant?.usernameSnapshot ?? participant?.name ?? `Player ${id}`,
      color:
        participant?.avatarColorSnapshot ?? participant?.color ?? "slate",
      emoji: participant?.avatarEmojiSnapshot ?? participant?.emoji ?? null,
    };
  });

  const playerMap = Object.fromEntries(
    players.map((player) => [
      player.id,
      {
        name: player.name,
        color: player.color,
        emoji: player.emoji,
      },
    ])
  );

  return { players, playerMap };
};

const readScores = ({ state, players, getVictoryPointsForState }) => {
  const scoresByPlayerId = {};

  for (const player of players) {
    try {
      const score = getVictoryPointsForState(state, player.id);
      if (Number.isFinite(score)) {
        scoresByPlayerId[player.id] = score;
      }
    } catch {
      // Old or partial archives may not contain enough state to calculate VP.
    }
  }

  return scoresByPlayerId;
};

export const clampReplayEventIndex = (eventIndex, eventCount) =>
  Math.min(Math.max(Number(eventIndex) || 0, 0), Math.max(eventCount - 1, 0));

export const buildReplayTimeline = ({
  frames = [],
  participants = [],
  getVictoryPointsForState = (state, playerId) =>
    getPublicVictoryPoints(state?.G?.core, playerId),
} = {}) => {
  const safeFrames = Array.isArray(frames) ? frames : [];
  const { players, playerMap } = buildPlayerData(participants);
  const firstFrame = safeFrames[0] ?? null;
  const firstState = firstFrame?.state ?? null;
  const initialTurn = getStateTurn(firstState);
  const events = [
    {
      eventIndex: 0,
      frameIndex: firstFrame?.index ?? 0,
      label: "Initial setup",
      turn: initialTurn,
      logEntry: null,
      logEntryKey: null,
      visibleLogEntries: [],
      state: firstState,
    },
  ];
  const logEventIndexByKey = {};
  const pendingDisplayLogKeys = [];
  let seenLogCount = 0;

  for (const frame of safeFrames) {
    const gameLog = Array.isArray(frame?.state?.G?.gameLog)
      ? frame.state.G.gameLog
      : [];
    const firstNewEntryIndex = Math.min(seenLogCount, gameLog.length);

    for (let logIndex = firstNewEntryIndex; logIndex < gameLog.length; logIndex += 1) {
      const entry = gameLog[logIndex];
      const entryKey = getGameLogEntryKey(entry, logIndex);
      const label = formatLogEntryText(entry, playerMap);

      if (!label) {
        pendingDisplayLogKeys.push(entryKey);
        continue;
      }

      const eventIndex = events.length;
      for (const pendingKey of pendingDisplayLogKeys.splice(0)) {
        logEventIndexByKey[pendingKey] = eventIndex;
      }
      logEventIndexByKey[entryKey] = eventIndex;
      events.push({
        eventIndex,
        frameIndex: frame?.index ?? 0,
        label,
        turn: getEntryTurn(entry, frame?.state),
        logEntry: entry,
        logEntryKey: entryKey,
        visibleLogEntries: gameLog.slice(0, logIndex + 1),
        state: frame?.state ?? null,
      });
    }

    seenLogCount = Math.max(seenLogCount, gameLog.length);
  }

  if (events.length === 1) {
    for (const frame of safeFrames.slice(1)) {
      events.push({
        eventIndex: events.length,
        frameIndex: frame?.index ?? events.length,
        label: getRawActionLabel(frame),
        turn: getStateTurn(frame?.state),
        logEntry: null,
        logEntryKey: null,
        visibleLogEntries: [],
        state: frame?.state ?? null,
      });
    }
  }

  const finalEventIndex = events.length - 1;
  for (const pendingKey of pendingDisplayLogKeys) {
    logEventIndexByKey[pendingKey] = finalEventIndex;
  }

  const turnStarts = [];
  for (const event of events) {
    if (event.turn == null) continue;
    if (turnStarts.at(-1)?.turn === event.turn) continue;
    turnStarts.push({ turn: event.turn, eventIndex: event.eventIndex });
  }

  const scoreSeries = events.map((event) => ({
    eventIndex: event.eventIndex,
    turn: event.turn,
    scoresByPlayerId: readScores({
      state: event.state,
      players,
      getVictoryPointsForState,
    }),
  }));

  return {
    events,
    players,
    playerMap,
    turnStarts,
    scoreSeries,
    logEventIndexByKey,
  };
};

export const getPreviousTurnEventIndex = (
  currentEventIndex,
  turnStarts = []
) => {
  const earlierOrCurrent = turnStarts.filter(
    (marker) => marker.eventIndex <= currentEventIndex
  );
  const currentTurnStart = earlierOrCurrent.at(-1);
  if (!currentTurnStart) return 0;
  if (currentTurnStart.eventIndex < currentEventIndex) {
    return currentTurnStart.eventIndex;
  }
  return earlierOrCurrent.at(-2)?.eventIndex ?? 0;
};

export const getNextTurnEventIndex = (
  currentEventIndex,
  turnStarts = [],
  finalEventIndex = 0
) =>
  turnStarts.find((marker) => marker.eventIndex > currentEventIndex)
    ?.eventIndex ?? finalEventIndex;
