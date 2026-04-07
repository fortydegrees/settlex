import { vi } from "vitest";

const cloneState = (state) => JSON.parse(JSON.stringify(state));

export const createFakeAccountsPool = () => {
  const state = {
    accounts: [],
    usernameHistory: [],
    guestSessions: [],
    accountEmails: [],
    authIdentities: [],
    magicLinkTokens: [],
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

      if (normalized.startsWith("insert into magic_link_tokens")) {
        const token = {
          id: params[0] ?? nextId("magic-link"),
          accountId: params[1],
          email: params[2],
          tokenHash: params[3],
          redirectTo: params[4],
          expiresAt: params[5],
          consumedAt: null,
          createdAt: new Date().toISOString(),
        };
        state.magicLinkTokens.push(token);
        return {
          rows: [
            {
              id: token.id,
              expiresAt: token.expiresAt,
              redirectTo: token.redirectTo,
            },
          ],
        };
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

      if (
        normalized.includes(
          'select id, account_id as "accountid", email, redirect_to as "redirectto", expires_at as "expiresat", consumed_at as "consumedat" from magic_link_tokens where token_hash = $1 limit 1'
        )
      ) {
        const token = state.magicLinkTokens.find((candidate) => candidate.tokenHash === params[0]);
        return {
          rows: token
            ? [
                {
                  id: token.id,
                  accountId: token.accountId,
                  email: token.email,
                  redirectTo: token.redirectTo,
                  expiresAt: token.expiresAt,
                  consumedAt: token.consumedAt,
                },
              ]
            : [],
        };
      }

      if (
        normalized.includes(
          'select id, account_id as "accountid" from account_emails where lower(email)=lower($1) limit 1'
        )
      ) {
        const email = state.accountEmails.find(
          (candidate) => candidate.email.toLowerCase() === String(params[0]).toLowerCase()
        );
        return {
          rows: email ? [{ id: email.id, accountId: email.accountId }] : [],
        };
      }

      if (normalized.startsWith("insert into account_emails")) {
        const email = {
          id: params[0] ?? nextId("email"),
          accountId: params[1],
          email: params[2],
          verifiedAt: params.length > 3 ? params[3] ?? null : new Date().toISOString(),
          isPrimary: params.length > 4 ? params[4] ?? false : true,
          createdAt: new Date().toISOString(),
        };
        state.accountEmails.push(email);
        return { rows: [email] };
      }

      if (normalized.startsWith("update account_emails set is_primary = false")) {
        state.accountEmails = state.accountEmails.map((entry) =>
          entry.accountId === params[0] && entry.id !== params[1]
            ? { ...entry, isPrimary: false }
            : entry
        );
        return { rows: [] };
      }

      if (normalized.startsWith("update account_emails set verified_at = now(), is_primary = true")) {
        const email = state.accountEmails.find((entry) => entry.id === params[0]);
        if (!email) return { rows: [] };
        email.verifiedAt = new Date().toISOString();
        email.isPrimary = true;
        return { rows: [email] };
      }

      if (
        normalized.includes(
          'select id, account_id as "accountid" from auth_identities where provider = $1 and provider_user_id = $2 limit 1'
        )
      ) {
        const identity = state.authIdentities.find(
          (candidate) =>
            candidate.provider === params[0] && candidate.providerUserId === params[1]
        );
        return {
          rows: identity ? [{ id: identity.id, accountId: identity.accountId }] : [],
        };
      }

      if (normalized.startsWith("insert into auth_identities")) {
        const identity = {
          id: params[0] ?? nextId("identity"),
          accountId: params[1],
          provider: params[2],
          providerUserId: params[3],
          createdAt: new Date().toISOString(),
        };
        state.authIdentities.push(identity);
        return { rows: [identity] };
      }

      if (normalized.startsWith("update username_history set ended_at = now()")) {
        state.usernameHistory = state.usernameHistory.map((entry) =>
          entry.accountId === params[0] && entry.endedAt == null
            ? { ...entry, endedAt: new Date().toISOString() }
            : entry
        );
        return { rows: [] };
      }

      if (normalized.startsWith("update accounts set status = 'claimed'")) {
        const account = state.accounts.find((candidate) => candidate.id === params[0]);
        if (!account) return { rows: [] };
        account.status = "claimed";
        account.claimedAt = account.claimedAt ?? new Date().toISOString();
        account.lastSeenAt = new Date().toISOString();
        return { rows: [account] };
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

      if (normalized.startsWith("update magic_link_tokens set consumed_at = now()")) {
        const token = state.magicLinkTokens.find((candidate) => candidate.id === params[0]);
        if (!token) return { rows: [] };
        token.consumedAt = new Date().toISOString();
        return { rows: [token] };
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
