import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { SettleGraphV2Client } from "../../server/bots/SettleGraphV2Client.js";

const model = JSON.parse(readFileSync(new URL("../../release/bot-model.json", import.meta.url), "utf8"));

export async function checkProductionBot({
  env = process.env,
  createClient = (options) => new SettleGraphV2Client(options),
} = {}) {
  if (env.SETTLEX_SETTLEGRAPH_V2_ENABLED !== "1") return { enabled: false };
  for (const key of ["SETTLEX_SETTLEGRAPH_V2_MODEL", "SETTLEX_SETTLEGRAPH_V2_WORKER"]) {
    if (!env[key]?.trim()) throw new Error(`${key} is required when the production bot is enabled.`);
  }
  const client = createClient({
    modelPath: env.SETTLEX_SETTLEGRAPH_V2_MODEL,
    workerPath: env.SETTLEX_SETTLEGRAPH_V2_WORKER,
    timeoutMs: 10_000,
  });
  try {
    const health = await client.start();
    if (health.modelSha256 !== model.sha256) {
      throw new Error(`Production requires checkpoint ${model.checkpoint}; received ${health.modelSha256}.`);
    }
    return { enabled: true, modelSha256: health.modelSha256 };
  } finally {
    client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await checkProductionBot()));
  } catch (error) {
    console.error(`Production bot preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
