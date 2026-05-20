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

  it("gates the timer text behind the composed status visibility flag", () => {
    const source = fs.readFileSync(localDockModelPath, "utf8");
    const containerSource = fs.readFileSync(containerPath, "utf8");

    expect(source).toContain(
      "const showStatusTimer = gameStatus?.showTimer !== false && Boolean(timerText);"
    );
    expect(source).toContain("LOW_TIMER_THRESHOLD_SECONDS = 5");
    expect(source).toContain("LOW_TIMER_ALERT_SUPPRESSED_STATUS_KINDS = new Set([");
    expect(source).toContain('"waiting_for_roll"');
    expect(source).toContain('"waiting_for_roll_other"');
    expect(source).toContain(
      'LOW_TIMER_ALERT_SUPPRESSED_STATUS_TYPES = new Set(["rolling"])'
    );
    expect(source).toContain(
      "const isLowTimerAlertSuppressed ="
    );
    expect(source).toContain("isLowTimerAlertActive:");
    expect(source).toContain("getTimerSeconds(timerMs) <= LOW_TIMER_THRESHOLD_SECONDS");
    expect(containerSource).toContain("isTimerLow={isLowTimerAlertActive}");
    expect(source).toContain("getTurnControlMode");
    expect(containerSource).toContain("showTurnControls");
    expect(containerSource).toContain("rollContent={");
    expect(containerSource).not.toContain("Status box - between dice and end turn");
  });
});
