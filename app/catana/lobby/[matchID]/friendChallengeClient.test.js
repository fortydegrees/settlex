import { describe, expect, it, vi } from "vitest";
import * as friendChallengeClient from "./friendChallengeClient";

describe("friend challenge guest identity provisioning", () => {
  it("awaits anonymous session establishment before writing the guest profile", async () => {
    expect(
      friendChallengeClient.provisionFriendChallengeGuestIdentity
    ).toBeTypeOf("function");

    const order = [];
    let finishSession;
    const ensureAnonymousSession = vi.fn(
      () =>
        new Promise((resolve) => {
          finishSession = () => {
            order.push("session");
            resolve();
          };
        })
    );
    const upsertGuestIdentity = vi.fn(async () => {
      order.push("profile");
      return { account: { currentUsername: "BoldTraderYM" } };
    });

    const provision =
      friendChallengeClient.provisionFriendChallengeGuestIdentity({
        ensureAnonymousSession,
        upsertGuestIdentity,
      });
    expect(upsertGuestIdentity).not.toHaveBeenCalled();

    finishSession();
    await expect(provision).resolves.toEqual({
      account: { currentUsername: "BoldTraderYM" },
    });
    expect(order).toEqual(["session", "profile"]);
  });

  it("does not write a guest profile when anonymous session establishment fails", async () => {
    const upsertGuestIdentity = vi.fn();

    await expect(
      friendChallengeClient.provisionFriendChallengeGuestIdentity({
        ensureAnonymousSession: vi
          .fn()
          .mockRejectedValue(new Error("Session unavailable")),
        upsertGuestIdentity,
      })
    ).rejects.toThrow("Session unavailable");
    expect(upsertGuestIdentity).not.toHaveBeenCalled();
  });
});
