import { act } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { expect, fn, within } from "@storybook/test";
import { useLobbyHomeActions } from "./useLobbyHomeActions";
import { HomeTableClient } from "../home/HomeTableClient";
import { MatchAlertContext } from "../matchAlerts/MatchAlertProvider";
import { matchAlertFixtures } from "../dev/storybook/accountFixtures";
import { readLastActiveMatch, writeLastActiveMatch } from "../utils/activeMatchStorage";

const meta = {
  title: "Game State/Public Matchmaking/Lifecycle",
  render: () => <>
    <div data-testid="public-search-root" />
    <output data-testid="lifecycle-result">Waiting for lifecycle assertions</output>
  </>,
  parameters: { controls: { disable: true } },
};
export default meta;
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
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const jsonResponse = value => ({ ok: true, json: async () => value });
const account = { id: "synthetic-account", currentUsername: "Ada", avatarEmoji: "😀", avatarColor: "teal" };
const waitingSeat = body => ({ matchID: "waiting-duel", playerID: "0", playerCredentials: body.requestedCredentials, createdNewPublicDuel: true });
const filledMatch = { matchID: "filled-duel", playerID: "1", playerCredentials: "synthetic-assigned-seat", createdNewPublicDuel: false };

// Real React DOM owns all rendering/effect cleanup. Only external API responses,
// router navigation, alert requests and the wall/interval clock are controlled.
async function withLobby(canvasElement, exercise, { initialAccount = account, home = false } = {}) {
  const host = within(canvasElement).getByTestId("public-search-root");
  const root = createRoot(host);
  const oldFetch = window.fetch;
  const oldActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  const oldStorage = new Map(Object.keys(localStorage).map(key => [key, localStorage.getItem(key)]));
  Object.keys(localStorage).filter(key => key.startsWith("catana:")).forEach(key => localStorage.removeItem(key));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let lobby;
  let actionResult;
  let mounted = true;
  const events = [];
  const requests = [];
  const router = { push: fn(href => events.push(["navigate", href])), replace: fn(), back: fn(), forward: fn(), refresh: fn(), hmrRefresh: fn(), prefetch: fn() };
  const alerts = {
    requestAnnouncement: fn(async matchID => events.push(["announce", matchID])),
    refresh: fn(async () => {}),
    detachCurrentBrowser: fn(async () => ({ safeToSignOut: true })),
    completeMatchAlertSignOut: fn(),
    display: matchAlertFixtures.off, loading: false, error: "",
    enable: fn(), disable: fn(), resume: fn(),
  };
  const markGameStart = fn(matchID => events.push(["mark", matchID]));
  const api = { restoreAccount: async () => null, respond: async (route, init, body) => {
    if (init.method === "POST") return waitingSeat(body);
    if (init.method === "DELETE") return { status: "cancelled" };
    return { players: [{ id: 0, name: "Ada" }, { id: 1, name: null }] };
  } };
  window.fetch = fn(async (route, init = {}) => {
    if (route === "/api/auth/options") return jsonResponse({ emailPassword: true, socialProviders: [] });
    if (route === "/api/account/me") return jsonResponse({ account: await api.restoreAccount() });
    if (route === "/api/account/logout") return jsonResponse({ ok: true });
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ route, method: init.method ?? "GET", body });
    const value = await api.respond(route, init, body);
    return value instanceof Response || typeof value?.ok === "boolean" ? value : jsonResponse(value);
  });
  function Probe() {
    lobby = useLobbyHomeActions({ initialAccount, onGameStartTransition: markGameStart });
    const controls = {
      "Find online": lobby.actions.playOnline,
      "Cancel search": lobby.overlays.cancelSearch,
      "Play Puffer": lobby.actions.playPufferFromSearch,
      "Sign out": lobby.actions.signOut,
    };
    return <>
      <output aria-label="Lobby state">{JSON.stringify({ searchState: lobby.searchState, elapsed: lobby.searchElapsedSeconds, error: lobby.error, isBusy: lobby.isBusy })}</output>
      {Object.entries(controls).map(([name, action]) => <button key={name} onClick={() => { actionResult = action(); }}>{name}</button>)}
    </>;
  }
  const view = {
    api, router, alerts, events, requests,
    get lobby() { return lobby; },
    get actionResult() { return actionResult; },
    click: name => act(async () => within(host).getByRole("button", { name, exact: true }).click()),
    settle: respond => act(async () => { respond(); }),
    unmount: async () => {
      if (!mounted) return;
      await act(async () => root.unmount());
      mounted = false;
    },
  };
  try {
    await act(async () => root.render(
      <AppRouterContext.Provider value={router}>
        <MatchAlertContext.Provider value={alerts}>
          {home ? <HomeTableClient initialAccount={initialAccount} /> : <Probe />}
        </MatchAlertContext.Provider>
      </AppRouterContext.Provider>
    ));
    await exercise(view);
  } finally {
    await view.unmount();
    window.fetch = oldFetch;
    Object.keys(localStorage).filter(key => key.startsWith("catana:")).forEach(key => localStorage.removeItem(key));
    oldStorage.forEach((value, key) => localStorage.setItem(key, value));
    globalThis.IS_REACT_ACT_ENVIRONMENT = oldActEnvironment;
  }
}
async function withClock(exercise) {
  const old = { now: Date.now, setInterval: window.setInterval, clearInterval: window.clearInterval, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };
  let now = 1000;
  let id = 1_000_000;
  const intervals = new Map();
  const timeouts = new Map();
  Date.now = () => now;
  window.setInterval = (callback, delay, ...args) => {
    if (delay !== 1000 && delay !== 1500) return old.setInterval.call(window, callback, delay, ...args);
    intervals.set(++id, { callback, delay }); return id;
  };
  window.clearInterval = handle => { if (!intervals.delete(handle)) old.clearInterval.call(window, handle); };
  window.setTimeout = (callback, delay, ...args) => {
    if (delay !== 2000) return old.setTimeout.call(window, callback, delay, ...args);
    timeouts.set(++id, { callback, at: now + delay }); return id;
  };
  window.clearTimeout = handle => { if (!timeouts.delete(handle)) old.clearTimeout.call(window, handle); };
  try {
    await exercise({ intervals, timeouts,
      advance: milliseconds => act(async () => {
        now += milliseconds;
        for (const { callback } of [...intervals.values()]) callback();
        for (const [handle, timer] of [...timeouts]) {
          if (timer.at <= now) { timeouts.delete(handle); timer.callback(); }
        }
      }),
    });
  } finally {
    Date.now = old.now;
    window.setInterval = old.setInterval; window.clearInterval = old.clearInterval;
    window.setTimeout = old.setTimeout; window.clearTimeout = old.clearTimeout;
  }
}

