import { getPool } from "../../lib/server/db/getPool.js";
import { runMigrations } from "../../lib/server/db/runMigrations.js";

const pool = getPool();

try {
  const { appliedMigrations } = await runMigrations({ pool });
  if (appliedMigrations.length === 0) {
    console.log("No pending migrations.");
  } else {
    console.log(`Applied ${appliedMigrations.length} migration(s):`);
    appliedMigrations.forEach((filename) => {
      console.log(`- ${filename}`);
    });
  }
} finally {
  await pool.end();
}
