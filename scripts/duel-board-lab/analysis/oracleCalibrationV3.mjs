const ZERO_EPSILON = 1e-12;

function sign(value) {
  if (Math.abs(value) <= ZERO_EPSILON) return 0;
  return value < 0 ? -1 : 1;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function averageRanks(values) {
  const indexed = values.map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value || left.index - right.index);
  const ranks = Array(values.length);
  for (let start = 0; start < indexed.length;) {
    let end = start + 1;
    while (end < indexed.length && indexed[end].value === indexed[start].value) end += 1;
    const averageRank = ((start + 1) + end) / 2;
    for (let index = start; index < end; index += 1) ranks[indexed[index].index] = averageRank;
    start = end;
  }
  return ranks;
}

function pearson(left, right) {
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let covariance = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    covariance += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  }
  if (leftVariance === 0 || rightVariance === 0) {
    return left.every((value, index) => value === right[index]) ? 1 : 0;
  }
  return covariance / Math.sqrt(leftVariance * rightVariance);
}

export function compareFastAndExactV3(rows) {
  if (rows.length === 0) throw new Error("oracle-v3-rows-required");
  const signAgreement = rows.filter(
    (row) => sign(row.fastAdvantage) === sign(row.exactAdvantage)
  ).length;
  const medianAbsoluteAdvantageError = median(rows.map(
    (row) => Math.abs(row.fastAdvantage - row.exactAdvantage)
  ));
  const fairnessSpearman = pearson(
    averageRanks(rows.map((row) => row.fastFairness)),
    averageRanks(rows.map((row) => row.exactFairness))
  );
  return Object.freeze({
    rows: Object.freeze(rows.map((row) => Object.freeze({ ...row }))),
    signAgreement,
    medianAbsoluteAdvantageError,
    fairnessSpearman
  });
}

export function passesV3Calibration(metrics) {
  return metrics.signAgreement >= 10
    && metrics.medianAbsoluteAdvantageError <= 0.03
    && metrics.fairnessSpearman >= 0.85;
}