export const WaitingAndAnnouncements = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(clock => withLobby(canvasElement, async view => {
    await step("A waiting seat persists credentials and advances elapsed time without navigating", async () => {
      await view.click("Find online");
      expect(view.lobby.searchState).toMatchObject({ matchID: "waiting-duel", playerID: "0", phase: "searching", createdNewPublicDuel: true });
      expect(view.lobby.searchElapsedSeconds).toBe(0);
      expect(view.lobby.isBusy).toBe(true);
      expect(localStorage.getItem("catana:lobby:credentials:waiting-duel:0")).toBe(view.requests[0].body.requestedCredentials);
      expect(readLastActiveMatch()).toMatchObject({ matchID: "waiting-duel", playerID: "0", playerName: "Ada" });
      expect(view.router.push).not.toHaveBeenCalled();
      await clock.advance(1000);
      expect(view.lobby.searchElapsedSeconds).toBe(1);
      expect(view.alerts.requestAnnouncement).not.toHaveBeenCalled();
      view.alerts.requestAnnouncement.mockRejectedValueOnce(new Error("alerts offline"));
      await clock.advance(1000);
      expect(view.alerts.requestAnnouncement).toHaveBeenCalledWith("waiting-duel");
      expect(view.lobby.searchState.phase).toBe("searching");
      expect(view.router.push).not.toHaveBeenCalled();
      await clock.advance(1000);
      expect(view.alerts.requestAnnouncement).toHaveBeenCalledOnce();
    });
    await step("A filled poll marks the board before navigation and clears pending announcements", async () => {
      view.api.respond = async () => ({ players: [{ id: 0, name: "Ada" }, { id: 1, name: "Bea" }] });
      await clock.advance(1500);
      expect(view.lobby.searchState.phase).toBe("matchFound");
      expect(view.events.slice(-2)).toEqual([["mark", "waiting-duel"], ["navigate", "/g/waiting-duel"]]);
      expect(clock.timeouts.size).toBe(0);
    });
  }))),
};

