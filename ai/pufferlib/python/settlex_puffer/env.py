from __future__ import annotations

from typing import Any

import gymnasium as gym
import numpy as np

from .bridge import SettlexHostClient


class SettlexGymEnv(gym.Env):
    metadata = {"render_modes": []}

    def __init__(self, host_options: dict[str, Any] | None = None):
        super().__init__()
        self._client = SettlexHostClient(options=host_options or {})
        self._spec = self._client.spec()

        self.action_space = gym.spaces.Discrete(self._spec["actionCount"])
        self.observation_space = gym.spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(self._spec["observationSize"],),
            dtype=np.float32,
        )

        self._last_action_mask = np.zeros(self.action_space.n, dtype=np.int8)
        self._last_actor_id = "0"
        self._last_mode = "placement_settlement"

    @property
    def spec_info(self) -> dict[str, Any]:
        return self._spec

    @property
    def last_action_mask(self) -> np.ndarray:
        return self._last_action_mask

    def _convert(self, payload: dict[str, Any]):
        observation = np.asarray(payload["observation"], dtype=np.float32)
        action_mask = np.asarray(payload["actionMask"], dtype=np.int8)

        self._last_action_mask = action_mask
        self._last_actor_id = str(payload.get("actorId", "0"))
        self._last_mode = str(payload.get("mode", "unknown"))

        info = dict(payload.get("info") or {})
        info["action_mask"] = action_mask
        info["actor_id"] = self._last_actor_id
        info["mode"] = self._last_mode

        reward = float(payload.get("reward", 0.0))
        done = bool(payload.get("done", False))
        truncated = bool(payload.get("truncated", False))

        return observation, reward, done, truncated, info

    def reset(self, *, seed: int | None = None, options: dict[str, Any] | None = None):
        del options
        payload = self._client.reset(seed if seed is not None else 0)
        observation, _, _, _, info = self._convert(payload)
        return observation, info

    def step(self, action: int):
        payload = self._client.step(int(action))
        observation, reward, done, truncated, info = self._convert(payload)
        return observation, reward, done, truncated, info

    def render(self):
        return None

    def close(self):
        if getattr(self, "_client", None) is not None:
            self._client.close()
            self._client = None
