import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const { Pool } = pg;
const connectionString = process.env.MATCH_ALERT_POSTGRES_URL?.trim();
const describeWithPostgres = connectionString ? describe : describe.skip;

describeWithPostgres("match mutation lock against Postgres", () => {
  let pool;

  beforeAll(() => {
    pool = new Pool({ connectionString });
  });

  afterAll(async () => {
    await pool?.end();
  });

  const loadLock = async () =>
    import("../matches/matchMutationLock.js").catch(() => ({}));

  it("serializes mutations for the same match", async () => {
    const { withMatchMutationLock } = await loadLock();
    expect(withMatchMutationLock).toBeTypeOf("function");

    const order = [];
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    const first = withMatchMutationLock({
      pool,
      matchID: "same_match",
      run: async () => {
        order.push("first:start");
        await firstGate;
        order.push("first:end");
      },
    });
    await vi.waitFor(() => expect(order).toEqual(["first:start"]));

    const second = withMatchMutationLock({
      pool,
      matchID: "same_match",
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
      matchID: "first_match",
      run: async () => {
        firstStarted = true;
        await firstGate;
      },
    });
    await vi.waitFor(() => expect(firstStarted).toBe(true));

    await expect(
      withMatchMutationLock({
        pool,
        matchID: "second_match",
        run: async () => "second-complete",
      })
    ).resolves.toBe("second-complete");

    releaseFirst();
    await first;
  });
});
