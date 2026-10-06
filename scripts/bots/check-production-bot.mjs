import { pathToFileURL } from "node:url";
import { SettleGraphV2Client } from "../../server/bots/SettleGraphV2Client.js";
import { DEFAULT_BOT_WORKER_PATH, readBotModelSelection } from "../../lib/server/bots/modelSelection.js";

export async function checkProductionBot({
  env = process.env,
  requireEnabled = false,
  createClient = (options) => new SettleGraphV2Client({ ...options, logger: { warn: (message) => console.error(message) } }),
} = {}) {
  if (env.SETTLEX_SETTLEGRAPH_V2_ENABLED !== "1") {
    if (requireEnabled) throw new Error("Bot serving must be enabled before activation.");
    return { enabled: false };
  }
  const workerPath = env.SETTLEX_SETTLEGRAPH_V2_WORKER ?? DEFAULT_BOT_WORKER_PATH;
  if (!workerPath.trim()) throw new Error("SETTLEX_SETTLEGRAPH_V2_WORKER cannot be empty.");
  const model = readBotModelSelection({ env });
  const client = createClient({
    modelPath: model.modelPath,
    expectedModel: model,
    workerPath,
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
    console.log(JSON.stringify(await checkProductionBot({ requireEnabled: process.argv.includes("--require-enabled") })));
  } catch (error) {
    console.error(`Production bot preflight failed: ${error.message}`);
    process.exitCode = 1;
  }
}
