import { describe, expect, it, vi } from "vitest";

import {
  isPublicMatchmakingRequestCancelled,
  recordPublicMatchmakingCancellation,
} from "../matches/publicMatchmakingCancellationStore.js";

describe("public matchmaking cancellation store", () => {
  it("persists a cancellation identity without storing player credentials", async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [] });

    await recordPublicMatchmakingCancellation({
      accountId: "acct_ada",
      modeId: "duel",
      requestId: "r".repeat(48),
      pool: { query },
    });

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0][1]).toEqual([
      "acct_ada",
      "duel",
      "r".repeat(48),
      "1 day",
    ]);
  });

  it("recognizes only a live cancellation tombstone", async () => {
    const cancelledPool = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ cancelled: 1 }] }),
    };
    const activePool = {
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }),
    };
    const identity = {
      accountId: "acct_ada",
      modeId: "duel",
      requestId: "r".repeat(48),
    };

    await expect(
      isPublicMatchmakingRequestCancelled({ ...identity, pool: cancelledPool })
    ).resolves.toBe(true);
    await expect(
      isPublicMatchmakingRequestCancelled({ ...identity, pool: activePool })
    ).resolves.toBe(false);
  });
});
