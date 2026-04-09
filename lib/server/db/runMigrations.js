import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, "sql");
export const MIGRATIONS_TABLE = "settlehex_migrations";

const ensureMigrationsTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const listMigrationFiles = async (migrationsDir) => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
};

const loadAppliedMigrationNames = async (client) => {
  const result = await client.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename ASC`
  );
  return new Set(result.rows.map((row) => row.filename));
};

export const runMigrations = async ({
  pool,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
} = {}) => {
  if (!pool?.connect) {
    throw new Error("runMigrations requires a pool with connect()");
  }

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const appliedNames = await loadAppliedMigrationNames(client);
    const migrationFiles = await listMigrationFiles(migrationsDir);
    const pendingFiles = migrationFiles.filter((filename) => !appliedNames.has(filename));
    const appliedMigrations = [];

    for (const filename of pendingFiles) {
      const filePath = path.join(migrationsDir, filename);
      const sql = await fs.readFile(filePath, "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
          [filename]
        );
        await client.query("COMMIT");
        appliedMigrations.push(filename);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Failed applying migration ${filename}: ${error.message}`);
      }
    }

    return {
      appliedMigrations,
      pendingMigrations: pendingFiles,
      migrationsDir,
    };
  } finally {
    client.release();
  }
};
