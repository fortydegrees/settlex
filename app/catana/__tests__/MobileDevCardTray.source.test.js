import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(
  __dirname,
  "..",
  "components",
  "MobileDevCardTray.js"
);

describe("MobileDevCardTray source", () => {
  it("renders grouped development cards from the shared hand model", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("getDevCardHandGroups");
    expect(source).toContain("DEV_CARD_SVGS");
    expect(source).toContain("DEV_CARD_TEXT");
  });

  it("uses a compact persistent tray layer without a screen-blocking backdrop", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("relative z-10 mx-auto");
    expect(source).toContain("w-fit min-w-[7.25rem] max-w-full overflow-hidden");
    expect(source).toContain("data-mobile-devcard-tray");
    expect(source).not.toContain("fixed inset-0");
    expect(source).not.toContain("Close development cards");
  });

  it("keeps expanded cards icon-led without a visible text row", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("const MOBILE_TRAY_CARD_WIDTH = 36");
    expect(source).toContain("[scrollbar-width:none]");
    expect(source).toContain('aria-label={`${text.name}${cardCountLabel}`}');
    expect(source).not.toContain("max-w-[4.6rem]");
  });

  it("only plays selectable dev-card groups and closes after selection", () => {
    const source = fs.readFileSync(componentPath, "utf8");

    expect(source).toContain("aria-disabled={!isPlayable}");
    expect(source).toContain("onPlayCard?.(group.type)");
    expect(source).toContain("onClose?.()");
    expect(source).toContain("onContextMenu={(event) => event.preventDefault()}");
  });
});
