from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]
HOST_PATH = REPO_ROOT / "ai" / "pufferlib" / "js" / "engine_host.cjs"
DEFAULT_NODE_BIN = os.environ.get("SETTLEX_NODE_BINARY", "node")


class SettlexHostError(RuntimeError):
    pass


class SettlexHostClient:
    def __init__(self, options: dict[str, Any] | None = None) -> None:
        self._options = options or {}
        self._proc = self._start_process()
        self._init_if_needed()

    def _start_process(self) -> subprocess.Popen[str]:
        if not HOST_PATH.exists():
            raise SettlexHostError(
                f"Missing host script: {HOST_PATH}. Did you create ai/pufferlib/js/engine_host.cjs?"
            )

        cmd = [DEFAULT_NODE_BIN, str(HOST_PATH)]
        return subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

    def _request(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self._proc.stdin or not self._proc.stdout:
            raise SettlexHostError("Host process streams are unavailable")

        line = json.dumps(payload)
        self._proc.stdin.write(line + "\n")
        self._proc.stdin.flush()

        response_line = self._proc.stdout.readline()
        if not response_line:
            stderr = ""
            if self._proc.stderr:
                stderr = self._proc.stderr.read()
            raise SettlexHostError(
                f"Host process exited unexpectedly. stderr={stderr.strip()}"
            )

        try:
            response = json.loads(response_line)
        except json.JSONDecodeError as exc:
            raise SettlexHostError(
                f"Invalid JSON from host: {response_line.strip()}"
            ) from exc

        if not response.get("ok"):
            raise SettlexHostError(response.get("error", "Unknown host error"))

        return response["result"]

    def _init_if_needed(self) -> None:
        if self._options:
            self._request({"cmd": "init", "options": self._options})

    def spec(self) -> dict[str, Any]:
        return self._request({"cmd": "spec"})

    def reset(self, seed: int | None = None) -> dict[str, Any]:
        return self._request({"cmd": "reset", "seed": seed or 0})

    def step(self, action: int) -> dict[str, Any]:
        return self._request({"cmd": "step", "action": int(action)})

    def close(self) -> None:
        if self._proc.poll() is not None:
            return

        try:
            self._request({"cmd": "close"})
        except SettlexHostError:
            pass
        finally:
            self._proc.terminate()
            try:
                self._proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                self._proc.kill()

    def __enter__(self) -> "SettlexHostClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()
