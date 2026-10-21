import { describe, expect, it } from "vitest";
import {
  compareFastAndExactV3,
  passesV3Calibration
} from "../analysis/oracleCalibrationV3.mjs";

describe("duel-fair-v3 oracle calibration metrics", () => {
  it("measures direction, median advantage error, and fairness Spearman", () => {
    const metrics = compareFastAndExactV3([
      { seed: 1, fastAdvantage: -0.08, exactAdvantage: -0.10, fastFairness: 60, exactFairness: 50 },
      { seed: 2, fastAdvantage: 0.01, exactAdvantage: 0.02, fastFairness: 90, exactFairness: 80 },
      { seed: 3, fastAdvantage: 0.10, exactAdvantage: 0.09, fastFairness: 40, exactFairness: 30 },
      { seed: 4, fastAdvantage: 0, exactAdvantage: 0, fastFairness: 100, exactFairness: 100 }
    ]);

    expect(metrics.signAgreement).toBe(4);
    expect(metrics.medianAbsoluteAdvantageError).toBeCloseTo(0.01, 10);
    expect(metrics.fairnessSpearman).toBe(1);
  });

  it("assigns average ranks for tied fairness scores", () => {
    const metrics = compareFastAndExactV3([
      { seed: 1, fastAdvantage: 0, exactAdvantage: 0, fastFairness: 10, exactFairness: 10 },
      { seed: 2, fastAdvantage: 0, exactAdvantage: 0, fastFairness: 10, exactFairness: 10 },
      { seed: 3, fastAdvantage: 0, exactAdvantage: 0, fastFairness: 30, exactFairness: 30 }
    ]);

    expect(metrics.fairnessSpearman).toBe(1);
  });

  it("enforces all three fixed acceptance thresholds", () => {
    expect(passesV3Calibration({
      signAgreement: 10,
      medianAbsoluteAdvantageError: 0.03,
      fairnessSpearman: 0.85
    })).toBe(true);
    expect(passesV3Calibration({
      signAgreement: 9,
      medianAbsoluteAdvantageError: 0.03,
      fairnessSpearman: 0.85
    })).toBe(false);
  });
});
