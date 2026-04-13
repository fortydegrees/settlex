import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const actionContainerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);
const turnControlClusterPath = path.resolve(
  __dirname,
  "..",
  "components",
  "TurnControlCluster.js"
);

describe("PlayerActionContainer hitbox", () => {
  it("keeps the bottom overlay transparent outside the actual controls", () => {
    const containerSource = fs.readFileSync(actionContainerPath, "utf8");
    const clusterSource = fs.readFileSync(turnControlClusterPath, "utf8");

    expect(containerSource).toMatch(
      /fixed bottom-4 left-0 right-0 pointer-events-none px-4/
    );
    expect(containerSource).toMatch(
      /pointer-events-none flex-1 flex items-end justify-end self-end pr-2/
    );
    expect(containerSource).toContain("pr-2 sm:pr-3 md:pr-4 lg:pr-4");
    expect(containerSource).not.toContain("lg:pr-[4.5rem]");
    expect(containerSource).toContain("showTurnControls");
    expect(containerSource).not.toContain(
      "pointer-events-auto flex w-36 flex-col items-center"
    );
    expect(clusterSource).toContain(
      "pointer-events-auto flex translate-y-2.5 items-center gap-3"
    );
    expect(clusterSource).toContain("turn-control-strip");
    expect(clusterSource).toContain("turn-control-cluster__dice");
    expect(clusterSource).toContain("turn-control-cluster__button-rail");
    expect(clusterSource).not.toContain(
      'showTimerChip ? "items-end" : "items-center"'
    );
    expect(clusterSource).toContain('"data-allow-interaction": "true"');
  });
});
