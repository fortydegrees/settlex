import { pathToFileURL } from "node:url";
import { SettleGraphV2Client } from "../../server/bots/SettleGraphV2Client.js";
import { readBotModelSelection } from "../../lib/server/bots/modelSelection.js";

export async function checkProductionBot({
  env = process.env,
  createClient = (options) => new SettleGraphV2Client(options),
} = {}) {
  if (env.SETTLEX_SETTLEGRAPH_V2_ENABLED !== "1") return { enabled: false };
  for (const key of ["SETTLEX_SETTLEGRAPH_V2_WORKER"]) {
    if (!env[key]?.trim()) throw new Error(`${key} is required when the production bot is enabled.`);
  }
  const model = readBotModelSelection({ env });
  const client = createClient({
    modelPath: model.modelPath,
    expectedModel: model,
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
