import { expect, vi } from "vitest";

const parseJsonbParam = (value) => {
  if (value == null) {
    return value;
  }

  expect(typeof value).toBe("string");
  return JSON.parse(value);
};

export const createArchivePool = ({ failAfterArchivedMatchInsert = false } = {}) => {
  const state = {
    archivedMatches: [],
    archivedMatchPlayers: [],
    archivedMatchReplays: [],
    archivedMatchChatMessages: [],
  };

  let transactionSnapshot = null;

  const snapshot = () => JSON.parse(JSON.stringify(state));
  const restore = () => {
    if (!transactionSnapshot) return;
    state.archivedMatches = transactionSnapshot.archivedMatches;
    state.archivedMatchPlayers = transactionSnapshot.archivedMatchPlayers;
    state.archivedMatchReplays = transactionSnapshot.archivedMatchReplays;
    state.archivedMatchChatMessages = transactionSnapshot.archivedMatchChatMessages;
    transactionSnapshot = null;
  };

  const client = {
    query: vi.fn(async (sql, params = []) => {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized === "begin") {
        transactionSnapshot = snapshot();
        return { rows: [] };
      }

      if (normalized === "commit") {
        transactionSnapshot = null;
        return { rows: [] };
      }

      if (normalized === "rollback") {
        restore();
        return { rows: [] };
      }

      if (normalized.includes("select id from archived_matches where bgio_match_id = $1 limit 1")) {
        const existing = state.archivedMatches.find((entry) => entry.bgioMatchId === params[0]);
        return { rows: existing ? [{ id: existing.id }] : [] };
      }

      if (normalized.startsWith("insert into archived_matches")) {
        const row = {
          id: params[0],
          bgioMatchId: params[1],
          replayId: params[2],
          gameName: params[3],
          rulesetId: params[4],
          boardSourceId: params[5],
          boardConfigId: params[6],
          boardProvenanceJson: parseJsonbParam(params[7]),
          startedAt: params[8],
          finishedAt: params[9],
          winnerAccountId: params[10],
          winnerSeatId: params[11],
          playerCount: params[12],
          summaryJson: parseJsonbParam(params[13]),
        };
        state.archivedMatches.push(row);
        return { rows: [row] };
      }

      if (normalized.startsWith("insert into archived_match_players")) {
        state.archivedMatchPlayers.push({
          archivedMatchId: params[0],
          seatId: params[1],
          participantType: params[2],
          accountId: params[3],
          botKey: params[4],
          usernameSnapshot: params[5],
          avatarEmojiSnapshot: params[6],
          avatarColorSnapshot: params[7],
          result: params[8],
        });
        return { rows: [] };
      }

      if (normalized.startsWith("insert into archived_match_replays")) {
        if (failAfterArchivedMatchInsert) {
          throw new Error("injected failure after archived match insert");
        }
        state.archivedMatchReplays.push({
          archivedMatchId: params[0],
          initialStateJson: parseJsonbParam(params[1]),
          logJson: parseJsonbParam(params[2]),
          finalStateJson: parseJsonbParam(params[3]),
          summaryJson: parseJsonbParam(params[4]),
        });
        return { rows: [] };
      }

      if (normalized.startsWith("insert into archived_match_chat_messages")) {
        state.archivedMatchChatMessages.push({
          archivedMatchId: params[0],
          messageSeq: params[1],
          actorId: params[2],
          messageText: params[3],
          createdAt: params[4],
        });
        return { rows: [] };
      }

      throw new Error(`Unhandled archive query: ${sql}`);
    }),
    release: vi.fn(),
  };

  return {
    state,
    client,
    pool: {
      connect: vi.fn(async () => client),
    },
  };
};
