import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, fn, within } from "@storybook/test";
import { useMatchClockAndPresence } from "./useMatchClockAndPresence";
import { useIdleAcknowledgement } from "./useIdleAcknowledgement";
import { getLobbyServerOrigin } from "../session/serverOrigins";

const meta = {
  title: "Game State/Match Status/Lifecycle",
  render: () => <>
    <div data-testid="match-status-root" />
    <output role="status" data-testid="lifecycle-result">Waiting for lifecycle assertions</output>
  </>,
  parameters: { controls: { disable: true } },
};
export default meta;

// Report play completion in the canvas even without the optional Interactions addon.
const reportPlay = exercise => async context => {
  const status = within(context.canvasElement).getByTestId("lifecycle-result");
  status.textContent = "Running lifecycle assertions";
  try {
    await exercise(context);
    status.textContent = "All lifecycle assertions passed";
  } catch (error) {
    status.textContent = `Lifecycle assertion failed: ${error.message}`;
    throw error;
  }
};

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const jsonResponse = data => ({ ok: true, json: async () => data });

// This host uses React DOM and React's act, including real effects and cleanup.
// Only network responses and wall/interval clocks are controlled by the stories.
async function withMountedHook(canvasElement, useHook, exercise) {
  const host = within(canvasElement).getByTestId("match-status-root");
  const root = createRoot(host);
  const originalFetch = window.fetch;
  const originalActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let result;
  let mounted = true;
  function Probe({ input }) {
    result = useHook(input);
    return <>
      <output aria-label="Hook state">{JSON.stringify(result)}</output>
      {result.handleAcknowledgeIdle && <button onClick={result.handleAcknowledgeIdle}>Acknowledge idle</button>}
    </>;
  }
  const view = {
    get result() { return result; },
    render: input => act(async () => { root.render(<Probe input={input} />); }),
    settle: respond => act(async () => { respond(); }),
    click: () => act(async () => {
      within(host).getByRole("button", { name: "Acknowledge idle" }).click();
    }),
    unmount: async () => {
      if (!mounted) return;
      await act(async () => root.unmount());
      mounted = false;
    },
  };
  try {
    await exercise(view);
  } finally {
    await view.unmount();
    window.fetch = originalFetch;
    globalThis.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment;
  }
}

async function withClock(exercise) {
  const original = { now: Date.now, setInterval: window.setInterval, clearInterval: window.clearInterval };
  let now = 1000;
  const intervals = new Map();
  let nextId = 0;
  Date.now = () => now;
  window.setInterval = fn((callback, delay) => {
    const id = ++nextId;
    intervals.set(id, { callback, delay });
    return id;
  });
  window.clearInterval = fn(id => intervals.delete(id));
  try {
    await exercise({
      intervals,
      advance: async milliseconds => act(async () => {
        now += milliseconds;
        for (const { callback } of intervals.values()) callback();
      }),
    });
  } finally {
    Date.now = original.now;
    window.setInterval = original.setInterval;
    window.clearInterval = original.clearInterval;
  }
}

export const CountdownAndClearing = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(clock =>
    withMountedHook(canvasElement, useMatchClockAndPresence, async view => {
      window.fetch = fn();
      await step("Normalize pushed status and update both countdowns", async () => {
        await view.render({
          matchID: "a", timerSnapshot: { remainingMs: 10000 }, timerServerTimeMs: 900,
          disconnectPresence: { statusByPlayerId: { "1": { status: "disconnected", reconnectDeadlineAtMs: 5900 } } },
          disconnectServerTimeMs: 900,
          idlePresence: { activeIdlePlayerId: "0", remainingMs: 4000 }, idleServerTimeMs: 900,
        });
        expect(view.result.timerSnapshot).toEqual({ remainingMs: 10000, receivedAtMs: 1000, serverDelayMs: 100 });
        expect(view.result.disconnectStateByPlayerId).toEqual({ "1": { status: "disconnected", remainingMs: 4900 } });
        expect(view.result.idleStateByPlayerId).toEqual({ "0": { status: "idle", remainingMs: 3900 } });
        expect([...clock.intervals.values()].map(interval => interval.delay)).toEqual([250]);
        await clock.advance(500);
        expect(view.result.disconnectStateByPlayerId["1"].remainingMs).toBe(4400);
        expect(view.result.idleStateByPlayerId["0"].remainingMs).toBe(3400);
      });
      await step("An omitted update preserves status; explicit null clears and stops ticking", async () => {
        await view.render({ matchID: "a", timerSnapshot: null });
        expect(view.result.idleStateByPlayerId["0"].remainingMs).toBe(3400);
        await view.render({ matchID: "a", timerSnapshot: null, disconnectPresence: null, idlePresence: null });
        expect(view.result.timerSnapshot).toBeNull();
        expect(view.result.disconnectStateByPlayerId).toEqual({});
        expect(view.result.idleStateByPlayerId).toEqual({});
        expect(clock.intervals.size).toBe(0);
        expect(window.fetch).not.toHaveBeenCalled();
      });
    })
  )),
};

