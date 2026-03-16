import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const emojiPortIconDir = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "public",
  "svgs",
  "palette-themes",
  "emoji"
);

const PORT_ICON_FILES = [
  "port_icon_any.svg",
  "port_icon_wood.svg",
  "port_icon_brick.svg",
  "port_icon_sheep.svg",
  "port_icon_wheat.svg",
  "port_icon_ore.svg",
];

describe("Port icon assets", () => {
  it("uses the softer sand-brown ink across the dedicated emoji port icons", () => {
    PORT_ICON_FILES.forEach((fileName) => {
      const source = fs.readFileSync(path.join(emojiPortIconDir, fileName), "utf8");
      expect(source).toContain("#A8986F");
      expect(source).not.toContain("#212121");
    });
  });

  it("uses the tile brick silhouette for the dedicated brick port icon", () => {
    const source = fs.readFileSync(path.join(emojiPortIconDir, "port_icon_brick.svg"), "utf8");
    expect(source).toContain("M22 2");
    expect(source).toContain('rect x="21" y="6" width="30" height="14"');
    expect(source).not.toContain("M5 2C3.34315");
  });
});
