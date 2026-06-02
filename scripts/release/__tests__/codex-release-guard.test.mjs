import { describe, expect, it } from "vitest";

import {
  buildHookResponse,
  isProtectedReleaseCommand,
  isReleasePrompt
} from "../../../.codex/hooks/settlex-release-guard.mjs";

describe("settlex release Codex hook", () => {
  it("detects production release prompts", () => {
    expect(isReleasePrompt("can you push this to prod on settlehex.com?")).toBe(
      true
    );
    expect(isReleasePrompt("tune the dice animation")).toBe(false);
  });

  it("adds release workflow context for production prompts", () => {
    const response = buildHookResponse({
      hook_event_name: "UserPromptSubmit",
      prompt: "deploy this to prod"
    });

    expect(response.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(response.hookSpecificOutput.additionalContext).toContain(
      "$settlex-release"
    );
    expect(response.hookSpecificOutput.additionalContext).toContain(
      "pnpm release:status"
    );
    expect(response.hookSpecificOutput.additionalContext).toContain(
      "approved: true"
    );
  });

  it("detects protected deploy commands", () => {
    expect(isProtectedReleaseCommand("git push origin main")).toBe(true);
    expect(isProtectedReleaseCommand("gh workflow run deploy-prod")).toBe(true);
    expect(isProtectedReleaseCommand("infra/scripts/deploy-prod.sh")).toBe(true);
    expect(isProtectedReleaseCommand("git push origin codex/release-versioning")).toBe(
      false
    );
  });

  it("blocks protected commands when release notes are not prepared", () => {
    const response = buildHookResponse(
      {
        hook_event_name: "PreToolUse",
        tool_name: "Bash",
        tool_input: {
          command: "git push origin main"
        }
      },
      {
        releaseCheck: () => ({
          ok: false,
          message: "currentVersion must increase"
        })
      }
    );

    expect(response.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(response.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(response.hookSpecificOutput.permissionDecisionReason).toContain(
      "currentVersion must increase"
    );
  });

  it("does not block unrelated commands", () => {
    const response = buildHookResponse({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: {
        command: "pnpm lint"
      }
    });

    expect(response).toBeNull();
  });
});
