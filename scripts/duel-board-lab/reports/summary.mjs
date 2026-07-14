const SCORE_NAMES = Object.freeze(["overall", "fairness", "quality", "interest"]);

export function createEmptySummary() {
  return { count: 0, _mode: null };
}

function initialiseLegacy(summary) {
  summary._mode = "legacy";
  summary.verdicts = { pass: 0, reject: 0, invalid: 0 };
  summary.rejectionCodes = {};
  summary.score = { min: null, max: null, mean: null };
  summary._scoreTotal = 0;
  summary._scoreCount = 0;
}

function initialiseV3(summary) {
  summary._mode = "v3";
  summary.statuses = { ranked: 0, invalid: 0 };
  summary.invalidCodes = {};
  summary.tags = {};
  summary._scoreValues = Object.fromEntries(SCORE_NAMES.map((name) => [name, []]));
}

function addLegacyRecord(summary, record) {
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
}

function addV3Record(summary, record) {
  summary.statuses[record.status] += 1;
  for (const code of record.invalidCodes ?? []) {
    summary.invalidCodes[code] = (summary.invalidCodes[code] ?? 0) + 1;
  }
  for (const tag of record.tags ?? []) summary.tags[tag] = (summary.tags[tag] ?? 0) + 1;
  if (record.status !== "ranked") return;
  summary._scoreValues.overall.push(record.overallScore);
  for (const name of SCORE_NAMES.slice(1)) summary._scoreValues[name].push(record.scores[name]);
}

export function addRecordToSummary(summary, record) {
  if (summary._mode === null) {
    if (record.status !== undefined) initialiseV3(summary);
    else initialiseLegacy(summary);
  }
  if (summary._mode === "v3" && record.status === undefined) {
    throw new Error("cannot mix v3 and historical summary records");
  }
  if (summary._mode === "legacy" && record.status !== undefined) {
    throw new Error("cannot mix historical and v3 summary records");
  }
  summary.count += 1;
  if (summary._mode === "v3") addV3Record(summary, record);
  else addLegacyRecord(summary, record);
  return summary;
}

function distribution(values) {
  if (values.length === 0) return { min: null, median: null, max: null };
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
  return { min: sorted[0], median, max: sorted[sorted.length - 1] };
}

export function finaliseSummary(summary) {
  if (summary._mode === null) initialiseLegacy(summary);
  if (summary._mode === "v3") {
    summary.scores = Object.fromEntries(SCORE_NAMES.map(
      (name) => [name, distribution(summary._scoreValues[name])]
    ));
    delete summary._scoreValues;
  } else {
    summary.score.mean = summary._scoreCount === 0
      ? null
      : summary._scoreTotal / summary._scoreCount;
    delete summary._scoreTotal;
    delete summary._scoreCount;
  }
  delete summary._mode;
  return summary;
}

export function summariseRecords(records) {
  const summary = createEmptySummary();
  for (const record of records) addRecordToSummary(summary, record);
  return finaliseSummary(summary);
}
