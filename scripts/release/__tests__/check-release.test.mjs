import { describe, expect, it } from "vitest";

import {
  validateReleaseApproval,
  validateReleaseNotes,
  validateReleaseVersionBump
} from "../check-release.mjs";
import { readReleaseNotesFile } from "../read-release-notes.mjs";

const validNotes = {
  currentVersion: 2,
  releases: [
    {
      version: 2,
      date: "2026-06-01",
      title: "Release visibility",
      approved: true,
      highlights: [
        "Added a homepage release badge.",
        "Prepared approved release notes for production deploys."
      ]
    },
    {
      version: 1,
      date: "2026-05-31",
      title: "Mobile shell polish",
      approved: true,
      highlights: ["Improved the mobile game shell."]
    }
  ]
};

describe("release note validation", () => {
  it("accepts a current release with user-facing highlights", () => {
    const result = validateReleaseNotes(validNotes);

    expect(result.currentVersion).toBe(2);
    expect(result.currentRelease.title).toBe("Release visibility");
    expect(result.currentRelease.highlights).toHaveLength(2);
  });

  it("rejects a current release without readable highlights", () => {
    expect(() =>
      validateReleaseNotes({
        currentVersion: 2,
        releases: [
          {
            version: 2,
            date: "2026-06-01",
            title: "Empty release",
            highlights: []
          }
        ]
      })
    ).toThrow(/at least one highlight/);
  });

  it("requires the current release notes to be approved before production deploy", () => {
    expect(() => validateReleaseApproval(validNotes)).not.toThrow();

    expect(() =>
      validateReleaseApproval({
        currentVersion: 2,
        releases: [
          {
            version: 2,
            date: "2026-06-01",
            title: "Release visibility",
            approved: false,
            highlights: ["Drafted release notes for user review."]
          },
          {
            version: 1,
            date: "2026-05-31",
            title: "Mobile shell polish",
            approved: true,
            highlights: ["Improved the mobile game shell."]
          }
        ]
      })
    ).toThrow(/approved before production deploy/);
  });

  it("requires a production release version bump from the previous deployed ref", () => {
    expect(() =>
      validateReleaseVersionBump(validNotes, {
        currentVersion: 1,
        releases: [
          {
            version: 1,
            date: "2026-05-31",
            title: "Mobile shell polish",
            approved: true,
            highlights: ["Improved the mobile game shell."]
          }
        ]
      })
    ).not.toThrow();

    expect(() =>
      validateReleaseVersionBump(
        {
          currentVersion: 1,
          releases: [
            {
              version: 1,
              date: "2026-05-31",
              title: "Mobile shell polish",
              approved: true,
              highlights: ["Improved the mobile game shell."]
            }
          ]
        },
        {
          currentVersion: 1,
          releases: [
            {
              version: 1,
              date: "2026-05-31",
              title: "Mobile shell polish",
              approved: true,
              highlights: ["Improved the mobile game shell."]
            }
          ]
        }
      )
    ).toThrow(/currentVersion must increase/);
  });

  it("reads the tracked release note file by default", () => {
    const notes = readReleaseNotesFile();

    expect(notes.currentVersion).toBeGreaterThanOrEqual(1);
    expect(notes.releases[0].version).toBe(notes.currentVersion);
  });
});