export const CommittedAndAmbiguousResults = {
  play: reportPlay(async ({ canvasElement, step }) => {
    for (const lostResponse of [false, true]) {
      await step(lostResponse ? "Recover a committed seat after a lost POST response" : "Enter an immediately filled seat", async () => withLobby(canvasElement, async view => {
        view.api.respond = async (_route, init) => {
          if (lostResponse && init.method === "POST") throw new TypeError("response lost after commit");
          return init.method === "DELETE" ? { status: "match_found", ...filledMatch } : filledMatch;
        };
        view.router.push.mockImplementation(href => {
          expect(localStorage.getItem("catana:lobby:credentials:filled-duel:1")).toBe("synthetic-assigned-seat");
          expect(readLastActiveMatch()).toMatchObject({ matchID: "filled-duel", playerID: "1", playerName: "Ada" });
          view.events.push(["navigate", href]);
        });
        await view.click("Find online");
        expect(view.events).toEqual([["mark", "filled-duel"], ["navigate", "/g/filled-duel"]]);
        expect(view.requests.map(request => request.method)).toEqual(lostResponse ? ["POST", "DELETE"] : ["POST"]);
        expect(view.requests[0]).toMatchObject({ route: "/api/matches/matchmake", body: { modeId: "duel" } });
        expect(view.requests[0].body.requestId).toMatch(/^[a-f0-9]{48}$/);
        if (lostResponse) expect(view.requests[1].body).toEqual(view.requests[0].body);
      }));
    }
    for (const outcome of ["network", "server-error", "unrecognized-response"]) {
      await step(`An uncertain ${outcome} outcome retains search state and blocks bot fallback`, async () => withLobby(canvasElement, async view => {
        view.api.respond = async () => {
          if (outcome === "network") throw new TypeError("offline");
          if (outcome === "server-error") return { ok: false, status: 503, statusText: "Unavailable", json: async () => ({ error: "temporarily unavailable" }) };
          return {};
        };
        await view.click("Find online");
        expect(view.lobby.searchState).not.toBeNull();
        expect(view.lobby.error).toContain("Still checking");
        await view.click("Play Puffer");
        expect(await view.actionResult).toEqual({ started: false, reason: "leave_failed" });
        expect(view.lobby.searchState).not.toBeNull();
        expect(view.lobby.isBusy).toBe(true);
        expect(view.lobby.error).toContain("Could not confirm");
        expect(view.requests.map(request => request.method)).toEqual(["POST", "DELETE", "DELETE"]);
        expect(view.requests.every(request => request.route === "/api/matches/matchmake")).toBe(true);
        expect(view.router.push).not.toHaveBeenCalled();
      }));
    }
  }),
};

export const CancellationRacesAndStorage = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(async clock => {
    await step("A late Cancel preserves a filled duel and suppresses duplicate cancellation", async () => withLobby(canvasElement, async view => {
      const cancellation = deferred();
      view.api.respond = async (_route, init, body) => init.method === "DELETE" ? cancellation.promise : waitingSeat(body);
      await view.click("Find online");
      const identity = view.requests[0].body;
      await view.click("Cancel search");
      expect(view.lobby.isSearchCancelPending).toBe(true);
      await view.click("Cancel search");
      expect(await view.actionResult).toBe(false);
      expect(view.requests.map(request => request.method)).toEqual(["POST", "DELETE"]);
      expect(view.requests[1].body).toEqual(identity);
      await view.settle(() => cancellation.resolve({ status: "match_found", ...filledMatch }));
      expect(view.lobby.isSearchCancelPending).toBe(false);
      expect(view.lobby.searchState).toMatchObject({ matchID: "filled-duel", playerID: "1", phase: "matchFound" });
      expect(readLastActiveMatch()).toMatchObject({ matchID: "filled-duel", playerID: "1" });
      expect(view.events.slice(-2)).toEqual([["mark", "filled-duel"], ["navigate", "/g/filled-duel"]]);
      expect(clock.timeouts.size).toBe(0);
    }));
    for (const saved of [{ matchID: "waiting-duel", playerID: "0" }, { matchID: "waiting-duel", playerID: "1" }, { matchID: "other-duel", playerID: "0" }]) {
      await step(`Confirmed release only clears its matching stored seat (${saved.matchID}/${saved.playerID})`, async () => withLobby(canvasElement, async view => {
        await view.click("Find online");
        writeLastActiveMatch(localStorage, saved);
        await view.click("Cancel search");
        expect(await view.actionResult).toBe(true);
        expect(view.lobby.searchState).toBeNull();
        expect(view.lobby.searchElapsedSeconds).toBe(0);
        expect(view.lobby.isSearchCancelPending).toBe(false);
        if (saved.matchID === "waiting-duel" && saved.playerID === "0") expect(readLastActiveMatch()).toBeNull();
        else expect(readLastActiveMatch()).toMatchObject(saved);
        expect(clock.timeouts.size).toBe(0);
        expect(view.router.push).not.toHaveBeenCalled();
      }));
    }
    await step("A stale POST and a poll completing after cancellation cannot restore or enter the search", async () => withLobby(canvasElement, async view => {
      const firstPost = deferred();
      const latePoll = deferred();
      let posts = 0;
      view.api.respond = async (_route, init, body) => {
        if (init.method === "POST") return ++posts === 1 ? firstPost.promise : waitingSeat(body);
        if (init.method === "DELETE") return { status: "cancelled" };
        return latePoll.promise;
      };
      await view.click("Find online");
      await view.click("Cancel search");
      await view.settle(() => firstPost.resolve(filledMatch));
      expect(view.lobby.searchState).toBeNull();
      expect(view.router.push).not.toHaveBeenCalled();
      await view.click("Find online");
      await clock.advance(1500);
      await view.click("Cancel search");
      await view.settle(() => latePoll.resolve({ players: [{ name: "Ada" }, { name: "Bea" }] }));
      expect(view.lobby.searchState).toBeNull();
      expect(view.router.push).not.toHaveBeenCalled();
    }));
  })),
};

