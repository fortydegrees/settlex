import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dockPath = path.resolve(
  __dirname,
  "..",
  "components",
  "ActionsDock",
  "Dock.js"
);
const dockCardPath = path.resolve(
  __dirname,
  "..",
  "components",
  "ActionsDock",
  "DockCard.js"
);
const actionContainerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);

describe("Dock build pickup UX", () => {
  it("removes dock magnify and looping bounce while wiring build pickup state", () => {
    const dockSource = fs.readFileSync(dockPath, "utf8");
    const cardSource = fs.readFileSync(dockCardPath, "utf8");
    const containerSource = fs.readFileSync(actionContainerPath, "utf8");

    expect(dockSource).not.toContain("DOCK_ZOOM_LIMIT");
    expect(dockSource).not.toContain("clamp");
    expect(cardSource).not.toContain("loop:");
    expect(cardSource).not.toContain("Math.cos");
    expect(cardSource).toContain("preLaunchDelayMs");
    expect(cardSource).toContain("iconScaleX");
    expect(cardSource).toContain("iconScaleY");
    expect(cardSource).toContain("iconY");
    expect(containerSource).toContain("setBuildPickup");
    expect(containerSource).toContain("getBuildPickupPieceType");
    expect(containerSource).toContain("buildPickup?.pieceType");
    expect(containerSource).toContain("launchDelayMs:");
    expect(containerSource).toContain("preLaunchDelayMs:");
  });
});
