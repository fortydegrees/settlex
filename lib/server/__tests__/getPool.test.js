import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(async () => {
  vi.resetModules();
  delete process.env.DATABASE_URL;
});

describe("getPool database url resolution", () => {
  it("defaults local development to the settlehex postgres database", async () => {
    const { getDatabaseUrl } = await import("../db/getPool.js");

    expect(getDatabaseUrl()).toBe(
      "postgres://settlehex:settlehex@localhost:55432/settlehex"
    );
  });

  it("prefers an explicit DATABASE_URL when provided", async () => {
    process.env.DATABASE_URL = "postgres://example";
    const { getDatabaseUrl } = await import("../db/getPool.js");

    expect(getDatabaseUrl()).toBe("postgres://example");
  });
});
