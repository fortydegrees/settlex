import { describe, expect, it } from "vitest";
import {
  parseCompareOptions,
  parseGenerateOptions,
  parseInspectOptions,
} from "../lib/cliOptions.mjs";

describe("duel board lab CLI", () => {
  it("parses a bounded deterministic run", () => {
    expect(
      parseGenerateOptions([
        "--family",
        "official-spiral",
        "--count",
        "100",
        "--start-seed",
        "20",
        "--run-id",
        "smoke",
      ]),
    ).toEqual({
      family: "official-spiral",
      count: 100,
      startSeed: 20,
      runId: "smoke",
      shortlistSize: 20,
      v2AuditSelections: false,
    });
  });

  it("enables exact v2 audits for generated selections", () => {
    expect(parseGenerateOptions([
      "--family",
      "official-spiral",
      "--count",
      "10",
      "--run-id",
      "v2-smoke",
      "--v2-audit-selections",
    ])).toEqual(expect.objectContaining({ v2AuditSelections: true }));
  });

  it("rejects invalid count and family values", () => {
    expect(() =>
      parseGenerateOptions([
        "--family",
        "unknown",
        "--count",
        "10",
        "--run-id",
        "bad",
      ]),
    ).toThrow("family must be official-spiral or freeform-random");
    expect(() =>
      parseGenerateOptions([
        "--family",
        "official-spiral",
        "--count",
        "0",
        "--run-id",
        "bad",
      ]),
    ).toThrow("count must be a positive integer");
  });

  it("keeps run identity and candidate family as separate inspect arguments", () => {
    expect(
      parseInspectOptions([
        "--run-id",
        "smoke",
        "--family",
        "official-spiral",
        "--candidate-index",
        "7",
      ]),
    ).toEqual({
      runId: "smoke",
      family: "official-spiral",
      candidateIndex: 7,
    });
  });

  it("parses compare count as a per-family count", () => {
    expect(
      parseCompareOptions([
        "--count",
        "100",
        "--start-seed",
        "5",
        "--run-id",
        "comparison-smoke",
      ]),
    ).toEqual({
      count: 100,
      startSeed: 5,
      runId: "comparison-smoke",
      shortlistSize: 20,
      v2AuditSelections: false,
    });
  });

  it("enables exact v2 audits for compared selections", () => {
    expect(parseCompareOptions([
      "--count",
      "10",
      "--run-id",
      "v2-comparison-smoke",
      "--v2-audit-selections",
    ])).toEqual(expect.objectContaining({ v2AuditSelections: true }));
  });

  it("rejects path traversal in run identity", () => {
    expect(() =>
      parseInspectOptions([
        "--run-id",
        "../outside",
        "--family",
        "official-spiral",
        "--candidate-index",
        "0",
      ]),
    ).toThrow("run-id must be 1-64 lowercase letters, numbers, or hyphens");
  });
});
