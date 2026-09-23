import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

const validDeploymentEnv = {
  DATABASE_URL: "postgres://example",
  POSTGRES_DB: "settlehex",
  POSTGRES_USER: "settlehex",
  POSTGRES_PASSWORD: "secret",
  PUBLIC_APP_URL: "https://settlehex.com",
  NEXT_PUBLIC_GAME_SERVER_ORIGIN: "https://settlehex.com",
  GAME_SERVER_INTERNAL_URL: "http://game:8080",
  SITE_HOST: "settlehex.com",
  SESSION_SECRET: "secret",
  BETTER_AUTH_SECRET: "secret",
  BETTER_AUTH_URL: "https://settlehex.com",
  VAPID_SUBJECT: "mailto:test@example.com",
  VAPID_PUBLIC_KEY: "public",
  VAPID_PRIVATE_KEY: "private",
};

const runProductionDeployPreflight = (env) => {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "settlex-deploy-preflight-")
  );
  const scriptDir = path.join(tempRoot, "infra", "scripts");
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.writeFileSync(
    path.join(scriptDir, "deploy-prod.sh"),
    readRepoFile("infra", "scripts", "deploy-prod.sh"),
    { mode: 0o755 }
  );
  if (env) {
    const contents = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    fs.writeFileSync(path.join(tempRoot, ".env.prod"), `${contents}\n`);
  }

  try {
    return spawnSync("bash", ["infra/scripts/deploy-prod.sh"], {
      cwd: tempRoot,
      encoding: "utf8",
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

const runProductionDeployWithRecordedCommands = () => {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "settlex-deploy-commands-")
  );
  const scriptDir = path.join(tempRoot, "infra", "scripts");
  const binDir = path.join(tempRoot, "bin");
  const commandLog = path.join(tempRoot, "commands.log");
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(
    path.join(scriptDir, "deploy-prod.sh"),
    readRepoFile("infra", "scripts", "deploy-prod.sh"),
    { mode: 0o755 }
  );
  fs.writeFileSync(
    path.join(tempRoot, ".env.prod"),
    `${Object.entries(validDeploymentEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")}\n`
  );
  fs.writeFileSync(
    path.join(binDir, "docker"),
    `#!/usr/bin/env bash
printf 'docker %s\\n' "$*" >> "$SETTLEX_COMMAND_LOG"
if [[ "$*" == *"exec -T web node -e"* ]]; then
  exit 1
fi
`,
    { mode: 0o755 }
  );
  fs.writeFileSync(
    path.join(binDir, "curl"),
    `#!/usr/bin/env bash
printf 'curl %s\\n' "$*" >> "$SETTLEX_COMMAND_LOG"
`,
    { mode: 0o755 }
  );

  try {
    const result = spawnSync("bash", ["infra/scripts/deploy-prod.sh"], {
      cwd: tempRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}${path.delimiter}${process.env.PATH}`,
        SETTLEX_BUILD_SHA: "test-build",
        SETTLEX_BUILD_DATE: "2026-08-26T00:00:00Z",
        SETTLEX_RELEASE_VERSION: "4",
        SETTLEX_COMMAND_LOG: commandLog,
      },
    });
    const commands = fs.existsSync(commandLog)
      ? fs.readFileSync(commandLog, "utf8")
      : "";
    return { result, commands };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

const expectPatchFilesAvailableBeforeInstall = (dockerfile) => {
  const patchCopyIndex = dockerfile.indexOf("COPY patches patches");
  const installIndex = dockerfile.indexOf("RUN pnpm install --frozen-lockfile");

  expect(patchCopyIndex).toBeGreaterThanOrEqual(0);
  expect(installIndex).toBeGreaterThanOrEqual(0);
  expect(patchCopyIndex).toBeLessThan(installIndex);
};

describe("deployment file wiring", () => {
  it("declares the Match alerts VAPID runtime contract without example key material", () => {
    const exampleEnv = readRepoFile(".env.example");

    expect(exampleEnv).toContain("VAPID_SUBJECT=mailto:hello@settlehex.com");
    expect(exampleEnv).toMatch(/^VAPID_PUBLIC_KEY=$/m);
    expect(exampleEnv).toMatch(/^VAPID_PRIVATE_KEY=$/m);
  });

  it("preflights Match alerts VAPID configuration before production deploys", () => {
    const script = readRepoFile("infra", "scripts", "deploy-prod.sh");
    const requiredKeysStart = script.indexOf("required_env_keys=(");
    const requiredKeysEnd = script.indexOf(")", requiredKeysStart);
    const preflightLoopStart = script.indexOf(
      'for key in "${required_env_keys[@]}"; do'
    );
    const preflightCallIndex = script.indexOf(
      'require_env_key "$key"',
      preflightLoopStart
    );
    const preflightLoopEnd = script.indexOf("done", preflightCallIndex);
    const firstDockerIndex = script.indexOf("docker compose");
    const requiredKeys = script.slice(requiredKeysStart, requiredKeysEnd);

    expect(requiredKeysStart).toBeGreaterThanOrEqual(0);
    expect(requiredKeysEnd).toBeGreaterThan(requiredKeysStart);
    expect(preflightLoopStart).toBeGreaterThan(requiredKeysEnd);
    expect(preflightCallIndex).toBeGreaterThan(preflightLoopStart);
    expect(preflightLoopEnd).toBeGreaterThan(preflightCallIndex);
    expect(firstDockerIndex).toBeGreaterThan(preflightLoopEnd);
    expect(requiredKeys).toMatch(/^\s+VAPID_SUBJECT$/m);
    expect(requiredKeys).toMatch(/^\s+VAPID_PUBLIC_KEY$/m);
    expect(requiredKeys).toMatch(/^\s+VAPID_PRIVATE_KEY$/m);
  });

  it.each([
    ["missing file", null, "DATABASE_URL"],
    [
      "blank value",
      {
        ...validDeploymentEnv,
        VAPID_SUBJECT: "",
      },
      "VAPID_SUBJECT",
    ],
    [
      "whitespace-only value",
      {
        ...validDeploymentEnv,
        VAPID_PUBLIC_KEY: "   ",
      },
      "VAPID_PUBLIC_KEY",
    ],
  ])("rejects a %s before invoking Docker", (_label, env, missingKey) => {
    const result = runProductionDeployPreflight(env);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `Missing required production env key in .env.prod: ${missingKey}`
    );
    expect(result.stderr).not.toContain("docker:");
  });

  it("keeps the production environment out of Docker build context", () => {
    const dockerignore = readRepoFile(".dockerignore");

    expect(dockerignore).toMatch(/^\.env\.prod$/m);
    expect(dockerignore).toMatch(/^\*\*\/\*\.ctnn$/m);
  });

  it("pins and packages only the verified direct-play Bot 005 runtime", () => {
    const model = JSON.parse(readRepoFile("release", "bot-model.json"));
    const gameDockerfile = readRepoFile("Dockerfile.game");
    const compose = readRepoFile("infra", "docker-compose.prod.yml");
    const startup = readRepoFile("infra", "scripts", "start-game.sh");

    expect(model).toEqual({
      checkpoint: "005",
      sha256: "382a8708312d469efdbb7333891a3469bd204d46d85ec02e218e0c0b377437ca",
      observationVersion: 3,
      observationDim: 1464,
      actionCount: 299,
      relativePath: "incumbent-005/model.ctnn",
      mode: "direct",
    });
    expect(gameDockerfile).toContain("FROM rust:1.85.1-bookworm AS native");
    expect(gameDockerfile).toContain("cargo build --release --locked");
    expect(gameDockerfile).toContain("/usr/local/bin/settlegraph-v2-worker");
    expect(gameDockerfile).toContain('CMD ["sh", "infra/scripts/start-game.sh"]');
    expect(compose).toContain("SETTLEX_SETTLEGRAPH_V2_ENABLED");
    expect(compose).toContain("SETTLEX_BOT_MODELS_DIR:-/srv/settlex-models");
    expect(compose).toContain("read_only: true");
    expect(compose).toContain("create_host_path: false");
    expect(startup.indexOf("check-production-bot.mjs")).toBeLessThan(
      startup.indexOf("server/server.js")
    );
  });

  it("builds the homepage Bot 005 action from the same deployment flag", () => {
    const webDockerfile = readRepoFile("Dockerfile.web");
    const compose = readRepoFile("infra", "docker-compose.prod.yml");
    const exampleEnv = readRepoFile(".env.example");

    expect(webDockerfile).toContain("ARG SETTLEX_SETTLEGRAPH_V2_ENABLED=0");
    expect(webDockerfile).toContain(
      "ENV NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2=$SETTLEX_SETTLEGRAPH_V2_ENABLED"
    );
    expect(compose).toContain("SETTLEX_SETTLEGRAPH_V2_ENABLED: ${SETTLEX_SETTLEGRAPH_V2_ENABLED:-0}");
    expect(exampleEnv).toContain("NEXT_PUBLIC_SETTLEX_SETTLEGRAPH_V2=0");
  });

  it("keeps local compose limited to postgres", () => {
    const compose = readRepoFile("infra", "docker-compose.local.yml");

    expect(compose).toContain("services:");
    expect(compose).toContain("postgres:");
    expect(compose).toContain("POSTGRES_DB: settlehex");
    expect(compose).toContain("POSTGRES_USER: settlehex");
    expect(compose).toContain("POSTGRES_PASSWORD: settlehex");
    expect(compose).toContain("settlehex-postgres-local");
    expect(compose).not.toContain("web:");
    expect(compose).not.toContain("game:");
    expect(compose).not.toContain("proxy:");
  });

  it("defines the production compose stack", () => {
    const compose = readRepoFile("infra", "docker-compose.prod.yml");

    expect(compose).toContain("proxy:");
    expect(compose).toContain("web:");
    expect(compose).toContain("game:");
    expect(compose).toContain("postgres:");
    expect(compose).toContain("build:");
    expect(compose).toContain("context: ..");
    expect(compose).toContain("dockerfile: Dockerfile.web");
    expect(compose).toContain("dockerfile: Dockerfile.game");
    expect(compose).toContain("../.env.prod");
    expect(compose).toContain("./Caddyfile:/etc/caddy/Caddyfile:ro");
    expect(compose).toContain("settlehex-postgres-prod");
  });

  it("keeps local AI training artifacts out of the Docker build context", () => {
    const dockerignore = readRepoFile(".dockerignore");

    expect(dockerignore).toContain("ai/pufferlib/python/.venv/");
    expect(dockerignore).toContain("ai/pufferlib/runs*/");
    expect(dockerignore).toContain("ai/pufferlib/**/*.pt");
    expect(dockerignore).toContain("*.egg-info/");
  });

  it("keeps local tool caches out of the Docker build context", () => {
    const dockerignore = readRepoFile(".dockerignore");

    expect(dockerignore).toContain(".pnpm-store/");
    expect(dockerignore).toContain(".superpowers/");
    expect(dockerignore).toContain(".playwright-cli/");
    expect(dockerignore).toContain(".tmp/");
  });

  it("routes websocket traffic to the game service through caddy", () => {
    const caddyfile = readRepoFile("infra", "Caddyfile");

    expect(caddyfile).toContain("reverse_proxy web:");
    expect(caddyfile).toContain("reverse_proxy @gameSocket game:8000");
    expect(caddyfile).toContain("/socket.io");
  });

  it("routes only custom game-state handlers to the lobby listener", () => {
    const caddyfile = readRepoFile("infra", "Caddyfile");

    expect(caddyfile).toContain("@gameState path /timer* /idle*");
    expect(caddyfile).toContain("reverse_proxy @gameState game:8080");
    expect(caddyfile.match(/game:8080/g) ?? []).toHaveLength(1);

    // The Boardgame.io lobby REST API (create/join/list matches) has no auth of
    // its own; only the named custom handlers may reach the lobby listener.
    expect(caddyfile).not.toContain("/games");
  });

  it("rebuilds app services on the server and migrates after boot", () => {
    const script = readRepoFile("infra", "scripts", "deploy-prod.sh");

    expect(script).not.toContain("docker compose -f infra/docker-compose.prod.yml pull");
    expect(script).toContain('COMPOSE_FILE="infra/docker-compose.prod.yml"');
    expect(script).toContain("SETTLEX_BUILD_SHA");
    expect(script).toContain("SETTLEX_BUILD_DATE");
    expect(script).toContain("SETTLEX_RELEASE_VERSION");
    expect(script).toContain("command -v node");
    expect(script).toContain("scripts/release/read-release-notes.mjs");
    expect(script).toContain("release/release-notes.json");
    expect(script).toContain("Could not determine SETTLEX_RELEASE_VERSION.");
    expect(script).toContain('docker compose --env-file .env.prod -f "$COMPOSE_FILE" "$@"');
    const buildIndex = script.indexOf('compose build web game');
    const botPreflightIndex = script.indexOf(
      'compose run --rm --no-deps game node scripts/bots/check-production-bot.mjs'
    );
    const serviceSwapIndex = script.indexOf('compose up -d --no-build web game');
    expect(buildIndex).toBeGreaterThanOrEqual(0);
    expect(botPreflightIndex).toBeGreaterThan(buildIndex);
    expect(serviceSwapIndex).toBeGreaterThan(botPreflightIndex);
    expect(script).toContain('compose exec -T web pnpm db:migrate');
    expect(script).toContain("curl --fail");
    expect(script).toContain("https://settlehex.com");
  });

  it("recreates the proxy before reloading its synced Caddyfile", () => {
    const { result, commands } = runProductionDeployWithRecordedCommands();
    const proxyStart = commands.indexOf(
      "docker compose --env-file .env.prod -f infra/docker-compose.prod.yml up -d --force-recreate proxy --remove-orphans"
    );
    const caddyReload = commands.indexOf(
      "docker compose --env-file .env.prod -f infra/docker-compose.prod.yml exec -T -w /etc/caddy proxy caddy reload --config /etc/caddy/Caddyfile"
    );

    expect(result.status).toBe(0);
    expect(proxyStart).toBeGreaterThanOrEqual(0);
    expect(caddyReload).toBeGreaterThan(proxyStart);
  });

  it("probes every public production listener after reloading Caddy", () => {
    const { result, commands } = runProductionDeployWithRecordedCommands();
    const curlCommands = commands
      .split("\n")
      .filter((command) => command.startsWith("curl "));

    expect(result.status).toBe(0);
    expect(curlCommands).toEqual([
      "curl --fail --silent --show-error --location https://settlehex.com",
      "curl --fail --silent --show-error --location https://settlehex.com/api/auth/options",
      "curl --fail --silent --show-error --location https://settlehex.com/socket.io/?EIO=4&transport=polling",
      "curl --fail --silent --show-error --request OPTIONS https://settlehex.com/timer/settlex-route-check",
      "curl --fail --silent --show-error --request OPTIONS https://settlehex.com/idle/settlex-route-check/ack",
    ]);
  });

  it("provides a fast git-based production deploy lane", () => {
    const packageJson = JSON.parse(readRepoFile("package.json"));
    const script = readRepoFile("infra", "scripts", "deploy-prod-from-git.sh");

    expect(packageJson.scripts["deploy:prod:fast"]).toContain("settlehex-oci");
    expect(packageJson.scripts["deploy:prod:fast"]).toContain(
      "infra/scripts/deploy-prod-from-git.sh"
    );
    expect(script).toContain("git fetch");
    expect(script).toContain("git init");
    expect(script).toContain("git reset --hard");
    expect(script).toContain("require_env_key");
    expect(script).toContain("BETTER_AUTH_SECRET");
    expect(script).toContain("VAPID_PUBLIC_KEY");
    expect(script).toContain("pg_dump");
    expect(script).toContain('docker compose --env-file .env.prod -f "$COMPOSE_FILE"');
    expect(script).toContain("infra/scripts/deploy-prod.sh");
    expect(script).toContain("curl --fail");
    expect(script).toContain("https://settlehex.com");
  });

  it("packages migration files into the web runtime image", () => {
    const dockerfile = readRepoFile("Dockerfile.web");
    const packageJson = JSON.parse(readRepoFile("package.json"));

    expect(packageJson.packageManager).toBe("pnpm@9.13.2");
    expect(packageJson.pnpm.patchedDependencies).toHaveProperty(
      "react-zoom-pan-pinch@3.7.0"
    );
    expect(dockerfile).toContain("corepack prepare pnpm@9.13.2 --activate");
    expectPatchFilesAvailableBeforeInstall(dockerfile);
    expect(dockerfile).toContain("ARG SETTLEX_RELEASE_VERSION");
    expect(dockerfile).toContain("NEXT_PUBLIC_SETTLEX_RELEASE_VERSION");
    expect(dockerfile).toContain("ARG SETTLEX_BUILD_SHA");
    expect(dockerfile).toContain("NEXT_PUBLIC_SETTLEX_BUILD_SHA");
    expect(dockerfile).toContain("ARG SETTLEX_BUILD_DATE");
    expect(dockerfile).toContain("NEXT_PUBLIC_SETTLEX_BUILD_DATE");
    expect(dockerfile).toContain(
      "ENV SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS=1"
    );
    expect(dockerfile).not.toContain("ARG BETTER_AUTH_SECRET");
    expect(dockerfile).not.toContain("ARG DATABASE_URL");
    expect(dockerfile).toContain("COPY --from=build /app/scripts ./scripts");
    expect(dockerfile).toContain("COPY --from=build /app/lib/server/db ./lib/server/db");
  });

  it("pins pnpm in the game runtime image", () => {
    const dockerfile = readRepoFile("Dockerfile.game");

    expect(dockerfile).toContain("corepack prepare pnpm@9.13.2 --activate");
    expectPatchFilesAvailableBeforeInstall(dockerfile);
  });

  it("keeps the GitHub deploy workflow as the manual thorough lane", () => {
    const workflow = readRepoFile(".github", "workflows", "deploy-prod.yml");

    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("pnpm release:check -- --require-approved");
    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toContain("push:");
    expect(workflow).not.toContain("branches:");
    expect(workflow).toContain("SETTLEX_BUILD_SHA");
    expect(workflow).toContain("SETTLEX_BUILD_DATE");
    expect(workflow).toContain("SETTLEX_RELEASE_VERSION");
    expect(workflow).toContain("node scripts/release/read-release-notes.mjs");
    expect(workflow).toContain("rsync -az");
    expect(workflow).toContain("--filter=':- .gitignore'");
    expect(workflow).not.toContain("docker/setup-qemu-action");
    expect(workflow).not.toContain("docker/setup-buildx-action");
    expect(workflow).not.toContain("ghcr.io");
    expect(workflow).not.toContain("platforms: linux/arm64");
    expect(workflow).not.toContain("docker login ghcr.io");
    expect(workflow).toContain("infra/scripts/deploy-prod.sh");
  });

  it("passes release build arguments through production compose", () => {
    const compose = readRepoFile("infra", "docker-compose.prod.yml");

    expect(compose).toContain("args:");
    expect(compose).toContain("SETTLEX_RELEASE_VERSION:");
    expect(compose).toContain("SETTLEX_BUILD_SHA:");
    expect(compose).toContain("SETTLEX_BUILD_DATE:");
    expect(compose).toContain("NEXT_PUBLIC_SETTLEX_RELEASE_VERSION:");
    expect(compose).toContain("NEXT_PUBLIC_SETTLEX_BUILD_SHA:");
    expect(compose).toContain("NEXT_PUBLIC_SETTLEX_BUILD_DATE:");
  });
});
