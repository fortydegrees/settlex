import { vi } from "vitest";

const cloneState = (state) => JSON.parse(JSON.stringify(state));

export const createFakeAccountsPool = () => {
  const state = {
    accounts: [],
    usernameHistory: [],
    guestSessions: [],
  };

  let transactionSnapshot = null;
  let idCounter = 0;

  const nextId = (prefix) => `${prefix}-${++idCounter}`;

  const restoreSnapshot = () => {
    if (!transactionSnapshot) return;
    state.accounts = transactionSnapshot.accounts;
    state.usernameHistory = transactionSnapshot.usernameHistory;
    state.guestSessions = transactionSnapshot.guestSessions;
    transactionSnapshot = null;
  };

  const client = {
    query: vi.fn(async (sql, params = []) => {
      const normalized = String(sql).replace(/\s+/g, " ").trim().toLowerCase();

      if (normalized === "begin") {
        transactionSnapshot = cloneState(state);
        return { rows: [] };
      }

      if (normalized === "commit") {
        transactionSnapshot = null;
        return { rows: [] };
      }

      if (normalized === "rollback") {
        restoreSnapshot();
        return { rows: [] };
      }

      if (normalized.includes("select id from accounts where lower(current_username)=lower($1) limit 1")) {
        const match = state.accounts.find(
          (account) => account.currentUsername.toLowerCase() === String(params[0]).toLowerCase()
        );
        return { rows: match ? [{ id: match.id }] : [] };
      }

      if (
        normalized.includes("select id from accounts where lower(current_username)=lower($1) and id <> $2 limit 1")
      ) {
        const match = state.accounts.find(
          (account) =>
            account.id !== params[1] &&
            account.currentUsername.toLowerCase() === String(params[0]).toLowerCase()
        );
        return { rows: match ? [{ id: match.id }] : [] };
      }

      if (normalized.startsWith("insert into accounts")) {
        const account = {
          id: params[0] ?? nextId("account"),
          status: "guest",
          currentUsername: params[1],
          avatarEmoji: params[2],
          avatarColor: params[3],
          createdAt: new Date().toISOString(),
          claimedAt: null,
          lastSeenAt: new Date().toISOString(),
          usernameChangedAt: null,
        };
        state.accounts.push(account);
        return { rows: [account] };
      }

      if (normalized.startsWith("insert into username_history")) {
        state.usernameHistory.push({
          id: params[0] ?? nextId("history"),
          accountId: params[1],
          username: params[2],
          startedAt: new Date().toISOString(),
          endedAt: null,
        });
        return { rows: [] };
      }

      if (normalized.startsWith("insert into guest_sessions")) {
        state.guestSessions.push({
          selector: params[0],
          accountId: params[1],
          tokenHash: params[2],
          expiresAt: params[3],
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        });
        return { rows: [] };
      }

      if (normalized.includes("select guest_sessions.selector")) {
        const session = state.guestSessions.find((candidate) => candidate.selector === params[0]);
        if (!session) return { rows: [] };
        const account = state.accounts.find((candidate) => candidate.id === session.accountId);
        if (!account) return { rows: [] };
        return {
          rows: [
            {
              selector: session.selector,
              accountId: session.accountId,
              tokenHash: session.tokenHash,
              expiresAt: session.expiresAt,
              id: account.id,
              status: account.status,
              currentUsername: account.currentUsername,
              avatarEmoji: account.avatarEmoji,
              avatarColor: account.avatarColor,
            },
          ],
        };
      }

      if (
        normalized.includes(
          'select id, status, current_username as "currentusername", avatar_emoji as "avataremoji", avatar_color as "avatarcolor" from accounts where id = $1 limit 1'
        )
      ) {
        const account = state.accounts.find((candidate) => candidate.id === params[0]);
        return { rows: account ? [account] : [] };
      }

      if (normalized.startsWith("update username_history set ended_at = now()")) {
        state.usernameHistory = state.usernameHistory.map((entry) =>
          entry.accountId === params[0] && entry.endedAt == null
            ? { ...entry, endedAt: new Date().toISOString() }
            : entry
        );
        return { rows: [] };
      }

      if (normalized.startsWith("update accounts set")) {
        const account = state.accounts.find((candidate) => candidate.id === params[3]);
        if (!account) return { rows: [] };
        const usernameChanged =
          account.currentUsername.toLowerCase() !== String(params[0]).toLowerCase();
        account.currentUsername = params[0];
        account.avatarEmoji = params[1];
        account.avatarColor = params[2];
        account.lastSeenAt = new Date().toISOString();
        if (usernameChanged) {
          account.usernameChangedAt = new Date().toISOString();
        }
        return { rows: [account] };
      }

      throw new Error(`Unhandled fake query: ${sql}`);
    }),
    release: vi.fn(),
  };

  const pool = {
    connect: vi.fn(async () => client),
  };

  return {
    pool,
    client,
    state,
  };
};
