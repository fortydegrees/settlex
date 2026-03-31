import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const routeModulePath = path.resolve(process.cwd(), "app/api/scenarios/route.js");

const loadRouteWithScenarioFiles = async (files) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "settlex-scenarios-"));
  const scenariosDir = path.join(tempRoot, "app", "catana", "scenarios");
  fs.mkdirSync(scenariosDir, { recursive: true });

  for (const [filename, contents] of Object.entries(files)) {
    fs.writeFileSync(
      path.join(scenariosDir, filename),
      JSON.stringify(contents, null, 2)
    );
  }

  const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempRoot);
  vi.resetModules();

  const route = await import(`${pathToFileURL(routeModulePath).href}?t=${Date.now()}`);

  return {
    ...route,
    tempRoot,
    scenariosDir,
    restore() {
      cwdSpy.mockRestore();
      vi.resetModules();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  };
};

describe("scenario API", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("normalizes legacy and current scenario files to a loadable state payload", async () => {
    const legacyState = {
      core: {
        players: ["0", "1"],
        phase: "normal",
        turn: { currentPlayerId: "1" }
      }
    };
    const normalizedState = {
      core: {
        players: ["0", "1"],
        phase: "placement",
        turn: { currentPlayerId: "0" }
      }
    };
    const harness = await loadRouteWithScenarioFiles({
      "legacy.json": {
        G: legacyState,
        ctx: { currentPlayer: "1", activePlayers: { "1": "postRoll" } }
      },
      "normalized.json": {
        state: normalizedState
      }
    });

    try {
      const response = await harness.GET();
      const json = await response.json();

      expect(json.scenarios).toEqual([
        { id: "legacy.json", name: "legacy", data: legacyState },
        { id: "normalized.json", name: "normalized", data: normalizedState }
      ]);
    } finally {
      harness.restore();
    }
  });

  it("writes normalized scenario files instead of raw boardgame.io snapshots", async () => {
    const nextState = {
      core: {
        players: ["0", "1"],
        phase: "normal",
        turn: { currentPlayerId: "0" }
      }
    };
    const harness = await loadRouteWithScenarioFiles({});

    try {
      const request = new Request("http://localhost/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "dev cards demo",
          data: nextState
        })
      });

      const response = await harness.POST(request);
      expect(response.status).toBe(200);

      const saved = JSON.parse(
        fs.readFileSync(
          path.join(harness.scenariosDir, "dev-cards-demo.json"),
          "utf8"
        )
      );

      expect(saved).toEqual({
        state: nextState
      });
    } finally {
      harness.restore();
    }
  });
});
