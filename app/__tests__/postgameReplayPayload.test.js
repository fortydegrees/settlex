import { expect, it, vi } from "vitest";
import { loadPostgameReplayPayload } from "../replays/usePostgameReplayPayload";

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
