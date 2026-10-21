import { spawn } from "node:child_process";

export function killProcessTree(
  child,
  {
    platform = process.platform,
    kill = process.kill,
    spawnProcess = spawn
  } = {}
) {
  if (platform === "win32" && child.pid) {
    const killer = spawnProcess(
      "taskkill",
      ["/pid", String(child.pid), "/T", "/F"],
      { stdio: "ignore", windowsHide: true }
    );
    const fallback = () => child.kill("SIGKILL");
    killer.once("error", fallback);
    killer.once("close", (code) => {
      if (code !== 0) fallback();
    });
    return;
  }

  if (child.pid) {
    try {
      kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // The process may not have formed a group; kill the direct child below.
    }
  }

  child.kill("SIGKILL");
}
