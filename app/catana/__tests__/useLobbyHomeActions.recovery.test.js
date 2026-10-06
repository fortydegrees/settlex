import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useLobbyHomeActions } from "../lobby/useLobbyHomeActions.js";
import { readLastActiveMatch } from "../utils/activeMatchStorage.js";

const harness = vi.hoisted(() => ({ pending: [], push: vi.fn() }));
// The public action is fire-and-forget. Observe its promises so failures are
// asserted by the test rather than escaping as unhandled rejections.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal();
  return {
    ...react,
    useCallback: (callback, deps) => react.useCallback((...args) => {
      const result = callback(...args);
      if (result instanceof Promise) harness.pending.push(Promise.allSettled([result]));
      return result;
    }, deps),
  };
});
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: harness.push }) }));
vi.mock("../matchAlerts/useMatchAlerts.js", () => ({ useMatchAlerts: () => ({}) }));

afterEach(() => {
  vi.unstubAllGlobals();
  harness.pending.length = 0;
  harness.push.mockClear();
});

it("recovers a committed match after a lost POST response, persisting its seat before navigation", async () => {
  const values = new Map();
  const storage = {
    setItem: (key, value) => values.set(key, value),
    getItem: (key) => values.get(key) ?? null,
  };
  vi.stubGlobal("window", { localStorage: storage });
  const requests = [];
  vi.stubGlobal("fetch", async (route, init) => {
    requests.push({ route, method: init.method, body: JSON.parse(init.body) });
    if (init.method === "POST") throw new TypeError("Response lost after commit");
    return new Response(JSON.stringify({
      status: "match_found", matchID: "recovered-duel", playerID: "1",
      playerCredentials: "recovered-secret",
    }));
  });
  const marked = [];
  let actions;
  function Probe() {
    ({ actions } = useLobbyHomeActions({
      initialAccount: { id: "acct_recovery", currentUsername: "Ada" },
      onGameStartTransition: (matchID) => marked.push(matchID),
    }));
    return null;
  }
  renderToString(React.createElement(Probe));
  harness.push.mockImplementation((href) => {
    expect(storage.getItem("catana:lobby:credentials:recovered-duel:1")).toBe("recovered-secret");
    expect(readLastActiveMatch(storage)).toMatchObject({
      matchID: "recovered-duel", playerID: "1", playerName: "Ada",
    });
    expect(href).toBe("/g/recovered-duel");
  });
  actions.playOnline();
  const results = (await Promise.all(harness.pending)).flat();
  expect(results.filter((result) => result.status === "rejected")).toEqual([]);
  expect(requests.map(({ route, method }) => [route, method])).toEqual([
    ["/api/matches/matchmake", "POST"], ["/api/matches/matchmake", "DELETE"],
  ]);
  expect(requests[1].body).toEqual(requests[0].body);
  expect(marked).toEqual(["recovered-duel"]);
  expect(harness.push).toHaveBeenCalledOnce();
});
