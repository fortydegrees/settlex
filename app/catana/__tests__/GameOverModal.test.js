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
  "GameOverModal.js"
);

describe("GameOverModal", () => {
  it("includes core CTA labels", () => {
    const contents = fs.readFileSync(componentPath, "utf8");
    expect(contents).toContain("View Postgame");
    expect(contents).toContain("Return to Lobby");
  });

  it("lets the parent own winner confetti state so remounts do not replay it", () => {
    const contents = fs.readFileSync(componentPath, "utf8");

    expect(contents).toContain("shouldFireConfetti");
    expect(contents).toContain("onConfettiFired");
    expect(contents).not.toContain("const confettiFired = useRef(false);");
  });
});
