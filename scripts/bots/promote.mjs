import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SettleGraphV2Client } from "../../server/bots/SettleGraphV2Client.js";
import { resolveBotModelPath, validateBotModelSelection } from "../../lib/server/bots/modelSelection.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const digest = (filename) => createHash("sha256").update(fs.readFileSync(filename)).digest("hex");

export async function promoteBotModel({
  modelPath, checkpoint, sha256, directory = path.join(repoRoot, ".local/bot"),
  workerPath = process.env.SETTLEX_SETTLEGRAPH_V2_WORKER ?? path.join(repoRoot, "native/settlegraph-v2/target/release/settlegraph-v2-worker"),
  observationVersion = 3,
  createClient = (options) => new SettleGraphV2Client(options)
}) {
  const selection = validateBotModelSelection({ checkpoint, displayName: `SettleGraph ${checkpoint}`, sha256,
    observationVersion, observationDim: observationVersion === 3 ? 1464 : 1445,
    actionCount: 299, relativePath: `models/${checkpoint}/model.ctnn`, mode: "direct" });
  if (!modelPath) throw new Error("--model is required.");
  if (digest(modelPath) !== sha256) throw new Error("Source model SHA-256 mismatch; selection unchanged.");
  directory = path.resolve(directory);
  fs.mkdirSync(directory, { recursive: true });
  const lock = path.join(directory, ".promotion-lock");
  try { fs.mkdirSync(lock); }
  catch (error) { throw new Error(`Cannot acquire promotion lock ${lock}: ${error.message}`); }
  let temporary;
  try {
    const installedPath = resolveBotModelPath(directory, selection.relativePath);
    fs.mkdirSync(path.dirname(installedPath), { recursive: true });
    if (fs.existsSync(installedPath)) {
      if (digest(installedPath) !== sha256) throw new Error(`Checkpoint ${checkpoint} is immutable; use a new version identifier.`);
    } else {
      fs.copyFileSync(modelPath, installedPath, fs.constants.COPYFILE_EXCL);
    }
    if (digest(installedPath) !== sha256) throw new Error("Installed model SHA-256 mismatch; selection unchanged.");
    const options = { workerPath, modelPath: installedPath, expectedModel: selection, timeoutMs: 10_000,
      logger: { warn: (message) => console.error(message) } };
    const client = createClient(options);
    try {
      const health = await client.start();
      // Apply the real identity/contract checks even with a supplied transport.
      new SettleGraphV2Client(options).validateHealth(health);
    } finally { client.close(); }
    temporary = path.join(directory, `.current-${randomUUID()}.json`);
    const fd = fs.openSync(temporary, "wx", 0o644);
    try { fs.writeFileSync(fd, `${JSON.stringify(selection, null, 2)}\n`); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temporary, path.join(directory, "current.json"));
    return { ...selection, manifestPath: path.join(directory, "current.json"), modelPath: installedPath };
  } finally {
    if (temporary && fs.existsSync(temporary)) fs.unlinkSync(temporary);
    fs.rmdirSync(lock);
  }
}

function parseArgs(argv) {
  const names = { "--model": "modelPath", "--checkpoint": "checkpoint", "--sha256": "sha256",
    "--directory": "directory", "--worker": "workerPath", "--observation-version": "observationVersion" };
  const options = {};
  if (argv[0] === "--") argv = argv.slice(1);
  for (let i = 0; i < argv.length; i += 2) {
    const key = names[argv[i]];
    if (!key || !argv[i + 1] || argv[i + 1].startsWith("--") || key in options) throw new Error(`Invalid option ${argv[i]}.`);
    options[key] = key === "observationVersion" ? Number(argv[i + 1]) : argv[i + 1];
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--help")) {
    console.log("Usage: pnpm bot:promote -- --model FILE --checkpoint 008 --sha256 HASH [--directory DIR] [--worker FILE]");
  } else {
    try { console.log(JSON.stringify(await promoteBotModel(parseArgs(process.argv.slice(2))), null, 2)); }
    catch (error) { console.error(`Bot promotion failed: ${error.message}`); process.exitCode = 1; }
  }
}
