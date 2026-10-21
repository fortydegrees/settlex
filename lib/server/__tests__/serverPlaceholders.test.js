import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthSecret } from "../auth/betterAuth.js";
import { getDatabaseUrl } from "../db/getPool.js";

describe("server build-time placeholders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps production auth secret required at runtime", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS", "");

    expect(() => getAuthSecret()).toThrow(
      "BETTER_AUTH_SECRET is required in production"
    );
  });

  it("allows build-time server placeholders for Next route collection", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS", "1");

    expect(getAuthSecret()).toContain("build-time-only");
    expect(getDatabaseUrl()).toContain("postgres://");
  });

  it("prefers real production server configuration when provided", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("BETTER_AUTH_SECRET", "real-secret");
    vi.stubEnv("DATABASE_URL", "postgres://real-db");
    vi.stubEnv("SETTLEX_ALLOW_BUILD_TIME_SERVER_PLACEHOLDERS", "1");

    expect(getAuthSecret()).toBe("real-secret");
    expect(getDatabaseUrl()).toBe("postgres://real-db");
  });
});
