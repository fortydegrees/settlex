import pg from "pg";

const { Pool } = pg;
const LOCAL_DEVELOPMENT_DATABASE_URL =
  "postgres://settlehex:settlehex@localhost:55432/settlehex";
const BUILD_TIME_DATABASE_URL =
  "postgres://settlehex:settlehex@postgres:5432/settlehex";

let cachedPool = null;
let cachedConnectionString = null;

export const getDatabaseUrl = ({ connectionString = process.env.DATABASE_URL } = {}) => {
  const resolved = connectionString?.trim();
  if (resolved) return resolved;
  if (process.env.SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS === "1") {
    return BUILD_TIME_DATABASE_URL;
  }
  if (process.env.NODE_ENV !== "production") {
    return LOCAL_DEVELOPMENT_DATABASE_URL;
  }
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
  // pg emits "error" on the pool when an idle client's connection dies
  // (db restart, failover). Without a listener that event throws and
  // kills the process.
  cachedPool.on("error", (error) => {
    console.error("Postgres pool idle-client error", error);
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
