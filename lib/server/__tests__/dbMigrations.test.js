import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const dbRoot = path.join(repoRoot, "lib", "server", "db");
const sqlRoot = path.join(dbRoot, "sql");
const migrationsModulePath = path.join(dbRoot, "runMigrations.js");

const readRepoFile = (...segments) =>
  fs.readFileSync(path.join(repoRoot, ...segments), "utf8");

const tempDirs = [];

afterEach(() => {
  vi.resetModules();
  while (tempDirs.length > 0) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

const createTempMigrationsDir = (files) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "settlex-migrations-"));
  tempDirs.push(tempDir);
  Object.entries(files).forEach(([name, contents]) => {
    fs.writeFileSync(path.join(tempDir, name), contents);
  });
  return tempDir;
};

const createFakePool = ({ existingRows = [] } = {}) => {
  const executed = [];
  const fakeClient = {
    query: vi.fn(async (sql, params) => {
      executed.push({ sql: String(sql), params });
      if (/select filename from settlex_migrations/i.test(String(sql))) {
        return { rows: existingRows };
      }
      return { rows: [] };
    }),
    release: vi.fn(),
  };

  return {
    executed,
    fakePool: {
      connect: vi.fn(async () => fakeClient),
    },
    fakeClient,
  };
};

describe("db migrations", () => {
  it("declares postgres scripts and env docs for local development", () => {
    const packageJson = readRepoFile("package.json");
    const envExamplePath = path.join(repoRoot, ".env.example");
    const migrateScriptPath = path.join(repoRoot, "scripts", "db", "migrate.mjs");

    expect(packageJson).toContain('"pg"');
    expect(packageJson).toContain('"db:migrate"');
    expect(packageJson).toContain('"db:migrate:test"');
    expect(packageJson).toContain("postgres://settlex:settlex@localhost:55432/settlex");
    expect(packageJson).toContain("postgres://settlex:settlex@localhost:55432/settlex_test");
    expect(fs.existsSync(envExamplePath)).toBe(true);
    expect(fs.existsSync(migrateScriptPath)).toBe(true);

    const envExample = readRepoFile(".env.example");
    expect(envExample).toContain("DATABASE_URL=");
  });

  it("ships SQL migrations for accounts/archive and magic links", () => {
    const firstMigrationPath = path.join(sqlRoot, "0001_accounts_archive.sql");
    const secondMigrationPath = path.join(sqlRoot, "0002_magic_links.sql");

    expect(fs.existsSync(firstMigrationPath)).toBe(true);
    expect(fs.existsSync(secondMigrationPath)).toBe(true);

    const firstMigration = fs.readFileSync(firstMigrationPath, "utf8").toLowerCase();
    const secondMigration = fs.readFileSync(secondMigrationPath, "utf8").toLowerCase();

    expect(firstMigration).toContain("create table if not exists settlex_migrations");
    expect(firstMigration).toContain("create table if not exists accounts");
    expect(firstMigration).toContain("create table if not exists guest_sessions");
    expect(firstMigration).toContain("create table if not exists archived_matches");
    expect(secondMigration).toContain("create table if not exists magic_link_tokens");
  });

  it("applies pending migrations in filename order and records each one", async () => {
    expect(fs.existsSync(migrationsModulePath)).toBe(true);
    const { runMigrations } = await import(pathToFileURL(migrationsModulePath).href);

    const migrationsDir = createTempMigrationsDir({
      "0002_second.sql": "select 2;",
      "0001_first.sql": "select 1;",
    });
    const { executed, fakePool, fakeClient } = createFakePool();

    const result = await runMigrations({ pool: fakePool, migrationsDir });

    expect(fakePool.connect).toHaveBeenCalledTimes(1);
    expect(fakeClient.release).toHaveBeenCalledTimes(1);
    expect(result.appliedMigrations).toEqual(["0001_first.sql", "0002_second.sql"]);

    const statements = executed.map(({ sql, params }) => ({
      sql: sql.trim(),
      params,
    }));

    const appliedSql = statements.map(({ sql }) => sql);
    expect(appliedSql.some((sql) => /create table if not exists settlex_migrations/i.test(sql))).toBe(true);
    expect(appliedSql).toContain("BEGIN");
    expect(appliedSql).toContain("select 1;");
    expect(appliedSql).toContain("select 2;");

    const firstSqlIndex = appliedSql.indexOf("select 1;");
    const secondSqlIndex = appliedSql.indexOf("select 2;");
    expect(firstSqlIndex).toBeLessThan(secondSqlIndex);

    const insertedNames = statements
      .filter(({ sql }) => /insert into settlex_migrations/i.test(sql))
      .map(({ params }) => params?.[0]);
    expect(insertedNames).toEqual(["0001_first.sql", "0002_second.sql"]);
  });

  it("skips migrations that are already recorded", async () => {
    expect(fs.existsSync(migrationsModulePath)).toBe(true);
    const { runMigrations } = await import(pathToFileURL(migrationsModulePath).href);

    const migrationsDir = createTempMigrationsDir({
      "0001_first.sql": "select 1;",
      "0002_second.sql": "select 2;",
    });
    const { executed, fakePool } = createFakePool({
      existingRows: [
        { filename: "0001_first.sql" },
        { filename: "0002_second.sql" },
      ],
    });

    const result = await runMigrations({ pool: fakePool, migrationsDir });

    expect(result.appliedMigrations).toEqual([]);
    expect(executed.some(({ sql }) => sql.trim() === "BEGIN")).toBe(false);
    expect(executed.some(({ sql }) => sql.includes("select 1;"))).toBe(false);
    expect(executed.some(({ sql }) => sql.includes("select 2;"))).toBe(false);
  });
});
