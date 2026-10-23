import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const modulePath = path.join(
  repoRoot,
  "server",
  "lifecycle",
  "FinishedMatchRetentionManager.js"
);

const loadFinishedMatchRetentionManager = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href;
  const importedModule = await import(`${href}?t=${Date.now()}`);
  return importedModule.FinishedMatchRetentionManager;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("FinishedMatchRetentionManager", () => {
  it("cleans up only after a finished match is archived and everyone disconnects", async () => {
    vi.useFakeTimers();

    const FinishedMatchRetentionManager =
      await loadFinishedMatchRetentionManager();
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const matchChatStore = { clear: vi.fn() };
    const onCleanup = vi.fn();
    const manager = new FinishedMatchRetentionManager({
      cleanupArchivedMatch,
      matchChatStore,
      onCleanup,
      graceMs: 10,
    });

    manager.onState("m1", {
      ctx: { gameover: { winner: "0" } },
    });
    manager.onMatchData("m1", [
      { id: "0", isConnected: false },
      { id: "1", isConnected: false },
    ]);

    vi.advanceTimersByTime(10);
    await Promise.resolve();
    expect(cleanupArchivedMatch).not.toHaveBeenCalled();

    manager.onArchived("m1");
    vi.advanceTimersByTime(9);
    expect(cleanupArchivedMatch).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(cleanupArchivedMatch).toHaveBeenCalledWith({ matchID: "m1" });
    expect(matchChatStore.clear).toHaveBeenCalledWith("m1");
    expect(onCleanup).toHaveBeenCalledWith({ matchID: "m1" });
    expect(manager.matches.has("m1")).toBe(false);
  });

  it("cancels cleanup if someone reconnects before the grace timer expires", async () => {
    vi.useFakeTimers();

    const FinishedMatchRetentionManager =
      await loadFinishedMatchRetentionManager();
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const manager = new FinishedMatchRetentionManager({
      cleanupArchivedMatch,
      graceMs: 10,
    });

    manager.onState("m1", {
      ctx: { gameover: { winner: "0" } },
    });
    manager.onArchived("m1");
    manager.onMatchData("m1", [
      { id: "0", isConnected: false },
      { id: "1", isConnected: false },
    ]);

    vi.advanceTimersByTime(5);
    manager.onMatchData("m1", [
      { id: "0", isConnected: true },
      { id: "1", isConnected: false },
    ]);

    await vi.advanceTimersByTimeAsync(10);

    expect(cleanupArchivedMatch).not.toHaveBeenCalled();
  });

  it("deleteMatch clears pending retention timers", async () => {
    vi.useFakeTimers();

    const FinishedMatchRetentionManager =
      await loadFinishedMatchRetentionManager();
    const cleanupArchivedMatch = vi.fn().mockResolvedValue(undefined);
    const manager = new FinishedMatchRetentionManager({
      cleanupArchivedMatch,
      graceMs: 10,
    });

    manager.onState("m1", {
      ctx: { gameover: { winner: "0" } },
    });
    manager.onArchived("m1");
    manager.onMatchData("m1", [
      { id: "0", isConnected: false },
      { id: "1", isConnected: false },
    ]);

    manager.deleteMatch("m1");
    await vi.advanceTimersByTimeAsync(10);

    expect(cleanupArchivedMatch).not.toHaveBeenCalled();
    expect(manager.matches.has("m1")).toBe(false);
  });
});
