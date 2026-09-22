import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import {
  SETTLEGRAPH_005_MODEL_SHA256,
  SETTLEGRAPH_V2_CONTRACT_SHA256,
  SETTLEGRAPH_V2_MODEL_SHA256,
  SettleGraphV2Client
} from "../bots/SettleGraphV2Client.js";

function createWorkerStub(onRequest) {
  const proc = new EventEmitter();
  proc.stdout = new PassThrough();
  proc.stderr = new PassThrough();
  proc.stdin = new Writable({
    write(chunk, _encoding, callback) {
      const request = JSON.parse(chunk.toString());
      const response = onRequest(request);
      queueMicrotask(() => {
        proc.stdout.write(`${JSON.stringify(response)}\n`);
      });
      callback();
    }
  });
  proc.kill = vi.fn(() => {
    proc.emit("exit", 0, null);
    return true;
  });
  return proc;
}

const healthResponse = (id) => ({
  id,
  ok: true,
  modelSha256: SETTLEGRAPH_V2_MODEL_SHA256,
  contract: {
    model_kind: "SettleGraph/CTNN-v2",
    observation_version: 2,
    observation_dim: 1445,
    codec_version: 1,
    action_count: 299,
    contract_sha256: SETTLEGRAPH_V2_CONTRACT_SHA256
  }
});

const health005Response = (id, overrides = {}) => ({
  ...healthResponse(id),
  modelSha256: SETTLEGRAPH_005_MODEL_SHA256,
  contract: {
    model_kind: "SettleGraph/CTNN-v3",
    observation_version: 3,
    observation_dim: 1464,
    codec_version: 1,
    action_count: 299,
    contract_sha256: SETTLEGRAPH_V2_CONTRACT_SHA256
  },
  ...overrides
});

