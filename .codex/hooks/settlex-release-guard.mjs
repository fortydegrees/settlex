#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import {
  validateReleaseApproval,
  validateReleaseNotes,
  validateReleaseVersionBump
} from "../../scripts/release/check-release.mjs";
import {
  readReleaseNotesFile,
  readReleaseNotesFromGitRef
} from "../../scripts/release/read-release-notes.mjs";

const releasePromptPattern =
  /\b(deploy|prod|production|settlehex\.com|push main|go live)\b/i;

const protectedCommandPatterns = [
  /\bgit\s+push\b.*\bmain\b/i,
  /\bgh\s+workflow\s+run\s+deploy-prod\b/i,
  /\binfra\/scripts\/deploy-prod\.sh\b/i,
  /\bdocker\s+compose\b.*docker-compose\.prod\.yml\b/i
];

const releaseWorkflowContext =
  "This looks like a Settlex production release/deploy request. Before pushing or deploying settlehex.com, use the $settlex-release skill to draft readable release notes, show the exact What changed copy to the user, get approval, set approved: true in release/release-notes.json, and run pnpm release:check -- --require-approved.";

export function isReleasePrompt(prompt = "") {
  return releasePromptPattern.test(String(prompt));
}

export function isProtectedReleaseCommand(command = "") {
  return protectedCommandPatterns.some((pattern) => pattern.test(String(command)));
}

export function runPreparedReleaseCheck({
  baseRef = process.env.SETTLEX_RELEASE_BASE_REF || "origin/main"
} = {}) {
  try {
    const currentNotes = readReleaseNotesFile();
    validateReleaseNotes(currentNotes);
    validateReleaseApproval(currentNotes);
    const previousNotes = readReleaseNotesFromGitRef(baseRef);
    if (previousNotes) {
      validateReleaseVersionBump(currentNotes, previousNotes);
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error?.message || "release notes are not prepared"
    };
  }
}

export function buildHookResponse(input, { releaseCheck = runPreparedReleaseCheck } = {}) {
  const hookEventName = input?.hook_event_name;

  if (hookEventName === "UserPromptSubmit" && isReleasePrompt(input?.prompt)) {
    return {
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: releaseWorkflowContext
      }
    };
  }

  if (hookEventName === "PreToolUse") {
    const command = input?.tool_input?.command;
    if (!isProtectedReleaseCommand(command)) return null;

    const check = releaseCheck();
    if (check.ok) return null;

    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          `Prepare approved release notes with $settlex-release before deploying: ${check.message}`
      }
    };
  }

  return null;
}

const readStdin = async () =>
  new Promise((resolve, reject) => {
    let raw = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => resolve(raw));
    process.stdin.on("error", reject);
  });

const isCli = process.argv[1]
  ? import.meta.url === pathToFileURL(process.argv[1]).href
  : false;

if (isCli) {
  try {
    const rawInput = await readStdin();
    const input = rawInput.trim() ? JSON.parse(rawInput) : {};
    const response = buildHookResponse(input);
    if (response) {
      process.stdout.write(`${JSON.stringify(response)}\n`);
    }
  } catch (error) {
    process.stderr.write(`Settlex release hook failed: ${error.message}\n`);
    process.exit(1);
  }
}
