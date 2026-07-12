export function createEmptySummary() {
  return {
    count: 0,
    verdicts: { pass: 0, reject: 0, invalid: 0 },
    rejectionCodes: {},
    score: { min: null, max: null, mean: null },
    _scoreTotal: 0,
    _scoreCount: 0
  };
}

export function addRecordToSummary(summary, record) {
  summary.count += 1;
  summary.verdicts[record.verdict] += 1;
  for (const code of record.rejectionCodes ?? []) {
    summary.rejectionCodes[code] = (summary.rejectionCodes[code] ?? 0) + 1;
  }
  if (Number.isFinite(record.overallScore)) {
    summary.score.min = summary.score.min == null
      ? record.overallScore
      : Math.min(summary.score.min, record.overallScore);
    summary.score.max = summary.score.max == null
      ? record.overallScore
      : Math.max(summary.score.max, record.overallScore);
    summary._scoreTotal += record.overallScore;
    summary._scoreCount += 1;
  }
  return summary;
}

export function finaliseSummary(summary) {
  summary.score.mean = summary._scoreCount === 0
    ? null
    : summary._scoreTotal / summary._scoreCount;
  delete summary._scoreTotal;
  delete summary._scoreCount;
  return summary;
}

export function summariseRecords(records) {
  const summary = createEmptySummary();
  for (const record of records) addRecordToSummary(summary, record);
  return finaliseSummary(summary);
}
