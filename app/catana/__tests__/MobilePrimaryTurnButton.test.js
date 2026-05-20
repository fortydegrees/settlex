import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const buttonPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobilePrimaryTurnButton.js"
);

describe("MobilePrimaryTurnButton source", () => {
  it("renders only roll and end-turn as large mobile CTAs", () => {
    const source = fs.readFileSync(buttonPath, "utf8");

    expect(source).toContain('mode === "roll"');
    expect(source).toContain('mode === "endTurn"');
    expect(source).toContain('if (!isRoll && !isEndTurn) return null;');
    expect(source).toContain("Roll Dice");
    expect(source).toContain("End Turn");
  });

  it("keeps the primary action state explicit and accessible", () => {
    const source = fs.readFileSync(buttonPath, "utf8");

    expect(source).toContain("aria-label={ariaLabel}");
    expect(source).toContain("disabled={!isEnabled || isBusy}");
    expect(source).toContain("mobile-primary-turn-button--roll");
    expect(source).toContain("mobile-primary-turn-button--end-turn");
  });

  it("requires hold-to-confirm for mobile end turn only", () => {
    const source = fs.readFileSync(buttonPath, "utf8");

    expect(source).toContain("END_TURN_HOLD_MS = 1000");
    expect(source).toContain('ariaLabel = isRoll ? "Roll dice" : "Hold to end turn"');
    expect(source).toContain("startEndTurnHold");
    expect(source).toContain("cancelEndTurnHold");
    expect(source).toContain("onPointerDown={handlePointerDown}");
    expect(source).toContain("onPointerUp={handlePointerUp}");
    expect(source).toContain("onContextMenu={handleContextMenu}");
    expect(source).toContain("onClick={handleClick}");
    expect(source).toContain("transitionDuration: `${END_TURN_HOLD_MS}ms`");
  });
});
