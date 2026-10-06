import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function activate(failure = "") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bot-activation-"));
  try {
    fs.mkdirSync(path.join(root, "infra/scripts"), { recursive: true });
    fs.mkdirSync(path.join(root, "bin"));
    fs.copyFileSync("infra/scripts/promote-bot.sh", path.join(root, "infra/scripts/promote-bot.sh"));
    fs.writeFileSync(path.join(root, ".env.prod"), "SETTLEX_SETTLEGRAPH_V2_ENABLED=1\n");
    fs.writeFileSync(path.join(root, "model.ctnn"), "fixture");
    fs.writeFileSync(path.join(root, "bin/docker"), `#!/bin/bash
printf '%s\\n' "$*" >> "$COMMAND_LOG"
if [[ "$*" == *"--rollback"* ]]; then exit 0; fi
if [[ "$FAILURE" == candidate && "$*" == *"--checkpoint"* ]]; then exit 4; fi
if [[ "$FAILURE" == activated && "$*" == *"exec -T game"* ]]; then exit 5; fi
`, { mode: 0o755 });
    const result = spawnSync("bash", ["infra/scripts/promote-bot.sh", path.join(root, "model.ctnn"), "008", "a".repeat(64)],
      { cwd: root, encoding: "utf8", env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, COMMAND_LOG: `${root}/commands`, FAILURE: failure } });
    return { ...result, commands: fs.existsSync(`${root}/commands`) ? fs.readFileSync(`${root}/commands`, "utf8") : "" };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
describe("production bot activation", () => {
  it("activates and restarts the selected model without rebuilding images", () => {
    const result = activate();
    expect(result.status, result.stderr).toBe(0);
    expect(result.commands).toContain("stop web game");
    expect(result.commands).toContain("--checkpoint 008");
    expect(result.commands).toContain("up -d --no-build web game");
    expect(result.commands).not.toMatch(/\sbuild web game/);
    expect(result.commands).not.toContain("--rollback");
  });
  it("restarts the existing selection when candidate verification fails", () => {
    const result = activate("candidate");
    expect(result.status).toBe(4);
    expect(result.commands).toContain("up -d --no-build web game");
    expect(result.commands).not.toContain("--rollback");
  });
  it("restores the previous selection and restarts when activated preflight fails", () => {
    const result = activate("activated");
    expect(result.status).toBe(5);
    expect(result.commands).toContain("--rollback");
    expect(result.commands.match(/up -d --no-build web game/g)).toHaveLength(2);
  });
});
