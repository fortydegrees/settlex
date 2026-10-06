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
    for (const name of ["current", "web", "game"]) fs.writeFileSync(path.join(root, name), "007\n");
    fs.writeFileSync(path.join(root, "bin/docker"), `#!/bin/bash
printf '%s\\n' "$*" >> "$COMMAND_LOG"
if [[ "$FAILURE" == disabled && "$*" == *"run --rm --no-deps game node scripts/bots/check-production-bot.mjs"* ]]; then exit 6; fi
if [[ "$*" == *"stop web game"* ]]; then
  printf 'stopped\\n' > "$STATE_DIR/web"; printf 'stopped\\n' > "$STATE_DIR/game"
fi
if [[ "$*" == *"--rollback"* ]]; then printf '007\\n' > "$STATE_DIR/current"; exit 0; fi
if [[ "$*" == *"--checkpoint"* ]]; then
  if [[ "$FAILURE" == candidate ]]; then exit 4; fi
  printf '008\\n' > "$STATE_DIR/current"
fi
if [[ "$*" == *"up -d --no-build"* ]]; then
  for service in web game; do
    if [[ "$*" == *"--force-recreate"* || "$(cat "$STATE_DIR/$service")" == stopped ]]; then
      cp "$STATE_DIR/current" "$STATE_DIR/$service"
    fi
  done
fi
if [[ "$FAILURE" == activated && "$*" == *"exec -T game"* && ! -f "$STATE_DIR/failed" ]]; then touch "$STATE_DIR/failed"; exit 5; fi
`, { mode: 0o755 });
    const result = spawnSync("bash", ["infra/scripts/promote-bot.sh", path.join(root, "model.ctnn"), "008", "a".repeat(64)],
      { cwd: root, encoding: "utf8", env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, COMMAND_LOG: `${root}/commands`, FAILURE: failure, STATE_DIR: root } });
    return { ...result, current: fs.readFileSync(`${root}/current`, "utf8").trim(), web: fs.readFileSync(`${root}/web`, "utf8").trim(), game: fs.readFileSync(`${root}/game`, "utf8").trim(), commands: fs.existsSync(`${root}/commands`) ? fs.readFileSync(`${root}/commands`, "utf8") : "" };
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
describe("production bot activation", () => {
  it("does not stop services when the existing bot is disabled", () => {
    const result = activate("disabled");
    expect(result.status).toBe(6);
    expect(result.commands).not.toContain("stop web game");
    expect(result.current).toBe("007");
  });
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
    expect(result.current).toBe("007");
    expect(result.web).toBe("007");
    expect(result.game).toBe("007");
    expect(result.commands).toContain("--force-recreate");
  });
});