describe("SettleGraphV2Client", () => {
  it("accepts 005 health and pins later decisions to that identity", async () => {
    let responseModelSha256 = SETTLEGRAPH_005_MODEL_SHA256;
    const proc = createWorkerStub((request) => request.mode === "health"
      ? health005Response(request.id)
      : {
          id: request.id,
          ok: true,
          stateId: request.state._stateID,
          plannedMoves: [{ move: "endTurn", args: [] }],
          actionIds: [298],
          modelSha256: responseModelSha256
        });
    const client = new SettleGraphV2Client({
      workerPath: "/tmp/settlegraph-v2-worker",
      modelPath: "/tmp/incumbent-005.ctnn",
      spawnImpl: () => proc
    });

    await expect(client.decide({ playerId: "1", state: { _stateID: 42 } }))
      .resolves.toMatchObject({ modelSha256: SETTLEGRAPH_005_MODEL_SHA256 });
    responseModelSha256 = SETTLEGRAPH_V2_MODEL_SHA256;
    await expect(client.decide({ playerId: "1", state: { _stateID: 43 } }))
      .rejects.toThrow("unexpected model identity");
    client.close();
  });

  it.each([
    ["shape", { contract: { ...health005Response("fixture").contract, observation_dim: 1445 } }, "contract mismatch"],
    ["hash", { modelSha256: "wrong-model" }, "model SHA-256 mismatch"]
  ])("rejects 005 health with a mismatched %s", async (_name, override, expected) => {
    const proc = createWorkerStub((request) => health005Response(request.id, override));
    const client = new SettleGraphV2Client({
      workerPath: "/tmp/settlegraph-v2-worker",
      modelPath: "/tmp/incumbent-005.ctnn",
      spawnImpl: () => proc
    });

    await expect(client.start()).rejects.toThrow(expected);
    expect(proc.kill).toHaveBeenCalledOnce();
  });

  it("rejects an approved but different model identity after a worker restart", async () => {
    const first = createWorkerStub((request) => health005Response(request.id));
    const second = createWorkerStub((request) => healthResponse(request.id));
    const spawnImpl = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const client = new SettleGraphV2Client({
      workerPath: "/tmp/settlegraph-v2-worker",
      modelPath: "/tmp/incumbent-005.ctnn",
      spawnImpl
    });

    await expect(client.start()).resolves.toMatchObject({
      modelSha256: SETTLEGRAPH_005_MODEL_SHA256
    });
    first.emit("exit", 1, null);
    await expect(client.start()).rejects.toThrow("model SHA-256 mismatch");
    expect(spawnImpl).toHaveBeenCalledTimes(2);
  });

  it("preflights the sealed contract once and correlates decision responses", async () => {
    const requests = [];
    const proc = createWorkerStub((request) => {
      requests.push(request);
      if (request.mode === "health") return healthResponse(request.id);
      return {
        id: request.id,
        ok: true,
        stateId: request.state._stateID,
        plannedMoves: [{ move: "rollDice", args: [] }],
        actionIds: [294],
        value: 0.25,
        legalActionCount: 1,
        modelSha256: SETTLEGRAPH_V2_MODEL_SHA256
      };
    });
    const spawnImpl = vi.fn(() => proc);
    const client = new SettleGraphV2Client({
      workerPath: "/tmp/settlegraph-v2-worker",
      modelPath: "/tmp/accepted-v2.ctnn",
      spawnImpl
    });

    const result = await client.decide({ playerId: "1", state: { _stateID: 42 } });
    const second = await client.decide({ playerId: "1", state: { _stateID: 43 } });

    expect(spawnImpl).toHaveBeenCalledTimes(1);
    expect(spawnImpl).toHaveBeenCalledWith(
      "/tmp/settlegraph-v2-worker",
      ["--model", "/tmp/accepted-v2.ctnn"],
      expect.objectContaining({ stdio: ["pipe", "pipe", "pipe"] })
    );
    expect(requests.map(({ mode }) => mode)).toEqual(["health", "decide", "decide"]);
    expect(requests[1]).toMatchObject({
      playerId: "1",
      state: { _stateID: 42 }
    });
    expect(result.plannedMoves).toEqual([{ move: "rollDice", args: [] }]);
    expect(second.stateId).toBe(43);

    client.close();
  });

  it("rejects a worker whose model identity does not match the sealed artifact", async () => {
    const proc = createWorkerStub((request) => ({
      ...healthResponse(request.id),
      modelSha256: "wrong-model"
    }));
    const client = new SettleGraphV2Client({
      workerPath: "/tmp/settlegraph-v2-worker",
      modelPath: "/tmp/accepted-v2.ctnn",
      spawnImpl: () => proc
    });

    await expect(client.decide({ playerId: "1", state: {} }))
      .rejects.toThrow("model SHA-256 mismatch");
    expect(proc.kill).toHaveBeenCalledOnce();
  });

  it("rejects a request timeout and can restart on the next decision", async () => {
    vi.useFakeTimers();
    const first = createWorkerStub(() => undefined);
    first.stdin = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
    const second = createWorkerStub((request) => {
      if (request.mode === "health") return healthResponse(request.id);
      return {
        id: request.id,
        ok: true,
        stateId: 8,
        plannedMoves: [{ move: "endTurn", args: [] }],
        actionIds: [298],
        modelSha256: SETTLEGRAPH_V2_MODEL_SHA256
      };
    });
    const spawnImpl = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second);
    const client = new SettleGraphV2Client({
      workerPath: "/tmp/settlegraph-v2-worker",
      modelPath: "/tmp/accepted-v2.ctnn",
      timeoutMs: 20,
      spawnImpl
    });

    const timedOut = client.decide({ playerId: "1", state: {} });
    const timedOutExpectation = expect(timedOut).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(20);
    await timedOutExpectation;

    const recovered = client.decide({ playerId: "1", state: { _stateID: 8 } });
    const recoveredExpectation = expect(recovered).resolves.toMatchObject({ actionIds: [298] });
    await vi.runAllTimersAsync();
    await recoveredExpectation;
    expect(spawnImpl).toHaveBeenCalledTimes(2);
    client.close();
    vi.useRealTimers();
  });
});
