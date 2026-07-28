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

  it("never exposes the boardgame.io lobby API publicly", () => {
    const caddyfile = readRepoFile("infra", "Caddyfile");

    // The lobby REST API (create/join/list matches) has no auth of its own;
    // all lobby operations must flow through the Next API server-side.
    expect(caddyfile).not.toContain("/games");
    expect(caddyfile).not.toContain("game:8080");
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
    expect(script).toContain('docker compose -f "$COMPOSE_FILE" up -d --build web game');
    expect(script).toContain('docker compose -f "$COMPOSE_FILE" exec -T web pnpm db:migrate');
    expect(script).toContain("curl --fail");
    expect(script).toContain("https://settlehex.com");
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
