import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveCatana = (...parts) => path.resolve(__dirname, "..", ...parts);

const resolveComponent = (...parts) =>
  resolveCatana("components", ...parts);

const readFile = (relativePath) =>
  fs.readFileSync(resolveCatana(relativePath), "utf8");

const readComponent = (relativePath) => readFile(path.join("components", relativePath));

describe("Catana UI images", () => {
  it("marks NextImage as non-draggable by default", () => {
    const contents = readComponent("NextImage.js");
    expect(contents).toMatch(/draggable\s*=\s*false/);
  });

  it("disables dragging on resource bar icons", () => {
    const contents = readComponent("PlayerActionContainer.js");
    expect(contents).toMatch(/getResourceIconPath[\s\S]*draggable=\{false\}/);
  });

  it("uses one uniform resource bar icon size", () => {
    const contents = readComponent("PlayerActionContainer.js");
    expect(contents).toMatch(/className="h-10 w-10 object-contain"/);
    expect(contents).not.toMatch(/className="h-9"/);
  });

  it("disables dragging on action dock icons", () => {
    const contents = readComponent(path.join("ActionsDock", "DockCard.js"));
    expect(contents).toMatch(/<img[\s\S]*draggable=\{false\}/);
  });

  it("disables dragging on game log resource icons", () => {
    const contents = readComponent("GameLogPanel.js");
    expect(contents).toMatch(/<img[\s\S]*draggable=\{false\}/);
  });

  it("disables dragging on trade/discard modal icons", () => {
    const contents = readComponent("TradeDiscardModal.js");
    expect(contents).toMatch(/<img[\s\S]*draggable=\{false\}/);
  });

  it("disables dragging on animated resource cards", () => {
    const contents = readFile("Card.js");
    expect(contents).toMatch(/<img[\s\S]*draggable=\{false\}/);
  });
});
