import { expect, it, vi } from "vitest";
import { loadPostgameReplayPayload } from "../replays/usePostgameReplayPayload";
import * as postgameReplayPayload from "../replays/usePostgameReplayPayload";

it("tags every payload state with the identity that produced it", () => {
  expect(postgameReplayPayload.createPostgameReplayPayloadState).toBeTypeOf(
    "function"
  );
  if (!postgameReplayPayload.createPostgameReplayPayloadState) return;

  expect(
    postgameReplayPayload.createPostgameReplayPayloadState({
      identityKey: "A",
      status: "ready",
      payload: { replay: { id: "replay-a" } },
    })
  ).toEqual({
    identityKey: "A",
    status: "ready",
    payload: { replay: { id: "replay-a" } },
    error: null,
  });
});

it("retries preparing archives and returns the ready payload", async () => {
  const responses = [
    new Response(JSON.stringify({ status: "preparing" }), { status: 202 }),
    new Response(JSON.stringify({ replay: {}, frames: [{}] }), { status: 200 }),
  ];
  const wait = vi.fn().mockResolvedValue(undefined);
  const payload = await loadPostgameReplayPayload({
    matchID: "m1",
    fetchImpl: vi.fn().mockImplementation(() => Promise.resolve(responses.shift())),
    wait,
    maxAttempts: 2,
  });
  expect(payload.frames).toHaveLength(1);
  expect(wait).toHaveBeenCalledTimes(1);
});

it("threads the abort signal through fetch and stops after a 202 wait", async () => {
  const controller = new AbortController();
  const fetchImpl = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ status: "preparing" }), { status: 202 })
  );
  const wait = vi.fn().mockImplementation(async (_delayMs, { signal }) => {
    expect(signal).toBe(controller.signal);
    controller.abort();
  });

  await expect(
    loadPostgameReplayPayload({
      matchID: "m1",
      fetchImpl,
      wait,
      maxAttempts: 3,
      signal: controller.signal,
    })
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(fetchImpl).toHaveBeenCalledTimes(1);
  expect(fetchImpl).toHaveBeenCalledWith(
    "/api/matches/m1/replay",
    { signal: controller.signal }
  );
});

it("cancels the hook request seam without surfacing an error", async () => {
  expect(postgameReplayPayload.startPostgameReplayRequest).toBeTypeOf(
    "function"
  );
  if (!postgameReplayPayload.startPostgameReplayRequest) return;

  const onReady = vi.fn();
  const onError = vi.fn();
  const load = vi.fn().mockImplementation(
    ({ signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      })
  );
  const cancel = postgameReplayPayload.startPostgameReplayRequest({
    matchID: "m1",
    load,
    onReady,
    onError,
  });

  cancel();
  await new Promise((resolve) => setTimeout(resolve, 0));

  expect(load.mock.calls[0][0].signal.aborted).toBe(true);
  expect(onReady).not.toHaveBeenCalled();
  expect(onError).not.toHaveBeenCalled();
});

it("stops retrying when the archive remains in preparation", async () => {
  const responses = [
    new Response(JSON.stringify({ status: "preparing" }), { status: 202 }),
    new Response(JSON.stringify({ status: "preparing" }), { status: 202 }),
  ];
  const wait = vi.fn().mockResolvedValue(undefined);

  await expect(
    loadPostgameReplayPayload({
      matchID: "m1",
      fetchImpl: vi.fn().mockImplementation(() =>
        Promise.resolve(responses.shift())
      ),
      wait,
      maxAttempts: 2,
    })
  ).rejects.toThrow("Replay is still preparing");
  expect(wait).toHaveBeenCalledTimes(1);
});
