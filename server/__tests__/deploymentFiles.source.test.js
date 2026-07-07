import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

const expectPatchFilesAvailableBeforeInstall = (dockerfile) => {
  const patchCopyIndex = dockerfile.indexOf("COPY patches patches");
  const installIndex = dockerfile.indexOf("RUN pnpm install --frozen-lockfile");

  expect(patchCopyIndex).toBeGreaterThanOrEqual(0);
  expect(installIndex).toBeGreaterThanOrEqual(0);
  expect(patchCopyIndex).toBeLessThan(installIndex);
};

describe("deployment file wiring", () => {
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
    expect(caddyfile).toContain("reverse_proxy @lobby game:8080");
    expect(caddyfile).toContain("/socket.io");
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

  it("verifies before syncing source and triggering a server-side rebuild", () => {
    const workflow = readRepoFile(".github", "workflows", "deploy-prod.yml");

    expect(workflow).toContain("fetch-depth: 0");
    expect(workflow).toContain("pnpm release:check -- --require-approved");
    expect(workflow).toContain("pnpm release:check -- --require-bump-from");
    expect(workflow).toContain("git diff --quiet");
    expect(workflow).toContain("pnpm verify");
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
  });
});
