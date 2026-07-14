import { describe, expect, it } from "vitest";

import { getMatchAlertDisplayState } from "../matchAlertState.js";

const supported = (permission = "granted") => ({
  supported: true,
  permission,
  reason: permission === "denied" ? "blocked" : null,
});

const displayState = (overrides = {}) =>
  getMatchAlertDisplayState({
    configured: true,
    capability: supported(),
    preference: { enabled: false, state: "off" },
    hasSubscription: false,
    enableAttempted: false,
    ...overrides,
  });

describe("getMatchAlertDisplayState", () => {
  it("shows a normal Enable action before iOS installation guidance is requested", () => {
    expect(
      displayState({
        capability: { supported: false, reason: "install_required" },
      })
    ).toMatchObject({
      status: "off",
      label: "Get match alerts",
      action: "enable",
      actionLabel: "Enable",
    });
  });

  it("reveals Home Screen guidance after the first iOS enable attempt", () => {
    expect(
      displayState({
        capability: { supported: false, reason: "install_required" },
        enableAttempted: true,
      })
    ).toMatchObject({
      status: "install_required",
      label: "Add SettleHex to your Home Screen",
      action: null,
    });
  });

  it("maps an active subscription to Disable", () => {
    expect(
      displayState({
        preference: { enabled: true, state: "active" },
        hasSubscription: true,
      })
    ).toMatchObject({
      status: "active",
      label: "Match alerts on",
      action: "disable",
      actionLabel: "Disable",
    });
  });

  it("does not offer an in-game resume action while paused", () => {
    expect(
      displayState({
        preference: {
          enabled: true,
          state: "paused",
          pausedReason: "human_game",
        },
        hasSubscription: true,
      })
    ).toMatchObject({
      status: "paused",
      label: "Match alerts paused during your game",
      action: null,
    });
  });

  it("maps off and default preferences to Enable", () => {
    expect(displayState()).toMatchObject({
      status: "off",
      label: "Get match alerts",
      action: "enable",
      actionLabel: "Enable",
    });
  });

  it("offers Enable when the account is on but this browser is detached", () => {
    expect(
      displayState({
        preference: { enabled: true, state: "active" },
        hasSubscription: false,
      })
    ).toMatchObject({
      status: "off",
      label: "Get match alerts",
      action: "enable",
    });
  });

  it("explains blocked browser permission without a broken CTA", () => {
    expect(
      displayState({ capability: supported("denied") })
    ).toMatchObject({
      status: "blocked",
      label: "Notifications blocked in browser settings",
      action: null,
    });
  });

  it("explains unsupported browsers without a CTA", () => {
    expect(
      displayState({ capability: { supported: false, reason: "unsupported" } })
    ).toMatchObject({
      status: "unsupported",
      label: "Match alerts are not supported in this browser",
      action: null,
    });
  });

  it("explains unconfigured servers without a CTA", () => {
    expect(displayState({ configured: false })).toMatchObject({
      status: "unconfigured",
      label: "Match alerts are unavailable",
      action: null,
    });
  });
});
