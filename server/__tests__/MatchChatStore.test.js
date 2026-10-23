import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const modulePath = path.join(repoRoot, "server", "chat", "MatchChatStore.js");

const loadMatchChatStore = async () => {
  expect(fs.existsSync(modulePath)).toBe(true);
  const href = pathToFileURL(modulePath).href;
  const importedModule = await import(`${href}?t=${Date.now()}`);
  return importedModule.MatchChatStore;
};

describe("MatchChatStore", () => {
  it("normalizes bgio chat payloads into retained archive rows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-08T13:10:00.000Z"));

    const MatchChatStore = await loadMatchChatStore();
    const store = new MatchChatStore();

    store.onChatMessage("m1", {
      id: "chat_1",
      sender: "0",
      payload: { message: " gg " },
    });

    expect(store.getMessages("m1")).toEqual([
      {
        id: "chat_1",
        seq: 1,
        actorId: "0",
        messageText: "gg",
        createdAt: "2026-04-08T13:10:00.000Z",
      },
    ]);

    vi.useRealTimers();
  });
});
