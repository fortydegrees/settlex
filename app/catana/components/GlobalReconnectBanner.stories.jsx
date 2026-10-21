import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { expect, within } from "@storybook/test";
import { GlobalReconnectBanner } from "./GlobalReconnectBanner";
import { ACTIVE_MATCH_STORAGE_KEY } from "../utils/activeMatchStorage";

const meta = {
  title: "Game State/Recovery/Reconnect Banner",
  parameters: { controls: { disable: true } },
  render: () => <>
    <div data-testid="reconnect-root" />
    <output role="status" data-testid="recovery-result">Waiting for recovery assertions</output>
  </>,
};
export default meta;

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const response = (name = "Alice") => ({ ok: true, json: async () => ({ players: [{ id: 0, name }] }) });
const report = exercise => async ({ canvasElement }) => {
  const status = within(canvasElement).getByTestId("recovery-result");
  status.textContent = "Running recovery assertions";
  try {
    await exercise(canvasElement);
    status.textContent = "All recovery assertions passed";
  } catch (error) {
    status.textContent = `Recovery assertion failed: ${error.message}`;
    throw error;
  }
};

// Real React effects, Next router/path contexts, storage helper, fetch resolver
// and portal banner. Only external storage/network/navigation are controlled.
async function withBanner(canvasElement, exercise, { denyStorageAccess = false, denyCredentialRead = false } = {}) {
  const root = createRoot(within(canvasElement).getByTestId("reconnect-root"));
  const originalFetch = window.fetch;
  const storageDescriptor = Object.getOwnPropertyDescriptor(window, "localStorage");
  const originalAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const records = new Map();
  const requests = [];
  const navigations = [];
  let mounted = true;
  const storage = {
    getItem: key => {
      if (denyCredentialRead && key.startsWith("catana:lobby:credentials:")) throw new Error("credential storage denied");
      return records.get(key) ?? null;
    },
    setItem: (key, value) => records.set(key, value),
    removeItem: key => records.delete(key),
  };
  const seed = (matchID, playerName) => {
    records.set(ACTIVE_MATCH_STORAGE_KEY, JSON.stringify({ matchID, playerID: "0", playerName }));
    records.set(`catana:lobby:credentials:${matchID}:0`, "synthetic-local-seat");
  };
  seed("m1", "Alice");
  Object.defineProperty(window, "localStorage", { configurable: true, get: () => {
    if (denyStorageAccess) throw new Error("localStorage unavailable");
    return storage;
  } });
  window.fetch = (url, options) => {
    const pending = deferred();
    requests.push({ url, options, ...pending });
    return pending.promise;
  };
  const router = { push: href => navigations.push(href), replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} };
  const view = {
    requests, navigations, records, seed,
    screen: within(canvasElement.ownerDocument.body),
    render: (pathname = "/") => act(async () => root.render(
      <AppRouterContext.Provider value={router}>
        <PathnameContext.Provider value={pathname}><GlobalReconnectBanner /></PathnameContext.Provider>
      </AppRouterContext.Provider>
    )),
    settle: (index, value) => act(async () => requests[index].resolve(value)),
    click: name => act(async () => within(canvasElement.ownerDocument.body).getByRole("button", { name }).click()),
    unmount: async () => { if (!mounted) return; await act(async () => root.unmount()); mounted = false; },
  };
  try { await exercise(view); }
  finally {
    try { await view.unmount(); }
    finally {
      window.fetch = originalFetch;
      if (storageDescriptor) Object.defineProperty(window, "localStorage", storageDescriptor);
      else delete window.localStorage;
      globalThis.IS_REACT_ACT_ENVIRONMENT = originalAct;
    }
  }
}

export const DeniedLocalStorageAccess = {
  play: report(canvas => withBanner(canvas, async view => {
    const saved = view.records.get(ACTIVE_MATCH_STORAGE_KEY);
    await view.render();
    expect(view.screen.queryByRole("button", { name: "Rejoin match" })).not.toBeInTheDocument();
    expect(view.records.get(ACTIVE_MATCH_STORAGE_KEY)).toBe(saved);
    expect(view.requests).toHaveLength(0);
  }, { denyStorageAccess: true })),
};
export const DeniedCredentialRead = {
  play: report(canvas => withBanner(canvas, async view => {
    const saved = view.records.get(ACTIVE_MATCH_STORAGE_KEY);
    await view.render();
    expect(view.screen.queryByRole("button", { name: "Rejoin match" })).not.toBeInTheDocument();
    expect(view.records.get(ACTIVE_MATCH_STORAGE_KEY)).toBe(saved);
    expect(view.requests).toHaveLength(0);
  }, { denyCredentialRead: true })),
};
export const RejoinAndDismiss = {
  play: report(canvas => withBanner(canvas, async view => {
    await view.render();
    expect(view.requests).toHaveLength(1);
    expect(view.requests[0].url).toBe("/api/matches/m1");
    await view.settle(0, response());
    expect(view.screen.getByText("You're already in a game")).toBeVisible();
    expect(view.screen.getByText("Return to your latest match as Alice.")).toBeVisible();
    await view.click("Rejoin match");
    expect(view.navigations).toEqual(["/g/m1"]);
    await view.click("Dismiss");
    await view.render("/account");
    expect(view.screen.queryByRole("button", { name: "Rejoin match" })).not.toBeInTheDocument();
    expect(view.requests).toHaveLength(1);
    expect(view.records.has(ACTIVE_MATCH_STORAGE_KEY)).toBe(true);
  })),
};
export const LateResponseAfterPathChange = {
  play: report(canvas => withBanner(canvas, async view => {
    await view.render();
    view.seed("m2", "Bren");
    await view.render("/account");
    expect(view.requests).toHaveLength(2);
    await view.settle(1, response("Bren"));
    await view.settle(0, response("Alice"));
    expect(view.screen.getByText("Return to your latest match as Bren.")).toBeVisible();
    expect(view.screen.queryByText("Return to your latest match as Alice.")).not.toBeInTheDocument();
    await view.click("Rejoin match");
    expect(view.navigations).toEqual(["/g/m2"]);
  })),
};
export const ActiveRouteAndUnmount = {
  play: report(canvas => withBanner(canvas, async view => {
    await view.render();
    await view.render("/g/m1");
    await view.settle(0, response());
    expect(view.screen.queryByRole("button", { name: "Rejoin match" })).not.toBeInTheDocument();
    await view.render("/account");
    expect(view.requests).toHaveLength(2);
    await view.unmount();
    await view.settle(1, response());
    expect(view.screen.queryByRole("button", { name: "Rejoin match" })).not.toBeInTheDocument();
    expect(view.records.has(ACTIVE_MATCH_STORAGE_KEY)).toBe(true);
  })),
};
