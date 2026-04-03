import { describe, expect, it, vi } from "vitest";
import { acknowledgeIdle } from "../presence/acknowledgeIdle";

const createServerInstance = () => ({
  db: {
    fetch: vi.fn()
  },
  auth: {
    authenticateCredentials: vi.fn()
  },
  transport: {
    pubSub: {
      publish: vi.fn()
    }
  }
});

describe("acknowledgeIdle", () => {
  it("rejects missing playerID or credentials", async () => {
    const serverInstance = createServerInstance();
    const idleManager = { acknowledge: vi.fn() };

    await expect(
      acknowledgeIdle({
        serverInstance,
        idleManager,
        matchID: "m1",
        playerID: null,
        credentials: "secret"
      })
    ).rejects.toMatchObject({ status: 400 });

    await expect(
      acknowledgeIdle({
        serverInstance,
        idleManager,
        matchID: "m1",
        playerID: "1",
        credentials: ""
      })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects invalid credentials", async () => {
    const serverInstance = createServerInstance();
    serverInstance.db.fetch.mockResolvedValue({
      state: { _stateID: 3 },
      metadata: { players: { "1": { credentials: "secret" } } }
    });
    serverInstance.auth.authenticateCredentials.mockResolvedValue(false);

    await expect(
      acknowledgeIdle({
        serverInstance,
        idleManager: { acknowledge: vi.fn() },
        matchID: "m2",
        playerID: "1",
        credentials: "wrong"
      })
    ).rejects.toMatchObject({ status: 403 });
  });

  it("acknowledges idle and rebroadcasts the current state on success", async () => {
    const serverInstance = createServerInstance();
    const state = { _stateID: 4, ctx: { currentPlayer: "0" } };
    const metadata = { players: { "1": { credentials: "secret" } } };
    const idleManager = {
      acknowledge: vi.fn().mockReturnValue(true)
    };

    serverInstance.db.fetch.mockResolvedValue({ state, metadata });
    serverInstance.auth.authenticateCredentials.mockResolvedValue(true);

    await expect(
      acknowledgeIdle({
        serverInstance,
        idleManager,
        matchID: "m3",
        playerID: "1",
        credentials: "secret"
      })
    ).resolves.toEqual({ ok: true });

    expect(idleManager.acknowledge).toHaveBeenCalledWith("m3", "1");
    expect(serverInstance.transport.pubSub.publish).toHaveBeenCalledWith(
      "MATCH-m3",
      {
        type: "update",
        args: ["m3", state]
      }
    );
  });
});
