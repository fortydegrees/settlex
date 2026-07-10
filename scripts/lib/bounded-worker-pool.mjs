export function resolveConcurrency(rawValue, availableCpuCount) {
  const fallback = Math.max(1, Math.min(4, availableCpuCount));
  if (rawValue == null || rawValue === "") {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 8) {
    throw new Error(
      "SETTLEX_APP_TEST_CONCURRENCY must be an integer from 1 to 8"
    );
  }
  return parsed;
}

export async function runBounded(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let firstError = null;

  async function runWorker() {
    while (!firstError && nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await worker(items[index], index);
      } catch (error) {
        firstError ??= error;
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      runWorker
    )
  );

  if (firstError) {
    throw firstError;
  }
  return results;
}
