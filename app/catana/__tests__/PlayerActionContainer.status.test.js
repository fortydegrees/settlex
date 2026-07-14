import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const containerPath = path.resolve(
  __dirname,
  "..",
  "components",
  "PlayerActionContainer.js"
);
const localDockModelPath = path.resolve(
  __dirname,
  "..",
  "components",
  "useLocalPlayerDockModel.js"
);

describe("PlayerActionContainer status presentation source", () => {
  it("renders the viewer-aware status title instead of the legacy text field", () => {
    const source = fs.readFileSync(containerPath, "utf8");

    expect(source).toContain("gameStatus.title");
    expect(source).toContain("TurnControlCluster");
    expect(source).not.toContain("gameStatus.text");
  });

  it("delegates live countdown work to the timer leaf", () => {
    const source = fs.readFileSync(containerPath, "utf8");
    const localDockSource = fs.readFileSync(localDockModelPath, "utf8");

    expect(source).toContain("timerSnapshot");
    expect(source).toContain("timerStatusType={statusType}");
    expect(source).toContain("timerStatusKind={gameStatus?.kind}");
    expect(source).not.toContain("timerText={timerText}");
    expect(source).not.toContain("isTimerLow={isLowTimerAlertActive}");
    expect(localDockSource).not.toContain("formatTimer");
    expect(localDockSource).not.toContain("LOW_TIMER_THRESHOLD_SECONDS");
    expect(localDockSource).toContain("getTurnControlMode");
  });
});
