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
const dockStylesPath = path.resolve(
  __dirname,
  "..",
  "components",
  "ActionsDock",
  "dockStyles.css"
);
const actionContainerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);
const localDockModelPath = path.resolve(
  __dirname,
  "..",
  "components",
  "useLocalPlayerDockModel.js"
);

describe("Dock build pickup UX", () => {
  it("removes dock magnify and looping bounce while wiring build pickup state", () => {
    const dockSource = fs.readFileSync(dockPath, "utf8");
    const cardSource = fs.readFileSync(dockCardPath, "utf8");
    const dockStylesSource = fs.readFileSync(dockStylesPath, "utf8");
    const containerSource = fs.readFileSync(actionContainerPath, "utf8");
    const localDockModelSource = fs.readFileSync(localDockModelPath, "utf8");

    expect(dockSource).not.toContain("DOCK_ZOOM_LIMIT");
    expect(dockSource).not.toContain("clamp");
    expect(cardSource).not.toContain("loop:");
    expect(cardSource).not.toContain("Math.cos");
    expect(cardSource).toContain("preLaunchDelayMs");
    expect(cardSource).toContain("onContextMenu={handleContextMenu}");
    expect(cardSource).toContain("iconScaleX");
    expect(cardSource).toContain("iconScaleY");
    expect(cardSource).toContain("iconY");
    expect(cardSource).toContain("PRELAUNCH_REBOUND_DELAY_MS");
    expect(cardSource).toContain("ICON_PRELAUNCH_ANTICIPATION_CONFIG");
    expect(cardSource).toContain("ICON_PRELAUNCH_REBOUND_CONFIG");
    expect(cardSource).toContain("ICON_PRELAUNCH_SETTLE_CONFIG");
    expect(cardSource).not.toContain("ICON_PRELAUNCH_PRESS_IN_CONFIG");
    expect(cardSource).not.toContain("ICON_PRELAUNCH_RELEASE_CONFIG");
    expect(localDockModelSource).toContain("BUILD_PICKUP_PRELAUNCH_DELAY_MS = 132");
    expect(dockStylesSource).toContain(".card__img-shell");
    expect(dockStylesSource).toContain(".card__img {\n    width: 80%");
    expect(dockStylesSource).not.toContain("&__img-shell");
    expect(dockStylesSource).not.toContain("&__img {");
    expect(containerSource).toContain("setBuildPickup");
    expect(containerSource).toContain("getBuildPickupPieceType");
    expect(localDockModelSource).toContain("buildPickup?.pieceType");
    expect(containerSource).toContain("launchDelayMs:");
    expect(localDockModelSource).toContain("preLaunchDelayMs:");
  });
});
