import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("match-alert app shell", () => {
  it("wraps app content in MatchAlertProvider without moving server metadata", () => {
    const source = readSource("app/layout.js");

    expect(source).toContain("MatchAlertProvider");
    expect(source).toContain("<MatchAlertProvider>");
    expect(source).toContain("</MatchAlertProvider>");
    expect(source.indexOf("<MatchAlertProvider>")).toBeLessThan(
      source.indexOf("{children}")
    );
    expect(source.indexOf("{children}")).toBeLessThan(
      source.indexOf("</MatchAlertProvider>")
    );
    expect(source).toContain("export const metadata");
  });

  it("provides the Home Screen manifest required by iOS Web Push", () => {
    const source = readSource("app/manifest.js");

    expect(source).toContain('id: "/"');
    expect(source).toContain('start_url: "/"');
    expect(source).toContain('display: "standalone"');
    expect(source).toContain("background_color:");
    expect(source).toContain("theme_color:");
    expect(source).toContain('src: "/match-alert-bell.svg"');
    expect(source).toContain('sizes: "any"');
    expect(source).toContain('type: "image/svg+xml"');
  });

  it("exposes all provider actions through the tested browser-action module", () => {
    const provider = readSource(
      "app/catana/matchAlerts/MatchAlertProvider.js"
    );
    const actions = readSource(
      "app/catana/matchAlerts/matchAlertProviderActions.js"
    );
    const hook = readSource("app/catana/matchAlerts/useMatchAlerts.js");

    for (const action of [
      "refresh",
      "enable",
      "disable",
      "resume",
      "detachCurrentBrowser",
      "completeMatchAlertSignOut",
      "requestAnnouncement",
    ]) {
      expect(provider).toContain(action);
    }
    expect(provider).toContain("createLatestRefreshGuard");
    expect(provider).toContain("runEnableTransaction");
    expect(provider).toContain("detachMatchAlertBrowser");
    expect(provider).toContain("requestMatchAnnouncement");
    expect(provider).not.toContain("requestPermission");
    expect(actions).toContain('fetchImpl("/api/match-alerts/announce"');
    expect(actions).toContain('announced: false, reason: "request_failed"');
    expect(hook).toContain("useContext");
    expect(hook).toContain("MatchAlertContext");
  });
});
