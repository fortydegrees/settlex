import { open, unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import pg from "pg";
import { getDatabaseUrl } from "../../lib/server/db/getPool.js";
import { getArchivedNotation } from "../../lib/server/replays/getArchivedNotation.js";

const createDedicatedPool = () => new pg.Pool({ connectionString: getDatabaseUrl() });

export const exportArchivedNotation = async ({ replayId, out, getNotation = getArchivedNotation, pool, poolFactory = createDedicatedPool, openFile = open } = {}) => {
  if (!replayId || !out) throw new Error("--replay-id and --out are required");
  const ownsPool = !pool;
  const db = pool ?? poolFactory();
  const onIdleError = () => console.error("Notation export pool idle-client error");
  if (ownsPool) db.on?.("error", onIdleError);
  try {
    const stored = await getNotation(replayId, { pool: db });
    if (stored?.status !== "ready" || !stored.record) throw new Error("Stored notation is not ready");
    const payload = `${JSON.stringify(stored.record, null, 2)}\n`;
    let file;
    try {
      file = await openFile(out, "wx", 0o600);
      await file.writeFile(payload, "utf8");
      await file.close();
      file = null;
    } catch (error) {
      if (file) {
        try { await file.close(); } catch { /* retain the original failure */ }
        try { await unlink(out); } catch { /* retain the original failure */ }
      }
      throw error;
    }
  } finally {
    if (ownsPool) {
      await db.end();
      db.off?.("error", onIdleError);
    }
  }
};

const runCli = async () => {
  const args = process.argv.slice(2);
  const read = (flag) => {
    const index = args.indexOf(flag);
    return index < 0 ? null : args[index + 1];
  };
  await exportArchivedNotation({ replayId: read("--replay-id"), out: read("--out") });
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    console.error(error?.code === "EEXIST" ? "Output file already exists" : error?.message ?? "Notation export failed");
    process.exitCode = 1;
  });
}
