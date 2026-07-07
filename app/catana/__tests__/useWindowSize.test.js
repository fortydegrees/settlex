import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_WINDOW_SIZE,
  getInitialWindowSize,
  getMeasuredWindowSize,
  getUnmeasuredWindowSize,
} from "../utils/useWindowSize";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useWindowSize helpers", () => {
  it("uses a shared fallback viewport size when window is unavailable", async () => {
    vi.stubGlobal("window", undefined);

    expect(getInitialWindowSize()).toEqual(DEFAULT_WINDOW_SIZE);
  });

  it("marks the fallback viewport as unmeasured", async () => {
    expect(getUnmeasuredWindowSize()).toEqual({
      ...DEFAULT_WINDOW_SIZE,
      isMeasured: false,
    });
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

  it("marks browser viewport dimensions as measured", async () => {
    vi.stubGlobal("window", {
      innerWidth: 1234,
      innerHeight: 777,
    });

    expect(getMeasuredWindowSize()).toEqual({
      width: 1234,
      height: 777,
      isMeasured: true,
    });
  });
});
