#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  validateReleaseApproval,
  validateReleaseNotes,
  validateReleaseVersionBump
} from "./check-release.mjs";
import {
  readReleaseNotesFile,
  readReleaseNotesFromGitRef,
  releaseNotesRelativePath,
  repoRoot
} from "./read-release-notes.mjs";

const deploymentInfraPaths = new Set([
  ".github/workflows/deploy-prod.yml",
  "Dockerfile.game",
  "Dockerfile.web",
  "infra/docker-compose.prod.yml",
  "infra/scripts/deploy-prod.sh",
  "package.json",
  "pnpm-lock.yaml"
]);

const normalizePath = (filePath) => String(filePath).replaceAll("\\", "/");

export function hasReleaseNotesChanged(
  changedPaths,
  releasePath = releaseNotesRelativePath
) {
  const normalizedReleasePath = normalizePath(releasePath);
  return changedPaths.some(
    (filePath) => normalizePath(filePath) === normalizedReleasePath
  );
}

export function hasDeploymentInfraChanged(changedPaths) {
  return changedPaths.some((filePath) =>
    deploymentInfraPaths.has(normalizePath(filePath))
  );
}

export function getChangedPaths(baseRef = "origin/main") {
  try {
    const trackedOutput = execFileSync("git", ["diff", "--name-only", baseRef, "--"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    const untrackedOutput = execFileSync(
      "git",
      ["ls-files", "--others", "--exclude-standard"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    return [
      ...new Set(
        `${trackedOutput}\n${untrackedOutput}`.split(/\r?\n/).filter(Boolean)
      )
    ];
  } catch {
    return [];
  }
}

export function buildRequiredChecks({
  baseRef,
  releaseNotesChanged,
  deploymentInfraChanged
}) {
  const checks = ["pnpm release:check -- --require-approved", "pnpm verify"];

  if (releaseNotesChanged) {
    checks.splice(1, 0, `pnpm release:check -- --require-bump-from ${baseRef}`);
  }

  if (deploymentInfraChanged) {
    checks.push(
      "pnpm exec vitest run server/__tests__/deploymentFiles.source.test.js --reporter=dot",
      "bash -n infra/scripts/deploy-prod.sh",
      "docker build -f Dockerfile.web .",
      "docker build -f Dockerfile.game ."
    );
  }

  return checks;
}

export function getReleaseStatus({
  baseRef = "origin/main",
  changedPaths = getChangedPaths(baseRef),
  currentNotes = readReleaseNotesFile(),
  previousNotes = readReleaseNotesFromGitRef(baseRef)
} = {}) {
  const problems = [];
  let releaseSummary = null;

  try {
    releaseSummary = validateReleaseNotes(currentNotes);
  } catch (error) {
    problems.push(error.message);
  }

  try {
    validateReleaseApproval(currentNotes);
  } catch (error) {
    problems.push(error.message);
  }

  const releaseNotesChanged = hasReleaseNotesChanged(changedPaths);
  const deploymentInfraChanged = hasDeploymentInfraChanged(changedPaths);

  if (releaseNotesChanged && previousNotes) {
    try {
      validateReleaseVersionBump(currentNotes, previousNotes);
    } catch (error) {
      problems.push(error.message);
    }
  }

  return {
    ok: problems.length === 0,
    baseRef,
    currentVersion: releaseSummary?.currentVersion ?? currentNotes?.currentVersion,
    currentTitle: releaseSummary?.currentRelease?.title,
    approved: releaseSummary?.currentRelease?.approved === true,
    releaseNotesChanged,
    deploymentInfraChanged,
    changedPaths,
    requiredChecks: buildRequiredChecks({
      baseRef,
      releaseNotesChanged,
      deploymentInfraChanged
    }),
    problems
  };
}

export function formatReleaseStatus(status) {
  const lines = [
    `Release: r${status.currentVersion ?? "?"}${status.approved ? " approved" : " not approved"}`,
    `Title: ${status.currentTitle || "(missing)"}`,
    `Base: ${status.baseRef}`,
    `Release notes changed: ${status.releaseNotesChanged ? "yes" : "no"}`,
    `Deploy infra changed: ${status.deploymentInfraChanged ? "yes" : "no"}`,
    `Release gate: ${status.ok ? "ready" : "blocked"}`
  ];

  if (status.problems.length > 0) {
    lines.push("", "Problems:");
    status.problems.forEach((problem) => lines.push(`- ${problem}`));
  }

  lines.push("", "Required checks:");
  status.requiredChecks.forEach((check) => lines.push(`- ${check}`));

  return `${lines.join("\n")}\n`;
}

const getArgValue = (args, name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const isCli = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCli) {
  const args = process.argv.slice(2);
  const baseRef = getArgValue(args, "--base") || "origin/main";
  const status = getReleaseStatus({ baseRef });

  if (args.includes("--json")) {
    process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
  } else {
    process.stdout.write(formatReleaseStatus(status));
  }

  if (!status.ok) {
    process.exit(1);
  }
}
