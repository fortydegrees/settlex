from __future__ import annotations

import argparse
import json
import sys
import re
from pathlib import Path
from typing import Any

import gymnasium as gym
import numpy as np
import torch

from .policy import SettlexMaskedPolicy
from .policy_factorized import SettlexFactorizedPolicy


class _DummyEnv:
    def __init__(self, obs_size: int, action_count: int, spec_info: dict[str, Any] | None = None):
        self.observation_space = gym.spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(obs_size,),
            dtype=np.float32,
        )
        self.action_space = gym.spaces.Discrete(action_count)
        self.spec_info = spec_info or {}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="JSONL inference worker for Settlex Puffer policy."
    )
    parser.add_argument("--checkpoint", required=True, type=str)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--stochastic", action="store_true")
    parser.add_argument("--attention-heads", type=int, default=4)
    parser.add_argument("--attention-layers", type=int, default=0)
    return parser.parse_args()


def infer_hidden_size_masked(state_dict: dict[str, Any]) -> int:
    enc = state_dict.get("encoder.0.weight")
    if enc is None or len(enc.shape) != 2:
        raise ValueError("Checkpoint missing encoder.0.weight")
    return int(enc.shape[0])


def infer_hidden_size_factorized(state_dict: dict[str, Any]) -> int:
    proj = state_dict.get("global_proj.weight")
    if proj is None or len(proj.shape) != 2:
        raise ValueError("Checkpoint missing global_proj.weight")
    return int(proj.shape[0])


def infer_attention_layers(state_dict: dict[str, Any]) -> int:
    pattern = re.compile(r"^blocks\.(\d+)\.attn\.in_proj_weight$")
    indices: list[int] = []
    for key in state_dict.keys():
        match = pattern.match(key)
        if match:
            indices.append(int(match.group(1)))
    if not indices:
        return 1
    return max(indices) + 1


def infer_policy_arch(state_dict: dict[str, Any]) -> str:
    if "global_proj.weight" in state_dict:
        return "factorized-relational"
    return "masked-mlp"


def build_policy(
    checkpoint: Path,
    observation_size: int,
    action_count: int,
    spec_info: dict[str, Any] | None = None,
    attention_heads: int = 4,
    attention_layers: int | None = None,
) -> tuple[Any, str]:
    state_dict = torch.load(checkpoint, map_location="cpu")
    arch = infer_policy_arch(state_dict)

    if arch == "factorized-relational":
        if not spec_info:
            raise ValueError("Factorized policy requires spec metadata in inference request.")
        hidden_size = infer_hidden_size_factorized(state_dict)
        inferred_layers = infer_attention_layers(state_dict)
        env = _DummyEnv(observation_size, action_count, spec_info=spec_info)
        policy = SettlexFactorizedPolicy(
            env,
            hidden_size=hidden_size,
            attention_heads=attention_heads,
            attention_layers=attention_layers or inferred_layers,
            spec_info=spec_info,
        )
    else:
        hidden_size = infer_hidden_size_masked(state_dict)
        env = _DummyEnv(observation_size, action_count, spec_info=spec_info)
        policy = SettlexMaskedPolicy(env, hidden_size=hidden_size)

    policy.load_state_dict(state_dict)
    policy.eval()
    return policy, arch


