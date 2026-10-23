import { mkdtemp, open, readFile, rm, stat } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { getArchivedNotation } from "../../lib/server/replays/getArchivedNotation.js";
import { exportArchivedNotation } from "../../scripts/notation/export-archived.mjs";
import { getPool, resetPoolForTests } from "../../lib/server/db/getPool.js";

describe("stored notation access", () => {
  it("distinguishes ready, unavailable, historical and missing rows without conversion", async () => {
    const pool = { query: vi.fn(async (_sql, params) => ({ rows: params[0] === "missing" ? [] : [{
      notation_json: params[0] === "ready" ? { format: "han-prototype", coverage: "complete" } : null,
      notation_status: params[0] === "ready" ? "ready" : params[0] === "old" ? "not-recorded" : "unavailable",
      notation_error_code: params[0] === "bad" ? "unsupported-source" : null,
    }] })) };
    expect(await getArchivedNotation("ready", { pool })).toEqual({ status: "ready", record: { format: "han-prototype", coverage: "complete" } });
    expect(await getArchivedNotation("bad", { pool })).toEqual({ status: "unavailable", errorCode: "unsupported-source" });
    expect(await getArchivedNotation("old", { pool })).toEqual({ status: "not-recorded" });
    expect(await getArchivedNotation("missing", { pool })).toBeNull();
  });

  it("exports only a stored ready record and preserves an existing output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "settlehex-notation-"));
    const out = join(dir, "game.han.json");
    const record = { format: "han-prototype", coverage: "complete", actions: ["E"] };
    const getNotation = vi.fn(async () => ({ status: "ready", record }));
    try {
      await exportArchivedNotation({ replayId: "r1", out, getNotation, pool: {} });
      expect(JSON.parse(await readFile(out, "utf8"))).toEqual(record);
      await expect(exportArchivedNotation({ replayId: "r1", out, getNotation, pool: {} })).rejects.toMatchObject({ code: "EEXIST" });
      expect(JSON.parse(await readFile(out, "utf8"))).toEqual(record);
      await expect(exportArchivedNotation({ replayId: "r2", out: join(dir, "absent.json"), getNotation: async () => ({ status: "not-recorded" }), pool: {} })).rejects.toThrow(/not ready/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("closes only an export-owned pool", async () => {
    const owned = { end: vi.fn(async () => {}) };
    await expect(exportArchivedNotation({ replayId: "old", out: "/unused", poolFactory: () => owned,
      getNotation: async () => ({ status: "not-recorded" }) })).rejects.toThrow(/not ready/);
    expect(owned.end).toHaveBeenCalledOnce();
    const supplied = { end: vi.fn() };
    await expect(exportArchivedNotation({ replayId: "old", out: "/unused", pool: supplied,
      getNotation: async () => ({ status: "not-recorded" }) })).rejects.toThrow(/not ready/);
    expect(supplied.end).not.toHaveBeenCalled();
  });

  it("does not close a previously cached application pool", async () => {
    const connectionString = "postgres://test:test@127.0.0.1:9/test";
    const shared = getPool({ connectionString });
    try {
      await expect(exportArchivedNotation({ replayId: "old", out: "/unused",
        getNotation: async () => ({ status: "not-recorded" }) })).rejects.toThrow(/not ready/);
      expect(getPool({ connectionString })).toBe(shared);
      expect(shared.ended).toBe(false);
    } finally {
      await resetPoolForTests();
    }
  });

  it("removes only a newly created partial output after a failed write", async () => {
    const dir = await mkdtemp(join(tmpdir(), "settlehex-notation-partial-"));
    const out = join(dir, "partial.han.json");
    try {
      await expect(exportArchivedNotation({ replayId: "r1", out, pool: {},
        getNotation: async () => ({ status: "ready", record: { format: "han-prototype" } }),
        openFile: async (...args) => {
          const file = await open(...args);
          return { writeFile: async () => { await file.writeFile("partial"); throw new Error("disk full"); }, close: () => file.close() };
        },
      })).rejects.toThrow("disk full");
      await expect(stat(out)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("survives an owned pool idle error while writing without exposing its detail", async () => {
    const dir = await mkdtemp(join(tmpdir(), "settlehex-notation-pool-error-"));
    const out = join(dir, "game.han.json");
    const owned = new EventEmitter();
    owned.end = vi.fn(async () => {});
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await exportArchivedNotation({ replayId: "r1", out, poolFactory: () => owned,
        getNotation: async () => ({ status: "ready", record: { format: "han-prototype" } }),
        openFile: async (...args) => {
          const file = await open(...args);
          return { writeFile: async (value) => {
            owned.emit("error", new Error("credential=secret"));
            await file.writeFile(value);
          }, close: () => file.close() };
        },
      });
      expect(JSON.parse(await readFile(out, "utf8"))).toEqual({ format: "han-prototype" });
      expect(owned.end).toHaveBeenCalledOnce();
      expect(logged).toHaveBeenCalledWith("Notation export pool idle-client error");
      expect(JSON.stringify(logged.mock.calls)).not.toContain("secret");
    } finally {
      logged.mockRestore();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
