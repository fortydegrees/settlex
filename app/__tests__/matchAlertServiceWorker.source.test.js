import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (path) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("match-alert service worker", () => {
  it("always presents valid pushes as operating-system notifications", () => {
    const source = readSource("public/match-alerts-sw.js");

    expect(source).toMatch(/addEventListener\(["']push["']/);
    expect(source).toContain("registration.showNotification");
    expect(source).toContain('icon: "/match-alert-bell.svg"');
    expect(source).toContain('badge: "/match-alert-bell.svg"');
    expect(source).toContain("body:");
    expect(source).toContain("tag:");
    expect(source).toContain("type:");
    expect(source).toContain("matchID:");
    expect(source).toContain("url:");
    expect(source).not.toMatch(/visibilityState|hasFocus/);
  });

  it("focuses and messages an existing client before opening a new window", () => {
    const source = readSource("public/match-alerts-sw.js");

    expect(source).toMatch(/addEventListener\(["']notificationclick["']/);
    expect(source).toContain("notification.close()");
    expect(source).toContain("clients.matchAll");
    expect(source).toContain('type: "window"');
    expect(source).toContain("includeUncontrolled: true");
    expect(source).toContain("client.focus");
    expect(source).toContain("client.postMessage");
    expect(source).toContain('type: "match-alert-click"');
    expect(source).toContain("clients.openWindow");
    expect(source.indexOf("client.postMessage")).toBeLessThan(
      source.indexOf("clients.openWindow")
    );
  });

  it("also tells open tabs when a push arrives without focusing them", () => {
    const source = readSource("public/match-alerts-sw.js");
    const pushHandler = source.slice(
      source.indexOf('addEventListener("push"'),
      source.indexOf('addEventListener("notificationclick"')
    );

    expect(pushHandler).toMatch(/clients\s*\.\s*matchAll/);
    expect(pushHandler).toContain('type: "window"');
    expect(pushHandler).toContain("includeUncontrolled: true");
    expect(pushHandler).toContain("client.postMessage");
    expect(pushHandler).toContain('type: "match-alert-received"');
    expect(pushHandler).not.toContain("client.focus");
  });

  it("defines a static high-contrast bell asset", () => {
    const source = readSource("public/match-alert-bell.svg");

    expect(source).toContain("<svg");
    expect(source).toMatch(/<path|<circle/);
    expect(source).not.toMatch(/<animate|<script/);
  });
});