def choose_action(
    policy,
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


def evaluate_batch(
    policy,
    observations: np.ndarray,
    action_masks: np.ndarray,
) -> np.ndarray:
    if observations.ndim != 2:
        raise ValueError("observations must be a 2D float array")
    if action_masks.ndim != 2:
        raise ValueError("action_masks must be a 2D float array")
    if observations.shape[0] != action_masks.shape[0]:
        raise ValueError("observations and action_masks batch size must match")
    if observations.shape[1] < action_masks.shape[1]:
        raise ValueError("each observation length must be >= each action mask length")

    patched = observations.copy()
    patched[:, -action_masks.shape[1] :] = action_masks

    with torch.no_grad():
        obs_t = torch.from_numpy(patched).float()
        _, values = policy.forward_eval(obs_t)
    return values.squeeze(-1).cpu().numpy()


def score_actions(
    policy,
    observation: np.ndarray,
    action_mask: np.ndarray,
) -> tuple[np.ndarray, float]:
    if observation.ndim != 1:
        raise ValueError("observation must be a 1D float array")
    if action_mask.ndim != 1:
        raise ValueError("action_mask must be a 1D float array")
    if observation.shape[0] < action_mask.shape[0]:
        raise ValueError("observation length must be >= action_mask length")

    patched = observation.copy()
    patched[-action_mask.shape[0] :] = action_mask

    with torch.no_grad():
        obs_t = torch.from_numpy(patched).float().unsqueeze(0)
        logits, values = policy.forward_eval(obs_t)
    return logits.squeeze(0).cpu().numpy(), float(values.squeeze().cpu().item())


def main() -> None:
    args = parse_args()
    checkpoint = Path(args.checkpoint).expanduser().resolve()
    if not checkpoint.exists():
        raise FileNotFoundError(f"Checkpoint not found: {checkpoint}")

    policy = None
    policy_arch: str | None = None
    policy_obs_size: int | None = None
    policy_action_count: int | None = None
    policy_observation_hash: str | None = None
    policy_action_hash: str | None = None
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
            mode = str(request.get("mode", "act"))
            request_spec = request.get("spec") or {}
            request_observation_hash = request_spec.get("observationSchemaHash")
            request_action_hash = request_spec.get("actionSpaceHash")

            if policy is None:
                if mode == "eval_batch":
                    observations = np.asarray(request["observations"], dtype=np.float32)
                    action_masks = np.asarray(request["action_masks"], dtype=np.float32)
                    if observations.ndim != 2 or action_masks.ndim != 2:
                        raise ValueError("eval_batch requires 2D observations/action_masks")
                    obs_size = int(observations.shape[1])
                    action_count = int(action_masks.shape[1])
                else:
                    observation = np.asarray(request["observation"], dtype=np.float32)
                    action_mask = np.asarray(request["action_mask"], dtype=np.float32)
                    if observation.ndim != 1 or action_mask.ndim != 1:
                        raise ValueError("act mode requires 1D observation/action_mask")
                    obs_size = int(observation.shape[0])
                    action_count = int(action_mask.shape[0])

                policy, policy_arch = build_policy(
                    checkpoint,
                    obs_size,
                    action_count,
                    spec_info=request_spec or None,
                    attention_heads=args.attention_heads,
                    attention_layers=(args.attention_layers if args.attention_layers > 0 else None),
                )
                policy_obs_size = obs_size
                policy_action_count = action_count
                policy_observation_hash = request_observation_hash
                policy_action_hash = request_action_hash

            if request_observation_hash and policy_observation_hash and request_observation_hash != policy_observation_hash:
                raise ValueError(
                    "Observation schema hash mismatch: "
                    f"expected {policy_observation_hash}, received {request_observation_hash}"
                )
            if request_action_hash and policy_action_hash and request_action_hash != policy_action_hash:
                raise ValueError(
                    "Action space hash mismatch: "
                    f"expected {policy_action_hash}, received {request_action_hash}"
                )

            if mode == "eval_batch":
                observations = np.asarray(request["observations"], dtype=np.float32)
                action_masks = np.asarray(request["action_masks"], dtype=np.float32)
                if observations.ndim != 2:
                    raise ValueError("observations must be a 2D float array")
                if action_masks.ndim != 2:
                    raise ValueError("action_masks must be a 2D float array")
                obs_size = int(observations.shape[1])
                action_count = int(action_masks.shape[1])
                if obs_size != policy_obs_size or action_count != policy_action_count:
                    raise ValueError(
                        "Shape mismatch for loaded policy: "
                        f"expected obs={policy_obs_size}, actions={policy_action_count}, "
                        f"received obs={obs_size}, actions={action_count}"
                    )
                values = evaluate_batch(policy, observations, action_masks)
                response = {"id": request_id, "arch": policy_arch, "values": values.tolist()}
            elif mode == "score_actions":
                observation = np.asarray(request["observation"], dtype=np.float32)
                action_mask = np.asarray(request["action_mask"], dtype=np.float32)

                if observation.ndim != 1:
                    raise ValueError("observation must be a 1D float array")
                if action_mask.ndim != 1:
                    raise ValueError("action_mask must be a 1D float array")

                obs_size = int(observation.shape[0])
                action_count = int(action_mask.shape[0])
                if obs_size != policy_obs_size or action_count != policy_action_count:
                    raise ValueError(
                        "Shape mismatch for loaded policy: "
                        f"expected obs={policy_obs_size}, actions={policy_action_count}, "
                        f"received obs={obs_size}, actions={action_count}"
                    )

                logits, value = score_actions(policy, observation, action_mask)
                response = {
                    "id": request_id,
                    "arch": policy_arch,
                    "logits": logits.tolist(),
                    "value": value,
                }
            else:
                observation = np.asarray(request["observation"], dtype=np.float32)
                action_mask = np.asarray(request["action_mask"], dtype=np.float32)
                stochastic = bool(request.get("stochastic", args.stochastic))

                if observation.ndim != 1:
                    raise ValueError("observation must be a 1D float array")
                if action_mask.ndim != 1:
                    raise ValueError("action_mask must be a 1D float array")

                obs_size = int(observation.shape[0])
                action_count = int(action_mask.shape[0])
                if obs_size != policy_obs_size or action_count != policy_action_count:
                    raise ValueError(
                        "Shape mismatch for loaded policy: "
                        f"expected obs={policy_obs_size}, actions={policy_action_count}, "
                        f"received obs={obs_size}, actions={action_count}"
                    )

                action = choose_action(policy, observation, action_mask, stochastic, rng)
                response = {"id": request_id, "arch": policy_arch, "action": int(action)}
        except Exception as exc:
            response = {"id": request_id, "error": str(exc)}

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