export const ConfirmedPufferHandoff = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(clock => withLobby(canvasElement, async view => {
    await step("Puffer waits for confirmed cancellation and keeps the lobby busy until bot creation finishes", async () => {
      const cancellation = deferred();
      const bot = deferred();
      view.api.respond = async (route, init, body) => {
        if (route === "/api/matches/create") return bot.promise;
        return init.method === "DELETE" ? cancellation.promise : waitingSeat(body);
      };
      await view.click("Find online");
      await view.click("Play Puffer");
      expect(view.lobby.isPufferTransitionPending).toBe(true);
      expect(view.lobby.isBusy).toBe(true);
      expect(clock.timeouts.size).toBe(0);
      await view.click("Play Puffer");
      expect(await view.actionResult).toEqual({ started: false, reason: "pending" });
      expect(view.requests.map(request => request.method)).toEqual(["POST", "DELETE"]);
      await view.settle(() => cancellation.resolve({ status: "cancelled" }));
      expect(view.lobby.searchState).toBeNull();
      expect(view.lobby.isPufferTransitionPending).toBe(true);
      expect(view.lobby.isBusy).toBe(true);
      expect(view.requests[2]).toEqual({ route: "/api/matches/create", method: "POST", body: { modeId: "duel", opponentType: "bot", botKey: "puffer" } });
      await view.settle(() => bot.resolve({ matchID: "bot-duel", playerID: "0", playerCredentials: "synthetic-bot-seat" }));
      expect(view.lobby.isPufferTransitionPending).toBe(false);
      expect(view.lobby.isBusy).toBe(false);
      expect(view.requests).toHaveLength(3);
      expect(view.events.slice(-2)).toEqual([["mark", "bot-duel"], ["navigate", "/g/bot-duel"]]);
    });
  }))),
};

