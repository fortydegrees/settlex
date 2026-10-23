import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const script = fs.readFileSync(new URL("../../infra/scripts/deploy-prod-from-git.sh", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../../.github/workflows/deploy-prod.yml", import.meta.url), "utf8");

describe("verified deployment commit pin", () => {
  it.each([0, 19])("runs the entire SSH deployment after backup consumes stdin (deploy exit %s)", (deployExit) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "settlehex-deploy-stdin-"));
    const bin = path.join(root, "bin");
    const scripts = path.join(root, "infra/scripts");
    fs.mkdirSync(bin);
    fs.mkdirSync(scripts, { recursive: true });
    fs.mkdirSync(path.join(root, ".git"));
    fs.writeFileSync(path.join(root, "infra/docker-compose.prod.yml"), "services: {}\n");
    fs.mkdirSync(path.join(root, "release"));
    fs.writeFileSync(path.join(root, "release/release-notes.json"), "{}");
    const keys = ["DATABASE_URL", "POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD", "PUBLIC_APP_URL", "NEXT_PUBLIC_GAME_SERVER_ORIGIN", "GAME_SERVER_INTERNAL_URL", "SITE_HOST", "SESSION_SECRET", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "VAPID_SUBJECT", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];
    fs.writeFileSync(path.join(root, ".env.prod"), keys.map(key => `${key}=test`).join("\n"));
    fs.writeFileSync(path.join(scripts, "deploy-prod-from-git.sh"), script);
    const commandLog = path.join(root, "commands.log");
    const executable = (file, contents) => fs.writeFileSync(file, contents, { mode: 0o755 });
    executable(path.join(bin, "ssh"), '#!/bin/sh\nshift\nexec bash -c "$1"\n');
    executable(path.join(bin, "git"), `#!/bin/sh
printf 'git %s\\n' "$*" >> "$COMMAND_LOG"
case "$*" in
  'rev-parse --verify HEAD'|'rev-parse HEAD') echo old-head ;;
  'rev-parse origin/main') echo verified-head ;;
  'diff --name-only old-head verified-head --') echo package.json ;;
esac
`);
    executable(path.join(bin, "docker"), `#!/bin/sh
case "$*" in
  *pg_dump*) cat >/dev/null; echo test-database-backup ;;
esac
`);
    executable(path.join(bin, "curl"), '#!/bin/sh\nexit 0\n');
    executable(path.join(scripts, "deploy-prod.sh"), `#!/bin/sh
echo APP_DEPLOYED >> "$COMMAND_LOG"
exit ${deployExit}
`);
    try {
      const sshCommand = workflow.split("\n").find(line => line.trimStart().startsWith('ssh "$OCI_USER@$OCI_HOST"'))?.trim();
      expect(sshCommand).toBeTruthy();
      const result = spawnSync("bash", ["-c", sshCommand], {
        cwd: root, encoding: "utf8",
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, OCI_USER: "test", OCI_HOST: "test", OCI_APP_DIR: root, SETTLEHEX_BUILD_SHA: "verified-head", COMMAND_LOG: commandLog },
      });
      const commands = fs.readFileSync(commandLog, "utf8");
      expect(commands).toContain("git reset --hard verified-head");
      expect(commands).toContain("APP_DEPLOYED");
      expect(result.status).toBe(deployExit);
      if (deployExit === 0) expect(result.stdout).toContain("Live health check passed");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a changed remote head before checkout reset or Docker commands", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "settlehex-deploy-pin-"));
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
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, SETTLEHEX_ROOT_DIR: root, SETTLEHEX_DEPLOY_EXPECTED_SHA: "verified-head", COMMAND_LOG: commandLog },
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
