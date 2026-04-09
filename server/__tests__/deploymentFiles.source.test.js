import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

describe("deployment file wiring", () => {
  it("keeps local compose limited to postgres", () => {
    const compose = readRepoFile("infra", "docker-compose.local.yml");

    expect(compose).toContain("services:");
    expect(compose).toContain("postgres:");
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
    expect(script).toContain('docker compose -f "$COMPOSE_FILE" up -d --build web game');
    expect(script).toContain('docker compose -f "$COMPOSE_FILE" exec -T web pnpm db:migrate');
  });

  it("packages migration files into the web runtime image", () => {
    const dockerfile = readRepoFile("Dockerfile.web");

    expect(dockerfile).toContain("COPY --from=build /app/scripts ./scripts");
    expect(dockerfile).toContain("COPY --from=build /app/lib/server/db ./lib/server/db");
  });

  it("verifies before syncing source and triggering a server-side rebuild", () => {
    const workflow = readRepoFile(".github", "workflows", "deploy-prod.yml");

    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain("rsync -az");
    expect(workflow).not.toContain("docker/setup-qemu-action");
    expect(workflow).not.toContain("docker/setup-buildx-action");
    expect(workflow).not.toContain("ghcr.io");
    expect(workflow).not.toContain("platforms: linux/arm64");
    expect(workflow).not.toContain("docker login ghcr.io");
    expect(workflow).toContain("infra/scripts/deploy-prod.sh");
  });
});