export const IdentityAndCleanup = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(async clock => {
    await step("Missing identity opens the entry flow without matchmaking", async () => withLobby(canvasElement, async view => {
      await view.click("Find online");
      expect(view.lobby.entryModal).toMatchObject({ open: true, mode: "play-username", intent: "online" });
      expect(view.requests).toEqual([]);
    }, { initialAccount: null }));
    await step("A failed account bootstrap clears search without sending a matchmaking mutation", async () => withLobby(canvasElement, async view => {
      view.api.restoreAccount = async () => { throw new TypeError("account service offline"); };
      await view.click("Find online");
      expect(view.lobby.error).toBe("Pick a username first.");
      expect(view.lobby.searchState).toBeNull();
      expect(view.lobby.activeActionId).toBeNull();
      expect(view.requests).toEqual([]);
    }, { initialAccount: { currentUsername: "Ada" } }));
    await step("Cancelling while identity resolves prevents a late bootstrap from starting a mutation", async () => withLobby(canvasElement, async view => {
      const pending = deferred();
      view.api.restoreAccount = async () => pending.promise;
      await view.click("Find online");
      await view.click("Cancel search");
      await view.settle(() => pending.resolve(account));
      expect(view.lobby.searchState).toBeNull();
      expect(view.requests).toEqual([]);
      expect(view.router.push).not.toHaveBeenCalled();
    }, { initialAccount: { currentUsername: "Ada" } }));
    await step("Successful sign-out invalidates an in-flight search and clears its announcement", async () => withLobby(canvasElement, async view => {
      const pending = deferred();
      view.api.respond = async () => pending.promise;
      await view.click("Find online");
      await view.click("Sign out");
      expect(view.lobby.account).toBeNull();
      expect(view.lobby.searchState).toBeNull();
      await view.settle(() => pending.resolve(filledMatch));
      expect(view.router.push).not.toHaveBeenCalled();
      expect(clock.timeouts.size).toBe(0);
    }));
    await step("Unmount clears elapsed, poll and announcement timers and ignores late POST/poll results", async () => {
      for (const waiting of [false, true]) {
        await withLobby(canvasElement, async view => {
          const pending = deferred();
          view.api.respond = async (_route, init, body) => init.method === "POST" && waiting ? waitingSeat(body) : pending.promise;
          await view.click("Find online");
          if (waiting) await clock.advance(1500);
          await view.unmount();
          expect(clock.intervals.size).toBe(0);
          expect(clock.timeouts.size).toBe(0);
          await view.settle(() => pending.resolve(waiting ? { players: [{ name: "Ada" }, { name: "Bea" }] } : filledMatch));
          expect(view.router.push).not.toHaveBeenCalled();
          expect(view.alerts.requestAnnouncement).not.toHaveBeenCalled();
        });
      }
    });
  })),
};

// Late DELETE replies must be inert across identity/lifetime and search ownership boundaries.
export const ObsoleteCancellationResults = {
  play: reportPlay(async ({ canvasElement, step }) => withClock(async clock => {
    for (const recovery of [true, false]) {
      for (const exit of ["sign-out", "unmount"]) {
        for (const outcome of ["filled", "released", "uncertain", "rejected"]) {
          await step(`${recovery ? "Lost POST recovery" : "Direct cancel"}: ${outcome} after ${exit}`, async () => withLobby(canvasElement, async view => {
            const pending = deferred();
            view.api.respond = async (_route, init, body) => {
              if (init.method === "DELETE") return pending.promise;
              if (recovery) throw new TypeError("lost POST response");
              return waitingSeat(body);
            };
            await view.click("Find online");
            if (!recovery) await view.click("Cancel search");
            const cancellation = view.actionResult;
            expect(view.requests.map(request => request.method)).toEqual(["POST", "DELETE"]);
            if (exit === "sign-out") {
              await view.click("Sign out");
              expect(view.lobby.activeActionId).toBeNull();
              expect(view.lobby.isBusy).toBe(false);
            } else await view.unmount();
            const storage = { ...localStorage };
            const error = view.lobby.error;
            await view.settle(() => outcome === "rejected" ? pending.reject(new TypeError("offline")) : pending.resolve(
              outcome === "filled" ? { status: "match_found", ...filledMatch } : outcome === "released" ? { status: "cancelled" } : {}
            ));
            if (!recovery) expect(await cancellation).toBe(false);
            expect({ ...localStorage }).toEqual(storage);
            expect(view.events).toEqual([]);
            expect(view.lobby.error).toBe(error);
            if (exit === "sign-out") {
              expect(view.lobby.searchState).toBeNull();
              expect(view.lobby.isSearchCancelPending).toBe(false);
              expect(view.lobby.activeActionId).toBeNull();
              expect(view.lobby.isBusy).toBe(false);
            }
            expect(clock.timeouts.size).toBe(0);
            expect(view.requests).toHaveLength(2);
          }));
        }
      }
    }
  })),
};

