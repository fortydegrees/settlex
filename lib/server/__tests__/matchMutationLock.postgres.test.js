import pg from "pg";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { Pool } = pg;
const connectionString = process.env.MATCH_ALERT_POSTGRES_URL?.trim();
const application_name = `settlex-final-review-lock-tests-${process.pid}`;
const describeWithPostgres = connectionString ? describe : describe.skip;

describeWithPostgres("match mutation lock against Postgres", () => {
  let pool;

  beforeAll(() => {
    pool = new Pool({ connectionString, application_name });
  });

  afterAll(async () => {
    await pool?.end();
  });

  const loadLock = async () =>
    import("../matches/matchMutationLock.js").catch(() => ({}));

  it("serializes mutations for the same match", async () => {
    const { withMatchMutationLock } = await loadLock();
    expect(withMatchMutationLock).toBeTypeOf("function");

    const matchID = randomUUID();
    const order = [];
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    const first = withMatchMutationLock({
      pool,
      matchID,
      run: async () => {
        order.push("first:start");
        await firstGate;
        order.push("first:end");
      },
    });
    await vi.waitFor(() => expect(order).toEqual(["first:start"]));

    const second = withMatchMutationLock({
      pool,
      matchID,
      run: async () => {
        order.push("second:start");
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(order).toEqual(["first:start"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("does not block a different match", async () => {
    const { withMatchMutationLock } = await loadLock();
    expect(withMatchMutationLock).toBeTypeOf("function");

    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    let firstStarted = false;
    const first = withMatchMutationLock({
      pool,
      matchID: randomUUID(),
      run: async () => {
        firstStarted = true;
        await firstGate;
      },
    });
    await vi.waitFor(() => expect(firstStarted).toBe(true));

    await expect(
      withMatchMutationLock({
        pool,
        matchID: randomUUID(),
        run: async () => "second-complete",
      })
    ).resolves.toBe("second-complete");

    releaseFirst();
    await first;
  });
});

describeWithPostgres("contended mutation lock connection ownership", () => {
  it.each([2, 3, 10])("lets a holder use a saturated %i-connection pool, including nested locks", async (max) => {
    const { withMatchMutationLock } = await import("../matches/matchMutationLock.js");
    const pool = new Pool({
      connectionString, application_name, max, connectionTimeoutMillis: 600,
      statement_timeout: 1000,
    });
    const matchID = randomUUID();
    const count = max + 6;
    const queryAnswer = async () => (await pool.query("SELECT 42 AS answer")).rows[0].answer;
    const doWork = () => max === 2 ? queryAnswer() : withMatchMutationLock({
      pool, matchID: `${matchID}:nested-seat`, run: queryAnswer,
    });
    let allowWork;
    const work = new Promise((resolve) => { allowWork = resolve; });
    let active = 0;
    let peakActive = 0;
    const operations = [];
    try {
      operations.push(withMatchMutationLock({ pool, matchID, run: async () => {
        active += 1;
        peakActive = Math.max(peakActive, active);
        try {
          await work;
          return await doWork();
        } finally { active -= 1; }
      } }));
      // Install rejection handlers immediately, including on the pre-fix timeout.
      const holderResult = Promise.allSettled(operations);
      await vi.waitFor(() => expect(active).toBe(1));
      for (let index = 0; index < count - 1; index += 1) {
        operations.push(withMatchMutationLock({ pool, matchID, run: async () => {
          active += 1;
          peakActive = Math.max(peakActive, active);
          try {
            return await doWork();
          } finally { active -= 1; }
        } }));
      }
      const results = Promise.allSettled(operations);
      // Give contenders time to occupy the remaining connections before the
      // holder asks for another. Timeouts above bound the old blocking implementation.
      await new Promise((resolve) => setTimeout(resolve, 75));
      allowWork();
      expect(await results).toEqual(Array.from({ length: count }, () => ({
        status: "fulfilled", value: 42,
      })));
      await holderResult;
      expect(peakActive).toBe(1);
      expect(pool.waitingCount).toBe(0);
      expect(pool.idleCount).toBe(pool.totalCount);
    } finally {
      allowWork();
      await Promise.allSettled(operations);
      await pool.end();
    }
  }, 10000);

  it("respects an independent database session lock and releases on rollback", async () => {
    const { withMatchMutationLock } = await import("../matches/matchMutationLock.js");
    const pool = new Pool({ connectionString, application_name, max: 2, statement_timeout: 2000 });
    const externalPool = new Pool({ connectionString, application_name, max: 1 });
    const external = await externalPool.connect();
    const matchID = randomUUID();
    const key = `settlex:match-mutation:${matchID}`;
    let entered = false;
    let operation;
    try {
      await external.query("BEGIN");
      await external.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
      operation = withMatchMutationLock({ pool, matchID, run: async () => {
        entered = true;
        throw new Error("mutation rejected");
      } });
      const outcome = Promise.allSettled([operation]);
      await new Promise((resolve) => setTimeout(resolve, 75));
      expect(entered).toBe(false);
      await external.query("COMMIT");
      expect(await outcome).toEqual([{ status: "rejected", reason: new Error("mutation rejected") }]);
      await external.query("BEGIN");
      const result = await external.query(
        "SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS acquired", [key]
      );
      expect(result.rows[0].acquired).toBe(true);
    } finally {
      await external.query("ROLLBACK");
      external.release();
      await Promise.allSettled([operation]);
      await Promise.all([pool.end(), externalPool.end()]);
    }
  });
});
