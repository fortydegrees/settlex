from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import gymnasium as gym
import numpy as np
import torch

from .policy import SettlexMaskedPolicy


class _DummyEnv:
    def __init__(self, obs_size: int, action_count: int):
        self.observation_space = gym.spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(obs_size,),
            dtype=np.float32,
        )
        self.action_space = gym.spaces.Discrete(action_count)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="JSONL inference worker for Settlex Puffer policy."
    )
    parser.add_argument("--checkpoint", required=True, type=str)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--stochastic", action="store_true")
    return parser.parse_args()


def infer_hidden_size(state_dict: dict[str, Any]) -> int:
    enc = state_dict.get("encoder.0.weight")
    if enc is None or len(enc.shape) != 2:
        raise ValueError("Checkpoint missing encoder.0.weight")
    return int(enc.shape[0])


def build_policy(
    checkpoint: Path, observation_size: int, action_count: int
) -> SettlexMaskedPolicy:
    state_dict = torch.load(checkpoint, map_location="cpu")
    hidden_size = infer_hidden_size(state_dict)
    env = _DummyEnv(observation_size, action_count)
    policy = SettlexMaskedPolicy(env, hidden_size=hidden_size)
    policy.load_state_dict(state_dict)
    policy.eval()
    return policy


def choose_action(
    policy: SettlexMaskedPolicy,
    observation: np.ndarray,
    action_mask: np.ndarray,
    stochastic: bool,
    rng: np.random.Generator,
) -> int:
    legal = np.flatnonzero(action_mask > 0.5)
    if legal.size == 0:
        return 0

    if observation.shape[0] < action_mask.shape[0]:
        raise ValueError("observation length must be >= action_mask length")

    # Ensure the observation tail exactly matches this request's legal mask.
    observation = observation.copy()
    observation[-action_mask.shape[0] :] = action_mask

    with torch.no_grad():
        obs_t = torch.from_numpy(observation).float().unsqueeze(0)
        logits, _ = policy.forward_eval(obs_t)
        logits = logits.squeeze(0)

    if stochastic:
        probs = torch.softmax(logits, dim=0).cpu().numpy()
        probs = np.nan_to_num(probs, nan=0.0, posinf=0.0, neginf=0.0)
        total = probs.sum()
        if total <= 0:
            return int(rng.choice(legal))
        probs = probs / total
        action = int(rng.choice(np.arange(probs.shape[0]), p=probs))
    else:
        action = int(torch.argmax(logits, dim=0).item())

    if action_mask[action] <= 0.5:
        action = int(legal[0])
    return action


def main() -> None:
    args = parse_args()
    checkpoint = Path(args.checkpoint).expanduser().resolve()
    if not checkpoint.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint}")

    policy: SettlexMaskedPolicy | None = None
    policy_obs_size: int | None = None
    policy_action_count: int | None = None
    rng = np.random.default_rng(args.seed)

    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue

        request_id: str | None = None
        response: dict[str, Any]
        try:
            request = json.loads(line)
            request_id = request.get("id")

            observation = np.asarray(request["observation"], dtype=np.float32)
            action_mask = np.asarray(request["action_mask"], dtype=np.float32)
            stochastic = bool(request.get("stochastic", args.stochastic))

            if observation.ndim != 1:
                raise ValueError("observation must be a 1D float array")
            if action_mask.ndim != 1:
                raise ValueError("action_mask must be a 1D float array")

            obs_size = int(observation.shape[0])
            action_count = int(action_mask.shape[0])

            if policy is None:
                policy = build_policy(checkpoint, obs_size, action_count)
                policy_obs_size = obs_size
                policy_action_count = action_count
            elif obs_size != policy_obs_size or action_count != policy_action_count:
                raise ValueError(
                    "Shape mismatch for loaded policy: "
                    f"expected obs={policy_obs_size}, actions={policy_action_count}, "
                    f"received obs={obs_size}, actions={action_count}"
                )

            action = choose_action(policy, observation, action_mask, stochastic, rng)
            response = {"id": request_id, "action": int(action)}
        except Exception as exc:
            response = {"id": request_id, "error": str(exc)}

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
