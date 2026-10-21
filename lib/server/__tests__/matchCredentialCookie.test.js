import { describe, expect, it, vi } from "vitest";
const { requestCookies } = vi.hoisted(() => ({ requestCookies: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: requestCookies }));
import { getMatchCredentialCookieName, readMatchCredentialCookie } from "../session/matchCredentialCookie.js";

describe("match credentials from async request cookies", () => {
  it.each(["request", "injected"])("retains the matching seat credential from an async %s store", async (source) => {
    const store = new Map([[getMatchCredentialCookieName({ matchID: "m1", playerID: "1" }), { value: "seat-one-secret" }]]);
    requestCookies.mockResolvedValue(store);
    const cookieStore = source === "injected" ? Promise.resolve(store) : undefined;
    expect(await readMatchCredentialCookie({ matchID: "m1", playerID: "1", cookieStore })).toBe("seat-one-secret");
    expect(await readMatchCredentialCookie({ matchID: "m1", playerID: "0", cookieStore })).toBeNull();
  });
});
