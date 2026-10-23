import { setTimeout as delay } from "node:timers/promises";
import { getPool } from "../db/getPool.js";

// Keep the deployed lock namespace so mixed-version servers serialize the same match.
const lockKeyForMatch = (matchID) => `settlex:match-mutation:${matchID}`;

export const withMatchMutationLock = async ({
  pool = getPool(),
  matchID,
  run,
} = {}) => {
  if (!matchID) throw new Error("matchID is required");
  if (typeof run !== "function") throw new Error("run is required");

  for (;;) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query(
        "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired",
        [lockKeyForMatch(matchID)]
      );
      if (rows[0].acquired) {
        const result = await run();
        await client.query("COMMIT");
        return result;
      }
      await client.query("ROLLBACK");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    // A blocked waiter must not reserve a pool connection: the holder may need
    // one for nested match locks, cancellation reads, or alert mutations. The
    // successful transaction still owns the cross-process lock until completion.
    await delay(25);
  }
};
