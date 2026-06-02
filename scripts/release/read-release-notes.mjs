import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

export const releaseNotesRelativePath = path.join("release", "release-notes.json");
export const releaseNotesPath = path.join(repoRoot, releaseNotesRelativePath);

const parseReleaseNotes = (raw, source) => {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse ${source}: ${error.message}`);
  }
};

export function readReleaseNotesFile(filePath = releaseNotesPath) {
  return parseReleaseNotes(fs.readFileSync(filePath, "utf8"), filePath);
}

export function readReleaseNotesFromGitRef(
  ref,
  relativePath = releaseNotesRelativePath
) {
  if (!ref || /^0+$/.test(ref)) return null;

  try {
    const raw = execFileSync("git", ["show", `${ref}:${relativePath}`], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return parseReleaseNotes(raw, `${ref}:${relativePath}`);
  } catch (error) {
    if (error.status === 128) return null;
    throw error;
  }
}

export function getCurrentReleaseVersion(notes = readReleaseNotesFile()) {
  return notes.currentVersion;
}

const isCli = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCli) {
  process.stdout.write(`${getCurrentReleaseVersion()}\n`);
}