export const TimerSeedLifetime = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(async () => {
    await step("Replay and explicit timer props skip HTTP seeding", async () => {
      for (const input of [{ isReplay: true }, { timerSnapshot: null }]) {
        await withMountedHook(canvasElement, useMatchClockAndPresence, async view => {
          window.fetch = fn();
          await view.render({ matchID: "a", ...input });
          expect(window.fetch).not.toHaveBeenCalled();
        });
      }
    });
    await step("Match change cancels a late seed; the current match seeds once", async () => {
      await withMountedHook(canvasElement, useMatchClockAndPresence, async view => {
        const first = deferred();
        const second = deferred();
        window.fetch = fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        await view.render({ matchID: "a" });
        await view.render({ matchID: "b" });
        await view.settle(() => first.resolve(jsonResponse({ timer: { remainingMs: 9000 }, serverTimeMs: 900 })));
        expect(view.result.timerSnapshot).toBeNull();
        await view.settle(() => second.resolve(jsonResponse({ timer: { remainingMs: 7000 }, serverTimeMs: 950 })));
        expect(view.result.timerSnapshot).toEqual({ remainingMs: 7000, receivedAtMs: 1000, serverDelayMs: 50 });
        expect(window.fetch.mock.calls).toEqual([
          [`${getLobbyServerOrigin()}/timer/a`, { cache: "no-store" }],
          [`${getLobbyServerOrigin()}/timer/b`, { cache: "no-store" }],
        ]);
        await view.render({ matchID: "b" });
        expect(window.fetch).toHaveBeenCalledTimes(2);
      });
    });
    await step("A same-match authoritative push or clear supersedes an in-flight seed", async () => {
      for (const pushed of [{ remainingMs: 6000 }, null]) {
        await withMountedHook(canvasElement, useMatchClockAndPresence, async view => {
          const pending = deferred();
          window.fetch = fn(() => pending.promise);
          await view.render({ matchID: "a" });
          await view.render({ matchID: "a", timerSnapshot: pushed });
          const expected = pushed && { remainingMs: 6000, receivedAtMs: 1000, serverDelayMs: 0 };
          expect(view.result.timerSnapshot).toEqual(expected);
          await view.settle(() => pending.resolve(jsonResponse({ timer: { remainingMs: 9000 } })));
          expect(view.result.timerSnapshot).toEqual(expected);
          expect(window.fetch).toHaveBeenCalledOnce();
        });
      }
    });
    await step("Missing timers and HTTP/network failures stay quiet without automatic retry", async () => {
      for (const outcome of ["no-timer", "http-error", "network-error"]) {
        await withMountedHook(canvasElement, useMatchClockAndPresence, async view => {
          window.fetch = fn(async () => {
            if (outcome === "network-error") throw new Error("offline");
            return outcome === "http-error" ? new Response(null, { status: 503 }) : jsonResponse({ timer: null });
          });
          await view.render({ matchID: "a" });
          expect(view.result.timerSnapshot).toBeNull();
          await view.render({ matchID: "a" });
          expect(window.fetch).toHaveBeenCalledOnce();
        });
      }
    });
  })),
};

export const UnmountCleanup = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(clock =>
    withMountedHook(canvasElement, useMatchClockAndPresence, async view => {
      await step("Unmount releases the interval and suppresses a late response before normalization", async () => {
        const pending = deferred();
        const readTimer = fn(() => ({ remainingMs: 9000 }));
        window.fetch = fn(() => pending.promise);
        await view.render({ matchID: "a", idlePresence: { activeIdlePlayerId: "0", remainingMs: 5000 } });
        expect(clock.intervals.size).toBe(1);
        await view.unmount();
        expect(clock.intervals.size).toBe(0);
        await view.settle(() => pending.resolve(jsonResponse({ get timer() { return readTimer(); } })));
        expect(readTimer).not.toHaveBeenCalled();
      });
    })
  )),
};

