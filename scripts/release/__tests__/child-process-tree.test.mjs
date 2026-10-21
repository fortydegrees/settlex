import { describe, expect, it, vi } from "vitest";

import { killProcessTree } from "../../lib/child-process-tree.mjs";

describe("killProcessTree", () => {
  it("force-kills the detached process group on POSIX", () => {
    const kill = vi.fn();
    const child = { pid: 42, kill: vi.fn() };

    killProcessTree(child, { platform: "darwin", kill });

    expect(kill).toHaveBeenCalledWith(-42, "SIGKILL");
    expect(child.kill).not.toHaveBeenCalled();
  });

  it("falls back to the direct child if the process group is already gone", () => {
    const kill = vi.fn(() => {
      throw new Error("missing group");
    });
    const child = { pid: 42, kill: vi.fn() };

    killProcessTree(child, { platform: "linux", kill });

    expect(child.kill).toHaveBeenCalledWith("SIGKILL");
  });
});
