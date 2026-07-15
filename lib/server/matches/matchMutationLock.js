import { getPool } from "../db/getPool.js";

const lockKeyForMatch = (matchID) => `settlex:match-mutation:${matchID}`;

export const withMatchMutationLock = async ({
  pool = getPool(),
  matchID,
  run,
} = {}) => {
  if (!matchID) throw new Error("matchID is required");
  if (typeof run !== "function") throw new Error("run is required");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [lockKeyForMatch(matchID)]
    );
    const result = await run();
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
