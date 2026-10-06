import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const localManifest = path.join(repoRoot, ".local/bot/current.json");
const bootstrapManifest = path.join(repoRoot, "release/bot-model.json");

export function validateBotModelSelection(model) {
  if (!model || typeof model.checkpoint !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(model.checkpoint)) {
    throw new Error("Bot selection requires a valid checkpoint identifier.");
  }
  if (typeof model.displayName !== "string" || !model.displayName.trim() || model.displayName.length > 80) {
    throw new Error("Bot selection requires displayName.");
  }
  if (!/^[a-f0-9]{64}$/.test(model.sha256 ?? "")) throw new Error("Bot selection requires a lowercase SHA-256.");
  if (model.mode !== "direct") throw new Error("Bot model must use direct inference.");
  const dimension = model.observationVersion === 2 ? 1445 : model.observationVersion === 3 ? 1464 : null;
  if (!dimension || model.observationDim !== dimension || model.actionCount !== 299) {
    throw new Error("Unsupported bot observation/action contract.");
  }
  if (typeof model.relativePath !== "string" || !model.relativePath || path.isAbsolute(model.relativePath)) {
    throw new Error("Bot model path must be relative to its manifest.");
  }
  if (model.relativePath.split(/[\\/]/).includes("..")) throw new Error("Bot model must stay inside its selection directory.");
  return model;
}

export function resolveBotModelPath(directory, relativePath) {
  const root = path.resolve(directory);
  const storedPath = path.resolve(root, relativePath);
  const inside = (base, file) => file.startsWith(`${base}${path.sep}`);
  if (!inside(root, storedPath)) throw new Error("Bot model must stay inside its selection directory.");
  let ancestor = storedPath;
  while (!fs.existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realRoot = fs.realpathSync(root);
  const realAncestor = fs.realpathSync(ancestor);
  if (realAncestor !== realRoot && !inside(realRoot, realAncestor)) {
    throw new Error("Bot model symlink must stay inside its selection directory.");
  }
  return storedPath;
}

export function readBotModelSelection({ env = process.env, manifestPath } = {}) {
  const selectedPath = path.resolve(manifestPath ?? env.SETTLEX_BOT_MODEL_MANIFEST ??
    (fs.existsSync(localManifest) ? localManifest : bootstrapManifest));
  let model;
  try { model = JSON.parse(fs.readFileSync(selectedPath, "utf8")); }
  catch (error) { throw new Error(`Cannot read bot manifest ${selectedPath}: ${error.message}`); }
  validateBotModelSelection(model);
  const directory = path.dirname(selectedPath);
  const storedPath = resolveBotModelPath(directory, model.relativePath);
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
