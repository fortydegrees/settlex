import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readCatanaSource = (fileName) =>
  fs.readFileSync(path.resolve(__dirname, "..", fileName), "utf8");
const devCardSource = fs.readFileSync(
  path.resolve(__dirname, "..", "components", "DevCardDisplay.js"),
  "utf8"
);

const expectPlacementPointerBatching = (source) => {
  expect(source).toContain("const pointerSyncFrameRef = useRef(null);");
  expect(source).toContain("const flushPointerSync = () => {");
  expect(source).toMatch(
    /pointerSyncFrameRef\.current = null;\s+syncDesiredPosition\(\);/
  );
  expect(source).toContain(
    "pointerSyncFrameRef.current = requestAnimationFrame(flushPointerSync);"
  );
  expect(source).toMatch(
    /if \(pointerSyncFrameRef\.current == null\) \{\s+pointerSyncFrameRef\.current = requestAnimationFrame\(flushPointerSync\);/
  );
  expect(source).toContain(
    "cancelAnimationFrame(pointerSyncFrameRef.current);"
  );
};

describe("pointer frame batching", () => {
  it("batches build placement target synchronization", () => {
    expectPlacementPointerBatching(readCatanaSource("BuildPlacementPreview.js"));
  });

  it("batches robber placement target synchronization", () => {
    expectPlacementPointerBatching(readCatanaSource("RobberPlacementPreview.js"));
  });

  it("batches and cleans up development-card pointer updates", () => {
    expect(devCardSource).toContain("const pointerUpdateFrameRef = useRef(null);");
    expect(devCardSource).toContain("const latestPointerClientXRef = useRef(null);");
    expect(devCardSource).toContain(
      "pointerUpdateFrameRef.current = requestAnimationFrame(flushPointerUpdate);"
    );
    expect(devCardSource).toMatch(
      /if \(pointerUpdateFrameRef\.current == null\) \{\s+pointerUpdateFrameRef\.current = requestAnimationFrame\(flushPointerUpdate\);/
    );
    expect(devCardSource).toContain(
      "cancelAnimationFrame(pointerUpdateFrameRef.current);"
    );
    expect(devCardSource).toContain("useEffect(() => cancelPointerUpdate");
    expect(devCardSource).toContain("onMouseLeave={handlePointerLeave}");
  });
});
