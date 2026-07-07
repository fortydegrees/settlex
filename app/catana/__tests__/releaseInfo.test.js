import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildPublicReleaseInfo } from "../lobby/releaseInfo";

const releaseNotes = {
  currentVersion: 7,
  releases: [
    {
      version: 7,
      date: "2026-06-01",
      title: "Visible versions",
      highlights: ["Shows which production version is running."]
    }
  ]
};

describe("buildPublicReleaseInfo", () => {
  it("combines approved release notes with build metadata", () => {
    const info = buildPublicReleaseInfo({
      releaseNotes,
      env: {
        NEXT_PUBLIC_SETTLEX_BUILD_SHA: "abcdef1234567890",
        NEXT_PUBLIC_SETTLEX_BUILD_DATE: "2026-06-01T14:30:00Z"
      }
    });

    expect(info.version).toBe(7);
    expect(info.releaseLabel).toBe("release 7");
    expect(info.title).toBe("Visible versions");
    expect(info.highlights).toEqual([
      "Shows which production version is running."
    ]);
    expect(info.buildShaShort).toBe("abcdef1");
    expect(info.buildDate).toBe("2026-06-01T14:30:00Z");
  });

  it("falls back to local build labels when deploy metadata is unavailable", () => {
    const info = buildPublicReleaseInfo({ releaseNotes, env: {} });

    expect(info.releaseLabel).toBe("release 7");
    expect(info.buildShaShort).toBe("local");
    expect(info.buildDate).toBe("");
  });

  it("uses a public release label without changing the internal version", () => {
    const info = buildPublicReleaseInfo({
      releaseNotes: {
        currentVersion: 7,
        releases: [
          {
            version: 7,
            label: "release 0.8",
            title: "Beta version",
            highlights: ["beta version! please report any bugs you find!"]
          }
        ]
      },
      env: {}
    });

    expect(info.version).toBe(7);
    expect(info.releaseLabel).toBe("release 0.8");
    expect(info.title).toBe("Beta version");
    expect(info.highlights).toEqual([
      "beta version! please report any bugs you find!"
    ]);
  });

  it("reads public build metadata through direct env keys for client bundling", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "app/catana/lobby/releaseInfo.js"),
      "utf8"
    );

    expect(source).toContain("process.env.NEXT_PUBLIC_SETTLEX_RELEASE_VERSION");
    expect(source).toContain("process.env.NEXT_PUBLIC_SETTLEX_BUILD_SHA");
    expect(source).toContain("process.env.NEXT_PUBLIC_SETTLEX_BUILD_DATE");
    expect(source).not.toContain("env = process.env");
  });
});
