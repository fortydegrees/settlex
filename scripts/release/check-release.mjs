#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import {
  readReleaseNotesFile,
  readReleaseNotesFromGitRef
} from "./read-release-notes.mjs";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const requirePositiveInteger = (value, fieldName) => {
  assert(
    Number.isInteger(value) && value > 0,
    `${fieldName} must be a positive integer`
  );
};

const requireNonEmptyString = (value, fieldName) => {
  assert(
    typeof value === "string" && value.trim().length > 0,
    `${fieldName} must be a non-empty string`
  );
};

export function validateReleaseNotes(notes) {
  assert(notes && typeof notes === "object", "release notes must be an object");
  requirePositiveInteger(notes.currentVersion, "currentVersion");
  assert(Array.isArray(notes.releases), "releases must be an array");
  assert(notes.releases.length > 0, "releases must include at least one release");

  const seenVersions = new Set();

  notes.releases.forEach((release, index) => {
    assert(
      release && typeof release === "object",
      `releases[${index}] must be an object`
    );
    requirePositiveInteger(release.version, `releases[${index}].version`);
    assert(
      !seenVersions.has(release.version),
      `release version ${release.version} appears more than once`
    );
    seenVersions.add(release.version);

    requireNonEmptyString(release.date, `releases[${index}].date`);
    assert(
      datePattern.test(release.date),
      `releases[${index}].date must use YYYY-MM-DD`
    );
    requireNonEmptyString(release.title, `releases[${index}].title`);
    assert(
      Array.isArray(release.highlights),
      `releases[${index}].highlights must be an array`
    );
    assert(
      release.highlights.some(
        (highlight) => typeof highlight === "string" && highlight.trim()
      ),
      `release v${release.version} must include at least one highlight`
    );
    release.highlights.forEach((highlight, highlightIndex) => {
      requireNonEmptyString(
        highlight,
        `releases[${index}].highlights[${highlightIndex}]`
      );
    });
  });

  const currentRelease = notes.releases.find(
    (release) => release.version === notes.currentVersion
  );
  assert(
    currentRelease,
    `currentVersion ${notes.currentVersion} must have a matching release entry`
  );
  assert(
    notes.releases[0].version === notes.currentVersion,
    "the current release must be the first release entry"
  );

  return {
    currentVersion: notes.currentVersion,
    currentRelease
  };
}

export function validateReleaseVersionBump(currentNotes, previousNotes) {
  const current = validateReleaseNotes(currentNotes);
  if (!previousNotes) return current;

  const previous = validateReleaseNotes(previousNotes);
  assert(
    current.currentVersion > previous.currentVersion,
    `currentVersion must increase from ${previous.currentVersion} before production deploy`
  );

  return current;
}

export function validateReleaseApproval(notes) {
  const current = validateReleaseNotes(notes);
  assert(
    current.currentRelease.approved === true,
    `release v${current.currentVersion} must be approved before production deploy`
  );

  return current;
}

const getArgValue = (args, name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

export function runReleaseCheck(args = process.argv.slice(2)) {
  const notes = validateReleaseNotes(readReleaseNotesFile());
  const bumpRef = getArgValue(args, "--require-bump-from");
  const requireApproved = args.includes("--require-approved");

  if (requireApproved) {
    validateReleaseApproval(readReleaseNotesFile());
  }

  if (bumpRef) {
    validateReleaseVersionBump(
      readReleaseNotesFile(),
      readReleaseNotesFromGitRef(bumpRef)
    );
  }

  return notes;
}

const isCli = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCli) {
  try {
    const result = runReleaseCheck();
    process.stdout.write(`Release notes OK: v${result.currentVersion}\n`);
  } catch (error) {
    process.stderr.write(`Release notes check failed: ${error.message}\n`);
    process.exit(1);
  }
}
