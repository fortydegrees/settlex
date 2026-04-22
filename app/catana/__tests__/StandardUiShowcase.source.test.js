import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const read = (relativePath) =>
  fs.readFileSync(
    fileURLToPath(new URL(relativePath, import.meta.url)),
    "utf8"
  );

describe("Standard UI showcase source", () => {
  it("keeps the showcase route development-only", () => {
    const source = read("../dev/ui/page.js");

    expect(source).toContain('process.env.NODE_ENV !== "development"');
    expect(source).toContain("notFound()");
    expect(source).toContain("UiShowcaseClient");
  });

  it("builds the showcase client from shared Settlex UI primitives", () => {
    const source = read("../dev/ui/UiShowcaseClient.js");

    expect(source).toContain('from "../../../ui/Panel"');
    expect(source).toContain('from "../../../ui/Button"');
    expect(source).toContain('from "../../../ui/Banner"');
    expect(source).toContain('from "../../../ui/Input"');
    expect(source).toContain('from "../../../ui/Select"');
    expect(source).toContain('from "../../../ui/Dialog"');
    expect(source).toContain('from "../../../ui/AlertDialog"');
    expect(source).toContain("Settlex Standard UI");
    expect(source).toContain("Button Recipes");
    expect(source).toContain("Overlay Preview");
    expect(source).toContain("setDialogOpen");
    expect(source).toContain("setAlertOpen");
    expect(source).not.toContain("Current Pass");
    expect(source).not.toContain("Liquid Glass");
    expect(source).not.toContain("Motion-Accent CTA");
    expect(source).not.toContain("setActiveVariant");
    expect(source).toContain("open={dialogOpen}");
    expect(source).toContain("open={alertOpen}");
  });
});
