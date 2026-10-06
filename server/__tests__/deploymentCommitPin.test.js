import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = fs.readFileSync(new URL("../../infra/scripts/deploy-prod-from-git.sh", import.meta.url), "utf8");

describe("verified deployment commit pin", () => {
  it("refuses a changed remote head before checkout reset or Docker commands", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "settlex-deploy-pin-"));
    const bin = path.join(root, "bin");
    fs.mkdirSync(bin);
    fs.mkdirSync(path.join(root, ".git"));
    const keys = ["DATABASE_URL", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "PUBLIC_APP_URL", "NEXT_PUBLIC_GAME_SERVER_ORIGIN", "GAME_SERVER_INTERNAL_URL", "SITE_HOST", "SESSION_SECRET", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "VAPID_SUBJECT", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
    fs.writeFileSync(path.join(root, ".env.prod"), keys.map(key => `${key}=test`).join("\n"));
    const commandLog = path.join(root, "commands.log");
    fs.writeFileSync(path.join(bin, "git"), `#!/bin/sh
printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
case "$*" in
  'rev-parse --verify HEAD'|'rev-parse HEAD') echo old-head ;;
  'rev-parse origin/main') echo unverified-new-head ;;
esac
`, { mode: 0o755 });
    fs.writeFileSync(path.join(bin, "docker"), `#!/bin/sh
printf 'docker %s\\n' "$*" >> "$COMMAND_LOG"
`, { mode: 0o755 });
    try {
      const result = spawnSync("bash", ["-s"], {
        input: script, cwd: root, encoding: "utf8",
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, SETTLEX_ROOT_DIR: root, SETTLEX_DEPLOY_EXPECTED_SHA: "verified-head", COMMAND_LOG: commandLog },
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("no longer matches the verified commit");
      const commands = fs.readFileSync(commandLog, "utf8");
      expect(commands).not.toContain("git reset");
      expect(commands).not.toContain("docker ");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
