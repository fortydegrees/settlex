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

  it("deploys pinned images in pull -> up -> migrate order", () => {
    const script = readRepoFile("infra", "scripts", "deploy-prod.sh");

    expect(script).toContain("docker compose -f infra/docker-compose.prod.yml pull");
    expect(script).toContain("docker compose -f infra/docker-compose.prod.yml up -d");
    expect(script).toContain(
      "docker compose -f infra/docker-compose.prod.yml exec -T web pnpm db:migrate"
    );
  });

  it("packages migration files into the web runtime image", () => {
    const dockerfile = readRepoFile("Dockerfile.web");

    expect(dockerfile).toContain("COPY --from=build /app/scripts ./scripts");
    expect(dockerfile).toContain("COPY --from=build /app/lib/server/db ./lib/server/db");
  });

  it("verifies before building and deploying multi-arch production images", () => {
    const workflow = readRepoFile(".github", "workflows", "deploy-prod.yml");

    expect(workflow).toContain("pnpm verify");
    expect(workflow).toContain("docker/setup-qemu-action");
    expect(workflow).toContain("platforms: linux/amd64,linux/arm64");
    expect(workflow).toContain("ghcr.io");
    expect(workflow).toContain("rsync -az");
    expect(workflow).toContain("docker login ghcr.io");
    expect(workflow).toContain("infra/scripts/deploy-prod.sh");
  });
});
