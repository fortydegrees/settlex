import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const localManifest = path.join(repoRoot, ".local/bot/current.json");
const bootstrapManifest = path.join(repoRoot, "release/bot-model.json");

export function validateBotModelSelection(model) {
  if (!model || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(model.checkpoint ?? "")) {
    throw new Error("Bot selection requires a valid checkpoint identifier.");
  }
  if (typeof model.displayName !== "string" || !model.displayName.trim() || model.displayName.length > 80) {
    throw new Error("Bot selection requires displayName.");
  }
  if (!/^[a-f0-9]{64}$/.test(model.sha256 ?? "")) throw new Error("Bot selection requires a lowercase SHA-256.");
  if (model.mode !== "direct") throw new Error("Bot model must use direct inference.");
  const dimension = { 2: 1445, 3: 1464 }[model.observationVersion];
  if (!dimension || model.observationDim !== dimension || model.actionCount !== 299) {
    throw new Error("Unsupported bot observation/action contract.");
  }
  if (typeof model.relativePath !== "string" || !model.relativePath || path.isAbsolute(model.relativePath)) {
    throw new Error("Bot model path must be relative to its manifest.");
  }
  if (model.relativePath.split(/[\\/]/).includes("..")) throw new Error("Bot model must stay inside its selection directory.");
  return model;
}

export function readBotModelSelection({ env = process.env, manifestPath } = {}) {
  const selectedPath = path.resolve(manifestPath ?? env.SETTLEX_BOT_MODEL_MANIFEST ??
    (fs.existsSync(localManifest) ? localManifest : bootstrapManifest));
  let model;
  try { model = JSON.parse(fs.readFileSync(selectedPath, "utf8")); }
  catch (error) { throw new Error(`Cannot read bot manifest ${selectedPath}: ${error.message}`); }
  validateBotModelSelection(model);
  const directory = path.dirname(selectedPath);
  const storedPath = path.resolve(directory, model.relativePath);
  const inside = (root, file) => file.startsWith(`${root}${path.sep}`);
  if (!inside(directory, storedPath)) throw new Error("Bot model must stay inside its selection directory.");
  if (fs.existsSync(storedPath) && !inside(fs.realpathSync(directory), fs.realpathSync(storedPath))) {
    throw new Error("Bot model symlink must stay inside its selection directory.");
  }
  // The old explicit model path remains a bootstrap-only compatibility option.
  const modelPath = selectedPath === bootstrapManifest && env.SETTLEX_SETTLEGRAPH_V2_MODEL
    ? path.resolve(env.SETTLEX_SETTLEGRAPH_V2_MODEL) : storedPath;
  return Object.freeze({ ...model, manifestPath: selectedPath, modelPath });
}

let selectedModel;
export function getBotModelSelection() {
  selectedModel ??= readBotModelSelection();
  return selectedModel;
}