const idleInput = { matchID: "match-a", playerID: "0", credentials: "synthetic-seat", activeIdlePlayerId: "0", isGameOver: false };
export const IdleAcknowledgement = {
  play: reportPlay(async ({ canvasElement, step }) => {
    await step("Submit the seat credentials, show pending state and reject a second pending submission", async () => {
      await withMountedHook(canvasElement, useIdleAcknowledgement, async view => {
        const pending = deferred();
        window.fetch = fn(() => pending.promise);
        await view.render(idleInput);
        await view.click();
        expect(view.result.isAcknowledgingIdle).toBe(true);
        await view.click();
        expect(window.fetch).toHaveBeenCalledOnce();
        const [url, init] = window.fetch.mock.calls[0];
        expect(url).toBe(`${getLobbyServerOrigin()}/idle/match-a/ack`);
        expect(init.method).toBe("POST");
        expect(init.headers).toEqual({ "Content-Type": "application/json" });
        expect(JSON.parse(init.body)).toEqual({ playerID: "0", credentials: "synthetic-seat" });
        await view.settle(() => pending.resolve(new Response(null, { status: 204 })));
        expect(view.result.isAcknowledgingIdle).toBe(false);
        expect(view.result.idleAckError).toBeNull();
      });
    });
    await step("Missing seat or match does nothing; missing credentials produces a local error", async () => {
      for (const input of [{ playerID: null }, { matchID: "" }, { credentials: "" }]) {
        await withMountedHook(canvasElement, useIdleAcknowledgement, async view => {
          window.fetch = fn();
          await view.render({ ...idleInput, ...input });
          await view.click();
          expect(window.fetch).not.toHaveBeenCalled();
          expect(view.result.idleAckError).toBe(input.credentials === "" ? "Missing player credentials." : null);
        });
      }
    });
    await step("Server, malformed response and network failures surface; ending a warning clears the error", async () => {
      const failures = [
        [() => Response.json({ error: "Seat is no longer active" }, { status: 403 }), "Seat is no longer active"],
        [() => new Response("bad gateway", { status: 502 }), "Unable to clear idle warning."],
        [() => { throw new TypeError("offline"); }, "offline"],
      ];
      for (const [response, expected] of failures) {
        await withMountedHook(canvasElement, useIdleAcknowledgement, async view => {
          window.fetch = fn(async () => response());
          await view.render(idleInput);
          await view.click();
          expect(view.result.idleAckError).toBe(expected);
          expect(view.result.isAcknowledgingIdle).toBe(false);
          await view.render({ ...idleInput, activeIdlePlayerId: null });
          expect(view.result.idleAckError).toBeNull();
        });
      }
    });
    await step("A pending request resets at lifecycle boundaries; its late failure retains existing behavior", async () => {
      for (const input of [{ matchID: "other" }, { isGameOver: true }, { activeIdlePlayerId: null }]) {
        await withMountedHook(canvasElement, useIdleAcknowledgement, async view => {
          const pending = deferred();
          window.fetch = fn(() => pending.promise);
          await view.render(idleInput);
          await view.click();
          expect(view.result.isAcknowledgingIdle).toBe(true);
          await view.render({ ...idleInput, ...input });
          expect(view.result.isAcknowledgingIdle).toBe(false);
          expect(view.result.idleAckError).toBeNull();
          // This extraction deliberately retains the original non-cancelled ack.
          await view.settle(() => pending.resolve(Response.json({ error: "Late rejection" }, { status: 403 })));
          expect(view.result.idleAckError).toBe("Late rejection");
          expect(view.result.isAcknowledgingIdle).toBe(false);
        });
      }
    });
    await step("Match changes and game over clear prior errors", async () => {
      for (const input of [{ matchID: "other" }, { isGameOver: true }]) {
        await withMountedHook(canvasElement, useIdleAcknowledgement, async view => {
          await view.render({ ...idleInput, credentials: null });
          await view.click();
          expect(view.result.idleAckError).toBe("Missing player credentials.");
          await view.render({ ...idleInput, ...input });
          expect(view.result.idleAckError).toBeNull();
        });
      }
    });
  }),
};
