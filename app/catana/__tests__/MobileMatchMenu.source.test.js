import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const menuPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobileMatchMenu.js"
);

describe("MobileMatchMenu source", () => {
  it("owns the compact phone utility popover and its match actions", () => {
    const exists = fs.existsSync(menuPath);
    expect(exists).toBe(true);

    const source = exists ? fs.readFileSync(menuPath, "utf8") : "";

    expect(source).toContain('from "../../ui/Popover"');
    expect(source).toContain("EllipsisHorizontalIcon");
    expect(source).toContain("SpeakerWaveIcon");
    expect(source).toContain("SpeakerXMarkIcon");
    expect(source).toContain('triggerAriaLabel="Open match menu"');
    expect(source).toContain('data-mobile-match-menu="true"');
    expect(source).toContain("Sound");
    expect(source).toContain("Game rules");
    expect(source).toContain("Settings");
    expect(source).toContain("Resign match");
    expect(source).toContain("onToggleMute?.()");
    expect(source).toContain("onOpenGameRules?.()");
    expect(source).toContain("onOpenGameSettings?.()");
    expect(source).toContain("onResign?.()");
  });
});
