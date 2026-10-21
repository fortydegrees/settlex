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

describe("getPool error resilience", () => {
  it("attaches an error listener so idle-client errors do not crash the process", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { getPool, resetPoolForTests } = await import("../db/getPool.js");
    const pool = getPool({ connectionString: "postgres://example" });

    try {
      expect(pool.listenerCount("error")).toBeGreaterThan(0);
      // With no listener this emit would throw (and kill the process in prod).
      expect(() => pool.emit("error", new Error("idle client lost"))).not.toThrow();
    } finally {
      await resetPoolForTests();
      consoleError.mockRestore();
    }
  });
});
