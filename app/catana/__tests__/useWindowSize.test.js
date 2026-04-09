import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_WINDOW_SIZE,
  getInitialWindowSize,
} from "../utils/useWindowSize";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useWindowSize helpers", () => {
  it("uses a shared fallback viewport size when window is unavailable", async () => {
    vi.stubGlobal("window", undefined);

    expect(getInitialWindowSize()).toEqual(DEFAULT_WINDOW_SIZE);
  });

  it("reads the current window dimensions when available", async () => {
    vi.stubGlobal("window", {
      innerWidth: 1234,
      innerHeight: 777,
    });

    expect(getInitialWindowSize()).toEqual({
      width: 1234,
      height: 777,
    });
  });
});
