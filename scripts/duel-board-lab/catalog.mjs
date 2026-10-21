import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { publishCatalog } from "./lib/catalog.mjs";

const { values } = parseArgs({
  options: {
    "run-id": { type: "string" },
    family: { type: "string" },
    "catalog-id": { type: "string" },
    size: { type: "string" },
    "data-output": { type: "string" },
    "runtime-output": { type: "string" }
  },
  strict: true
});

const required = (name) => {
  const value = values[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`--${name} is required`);
  }
  return value;
};

const size = Number(required("size"));
if (!Number.isInteger(size) || size <= 0) {
  throw new Error("--size must be a positive integer");
}

const runId = required("run-id");
const family = required("family");
const result = await publishCatalog({
  runDir: resolve("tmp", "duel-board-lab", "runs", runId, family),
  catalogId: required("catalog-id"),
  size,
  dataOutput: required("data-output"),
  runtimeOutput: required("runtime-output")
});

console.log(JSON.stringify({
  catalogId: result.catalog.id,
  entryCount: result.catalog.entries.length,
  dataOutput: result.dataOutput,
  runtimeOutput: result.runtimeOutput
}, null, 2));
