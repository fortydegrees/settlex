import { parentPort, workerData } from "node:worker_threads";
import { exportSettlexNotationArchive } from "@settlex/game-core";
import { buildReplayFrames } from "../../../lib/server/replays/buildReplayFrames.js";

try {
  const { record } = exportSettlexNotationArchive(workerData, buildReplayFrames);
  parentPort.postMessage({ status: "ready", record });
} catch {
  // Source details may include hidden hands and deck order. Keep worker diagnostics fixed.
  parentPort.postMessage({ status: "unavailable", errorCode: "unsupported-source" });
}
