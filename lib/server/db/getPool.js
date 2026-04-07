import pg from "pg";

const { Pool } = pg;

let cachedPool = null;
let cachedConnectionString = null;

export const getDatabaseUrl = ({ connectionString = process.env.DATABASE_URL } = {}) => {
  const resolved = connectionString?.trim();
  if (resolved) return resolved;
  throw new Error("DATABASE_URL is required");
};

export const getPool = ({ connectionString } = {}) => {
  const resolvedConnectionString = getDatabaseUrl({ connectionString });

  if (cachedPool && cachedConnectionString === resolvedConnectionString) {
    return cachedPool;
  }

  cachedPool = new Pool({
    connectionString: resolvedConnectionString,
  });
  cachedConnectionString = resolvedConnectionString;
  return cachedPool;
};

export const resetPoolForTests = async () => {
  if (!cachedPool) return;
  const pool = cachedPool;
  cachedPool = null;
  cachedConnectionString = null;
  await pool.end();
};
