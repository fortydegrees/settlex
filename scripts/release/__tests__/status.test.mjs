import { describe, expect, it } from "vitest";

import {
  buildRequiredChecks,
  formatReleaseStatus,
  getReleaseStatus,
  hasDeploymentInfraChanged,
  hasReleaseNotesChanged
} from "../status.mjs";

const approvedRelease1 = {
  currentVersion: 1,
  releases: [
    {
      version: 1,
      date: "2026-06-02",
      title: "Initial MVP Launch",
      approved: true,
      highlights: ["Initial MVP launch."]
    }
  ]
};

const approvedRelease2 = {
  currentVersion: 2,
  releases: [
    {
      version: 2,
      date: "2026-06-03",
      title: "Better matching",
      approved: true,
      highlights: ["Improved matchmaking feedback."]
    },
    ...approvedRelease1.releases
  ]
};

describe("release status", () => {
  it("detects release-note and deployment-infra changes", () => {
    expect(hasReleaseNotesChanged(["release/release-notes.json"])).toBe(true);
    expect(hasReleaseNotesChanged(["app/catana/lobby/VersionBadge.js"])).toBe(
      false
    );

    expect(hasDeploymentInfraChanged(["Dockerfile.web"])).toBe(true);
    expect(hasDeploymentInfraChanged(["app/catana/lobby/VersionBadge.js"])).toBe(
      false
    );
  });

  it("requires a version bump only when the release note file changed", () => {
    const sameReleaseInfraFix = getReleaseStatus({
      currentNotes: approvedRelease1,
      previousNotes: approvedRelease1,
      changedPaths: ["infra/scripts/deploy-prod.sh"]
    });

    expect(sameReleaseInfraFix.ok).toBe(true);
    expect(sameReleaseInfraFix.releaseNotesChanged).toBe(false);
    expect(sameReleaseInfraFix.deploymentInfraChanged).toBe(true);

    const unchangedVersionWithReleaseNotesChange = getReleaseStatus({
      currentNotes: approvedRelease1,
      previousNotes: approvedRelease1,
      changedPaths: ["release/release-notes.json"]
    });

    expect(unchangedVersionWithReleaseNotesChange.ok).toBe(false);
    expect(unchangedVersionWithReleaseNotesChange.problems.join(" ")).toMatch(
      /currentVersion must increase/
    );

    const bumpedRelease = getReleaseStatus({
      currentNotes: approvedRelease2,
      previousNotes: approvedRelease1,
      changedPaths: ["release/release-notes.json"]
    });

    expect(bumpedRelease.ok).toBe(true);
  });

  it("reports approval failures", () => {
    const status = getReleaseStatus({
      currentNotes: {
        currentVersion: 2,
        releases: [
          {
            version: 2,
            date: "2026-06-03",
            title: "Draft",
            approved: false,
            highlights: ["Draft release notes."]
          }
        ]
      },
      previousNotes: approvedRelease1,
      changedPaths: ["release/release-notes.json"]
    });

    expect(status.ok).toBe(false);
    expect(status.problems.join(" ")).toMatch(/approved before production deploy/);
  });

  it("lists focused deploy checks when deployment infra changed", () => {
    const checks = buildRequiredChecks({
      baseRef: "origin/main",
      releaseNotesChanged: false,
      deploymentInfraChanged: true
    });

    expect(checks).toContain("pnpm release:check -- --require-approved");
    expect(checks).toContain("pnpm verify");
    expect(checks).toContain("bash -n infra/scripts/deploy-prod.sh");
    expect(checks).toContain("docker build -f Dockerfile.web .");
    expect(checks).toContain("docker build -f Dockerfile.game .");
    expect(checks).not.toContain(
      "pnpm release:check -- --require-bump-from origin/main"
    );
  });

  it("formats a concise release readiness summary", () => {
    const status = getReleaseStatus({
      baseRef: "origin/main",
      currentNotes: approvedRelease1,
      previousNotes: approvedRelease1,
      changedPaths: ["infra/scripts/deploy-prod.sh"]
    });

    const formatted = formatReleaseStatus(status);

    expect(formatted).toContain("Release: r1 approved");
    expect(formatted).toContain("Title: Initial MVP Launch");
    expect(formatted).toContain("Deploy infra changed: yes");
    expect(formatted).toContain("Release gate: ready");
    expect(formatted).toContain("Required checks:");
  });
});
