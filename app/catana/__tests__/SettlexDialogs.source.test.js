import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Settlex dialog wrappers", () => {
  it("builds Dialog on Base UI with the stronger shared popup chrome", () => {
    const source = readFileSync(resolve(process.cwd(), "app/ui/Dialog.js"), "utf8");

    expect(source).toContain("@base-ui/react/dialog");
    expect(source).toContain("settlex-ui-dialog-backdrop");
    expect(source).toContain("settlex-ui-dialog-popup");
    expect(source).toContain("rounded-[1.75rem]");
    expect(source).toContain("backdrop-blur-xl");
  });

  it("builds AlertDialog on Base UI with the same overlay shell", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/ui/AlertDialog.js"),
      "utf8"
    );

    expect(source).toContain("@base-ui/react/alert-dialog");
    expect(source).toContain("cancelLabel");
    expect(source).toContain("confirmLabel");
    expect(source).toContain("rounded-[1.75rem]");
    expect(source).toContain("backdrop-blur-xl");
  });
});