export const NewerSearchCancellationOwnership = {
  play: reportPlay(async ({ canvasElement, step }) => {
    for (const recovery of [false, true]) {
      for (const outcome of ["filled", "released", "uncertain", "rejected"]) {
        await step(`${recovery ? "Recovery" : "Direct cancel"} ${outcome} cannot overwrite a newer pending cancellation`, async () => withLobby(canvasElement, async view => {
          const old = deferred();
          const newer = deferred();
          let posts = 0;
          let deletes = 0;
          view.api.respond = async (_route, init, body) => {
            if (init.method === "DELETE") return ++deletes === 1 ? old.promise : newer.promise;
            posts += 1;
            if (recovery && posts === 1) throw new TypeError("lost POST");
            return { ...waitingSeat(body), matchID: posts === 1 ? "waiting-duel" : "newer-duel" };
          };
          await view.click("Find online");
          if (!recovery) await view.click("Cancel search");
          const oldCancellation = view.actionResult;
          await view.click("Find online");
          expect(view.lobby.searchState.matchID).toBe("newer-duel");
          expect(view.lobby.isSearchCancelPending).toBe(false);
          await view.click("Cancel search");
          const newCancellation = view.actionResult;
          expect(deletes).toBe(2);
          expect(view.requests[3].body).toEqual(view.requests[2].body);
          const storage = { ...localStorage };
          await view.settle(() => outcome === "rejected" ? old.reject(new TypeError("offline")) : old.resolve(
            outcome === "filled" ? { status: "match_found", ...filledMatch } : outcome === "released" ? { status: "cancelled" } : {}
          ));
          if (!recovery) expect(await oldCancellation).toBe(false);
          expect(view.lobby.searchState.matchID).toBe("newer-duel");
          expect(view.lobby.isSearchCancelPending).toBe(true);
          expect(view.lobby.error).toBe("");
          expect({ ...localStorage }).toEqual(storage);
          expect(view.events).toEqual([]);
          await view.settle(() => newer.resolve({}));
          expect(await newCancellation).toBe(false);
          expect(view.lobby.isSearchCancelPending).toBe(false);
          expect(view.lobby.error).toContain("Could not confirm");
          view.api.respond = async () => ({ status: "cancelled" });
          await view.click("Cancel search");
          expect(await view.actionResult).toBe(true);
          expect(view.lobby.searchState).toBeNull();
          expect(readLastActiveMatch()).toBeNull();
          expect(view.requests[4].body).toEqual(view.requests[2].body);
        }));
      }
    }
  }),
};

export const ObsoletePufferHandoff = {
  play: reportPlay(async ({ canvasElement, step }) => {
    for (const exit of ["sign-out", "unmount", "new-search"]) {
      await step(`A confirmed late release after ${exit} cannot start Puffer`, async () => withLobby(canvasElement, async view => {
        const pending = deferred();
        view.api.respond = async (_route, init, body) => init.method === "DELETE" ? pending.promise : waitingSeat(body);
        await view.click("Find online");
        await view.click("Play Puffer");
        const handoff = view.actionResult;
        if (exit === "sign-out") await view.click("Sign out");
        else if (exit === "unmount") await view.unmount();
        else await view.click("Find online");
        await view.settle(() => pending.resolve({ status: "cancelled" }));
        expect(await handoff).toEqual({ started: false, reason: "leave_failed" });
        expect(view.requests.some(request => request.route === "/api/matches/create")).toBe(false);
        expect(view.events).toEqual([]);
      }));
    }
    await step("A new search between cancellation and the Puffer continuation prevents fallback", async () => withLobby(canvasElement, async view => {
      // Queue both real actions in one React turn: cancel has no mutation yet,
      // but its resolved promise must not authorize a bot after a new search.
      await act(async () => {
        const handoff = view.lobby.actions.playPufferFromSearch();
        view.lobby.actions.playOnline();
        await handoff;
      });
      expect(view.requests.some(request => request.route === "/api/matches/create")).toBe(false);
      expect(view.lobby.searchState.matchID).toBe("waiting-duel");
    }));
  }),
};

export const ProductionLobby = {
  play: reportPlay(async ({ canvasElement }) => withLobby(canvasElement, async view => {
    const screen = within(canvasElement.ownerDocument.body);
    const online = await screen.findByRole("button", { name: /play online|find.*match|play.*human|online/i });
    await act(async () => online.click());
    expect(await screen.findByRole("button", { name: "Cancel", exact: true })).toBeVisible();
    expect(view.requests[0].route).toBe("/api/matches/matchmake");
    await act(async () => screen.getByRole("button", { name: "Cancel", exact: true }).click());
    expect(screen.queryByRole("button", { name: "Cancel", exact: true })).not.toBeInTheDocument();
    expect(view.requests.map(request => request.method)).toEqual(["POST", "DELETE"]);
  }, { home: true })),
};
