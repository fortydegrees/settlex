import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(
  __dirname,
  "..",
  "components",
  "DevCardDisplay.css"
);

describe("DevCardDisplay disabled styling", () => {
  it("uses a full-bleed veil instead of an inset framed overlay", () => {
    const css = fs.readFileSync(cssPath, "utf8");
    const stackCardBlock =
      css.match(/\.devcard-stack-card\s*{([^}]*)}/s)?.[1] ?? "";
    const veilBlock = css.match(/\.devcard-card::after\s*{([^}]*)}/s)?.[1] ?? "";
    const stackVeilBlock =
      css.match(/\.devcard-stack-card::after\s*{([^}]*)}/s)?.[1] ?? "";
    const disabledVeilBlock =
      css.match(/\.devcard-disabled \.devcard-stack-card::after\s*{([^}]*)}/s)?.[1] ??
      "";

    expect(stackCardBlock).toContain("overflow: hidden;");
    expect(veilBlock).toContain("inset: 0;");
    expect(veilBlock).toContain("border-radius: inherit;");
    expect(stackVeilBlock).toContain("inset: 0;");
    expect(stackVeilBlock).toContain("border-radius: inherit;");
    expect(css).not.toMatch(/inset:\s*4px 3px;/);
    expect(disabledVeilBlock).not.toContain("box-shadow");
  });
});
