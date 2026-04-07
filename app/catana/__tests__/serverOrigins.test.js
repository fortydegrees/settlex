import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_GAME_SERVER_ORIGIN = process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN;
const ORIGINAL_WINDOW = global.window;

const setWindowLocation = (location) => {
  global.window = { location };
};

const loadServerOrigins = async () => {
  vi.resetModules();
  return import("../utils/serverOrigins.js");
};

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;

  if (ORIGINAL_GAME_SERVER_ORIGIN == null) {
    delete process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN;
  } else {
    process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN = ORIGINAL_GAME_SERVER_ORIGIN;
  }

  if (ORIGINAL_WINDOW === undefined) {
    delete global.window;
  } else {
    global.window = ORIGINAL_WINDOW;
  }
});

describe("serverOrigins", () => {
  it("uses the configured public origin for lobby and game clients", async () => {
    process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN = "https://settlex.example";

    const { getGameServerOrigin, getLobbyServerOrigin } =
      await loadServerOrigins();

    expect(getLobbyServerOrigin()).toBe("https://settlex.example");
    expect(getGameServerOrigin()).toBe("https://settlex.example");
  });

  it("uses same-origin in production when no explicit origin is configured", async () => {
    delete process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN;
    process.env.NODE_ENV = "production";
    setWindowLocation({
      origin: "http://145.241.244.120",
      protocol: "http:",
      hostname: "145.241.244.120"
    });

    const { getGameServerOrigin, getLobbyServerOrigin } =
      await loadServerOrigins();

    expect(getLobbyServerOrigin()).toBe("http://145.241.244.120");
    expect(getGameServerOrigin()).toBe("http://145.241.244.120");
  });

  it("keeps split dev ports locally when no explicit origin is configured", async () => {
    delete process.env.NEXT_PUBLIC_GAME_SERVER_ORIGIN;
    process.env.NODE_ENV = "development";
    setWindowLocation({
      origin: "http://localhost:3000",
      protocol: "http:",
      hostname: "localhost"
    });

    const { getGameServerOrigin, getLobbyServerOrigin } =
      await loadServerOrigins();

    expect(getLobbyServerOrigin()).toBe("http://localhost:8080");
    expect(getGameServerOrigin()).toBe("http://localhost:8000");
  });
});
