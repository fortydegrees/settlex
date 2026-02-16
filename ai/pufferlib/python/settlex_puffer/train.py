from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any
import sys

import torch

# Torch wheels available on older Intel macOS builds may not expose
# unsigned integer dtypes beyond uint8. PufferLib 3.0 references these
# attributes at import time.
if not hasattr(torch, "uint16"):
    torch.uint16 = torch.int16  # type: ignore[attr-defined]
if not hasattr(torch, "uint32"):
    torch.uint32 = torch.int32  # type: ignore[attr-defined]
if not hasattr(torch, "uint64"):
    torch.uint64 = torch.int64  # type: ignore[attr-defined]

import pufferlib.emulation
import pufferlib.pufferl
import pufferlib.vector

from .env import SettlexGymEnv
from .policy import SettlexMaskedPolicy
from .policy_factorized import SettlexFactorizedPolicy


REPO_ROOT = Path(__file__).resolve().parents[4]
CORE_DIST = REPO_ROOT / "game-core" / "dist" / "index.js"


def parse_auto_int(value: str) -> int | str:
    if value == "auto":
        return "auto"
    return int(value)


def make_puffer_env(host_options: dict[str, Any] | None = None, buf=None, seed: int = 0):
    return pufferlib.emulation.GymnasiumPufferEnv(
        env_creator=SettlexGymEnv,
        env_kwargs={"host_options": host_options or {}},
        buf=buf,
        seed=seed,
    )


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train a Settlex policy with PufferLib")
    parser.add_argument("--total-timesteps", type=int, default=200_000)
    parser.add_argument("--num-envs", type=int, default=8)
    parser.add_argument("--num-players", type=int, default=4)
    parser.add_argument("--max-steps", type=int, default=1200)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--hidden-size", type=int, default=256)
    parser.add_argument(
        "--policy-arch",
        type=str,
        default="factorized-relational",
        choices=["masked-mlp", "factorized-relational"],
    )
    parser.add_argument("--attention-heads", type=int, default=4)
    parser.add_argument("--attention-layers", type=int, default=2)
    parser.add_argument("--device", type=str, default="cpu")
    parser.add_argument("--board-config-id", type=str, default="standard-official")
    parser.add_argument("--batch-size", type=parse_auto_int, default="auto")
    parser.add_argument("--minibatch-size", type=int, default=128)
    parser.add_argument("--bptt-horizon", type=parse_auto_int, default=64)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--checkpoint-interval", type=int, default=100)
    parser.add_argument("--wandb", action="store_true")
    parser.add_argument("--wandb-project", type=str, default="settlex")
    parser.add_argument("--wandb-group", type=str, default="puffer")
    parser.add_argument("--neptune", action="store_true")
    parser.add_argument("--neptune-name", type=str, default="settlex")
    parser.add_argument("--neptune-project", type=str, default="ablations")
    parser.add_argument(
      "--output-dir",
      type=str,
      default=str((REPO_ROOT / "ai" / "pufferlib" / "runs").resolve()),
    )
    return parser


def main() -> None:
    parser = build_arg_parser()
    args = parser.parse_args()

    if not CORE_DIST.exists():
        raise FileNotFoundError(
            f"Missing {CORE_DIST}. Run `pnpm -C game-core build` first."
        )

    host_options = {
        "numPlayers": args.num_players,
        "maxSteps": args.max_steps,
        "boardConfigId": args.board_config_id,
        "includeActionMaskInObservation": True,
        "friendlyRobber": True,
    }

    vecenv = pufferlib.vector.make(
        make_puffer_env,
        env_kwargs={"host_options": host_options},
        backend="Serial",
        num_envs=args.num_envs,
        seed=args.seed,
    )

    bootstrap_env = SettlexGymEnv(host_options=host_options)
    spec_info = bootstrap_env.spec_info
    bootstrap_env.close()

    if args.policy_arch == "masked-mlp":
        policy = SettlexMaskedPolicy(vecenv, hidden_size=args.hidden_size)
    else:
        policy = SettlexFactorizedPolicy(
            vecenv,
            hidden_size=args.hidden_size,
            attention_heads=args.attention_heads,
            attention_layers=args.attention_layers,
            spec_info=spec_info,
        )

    argv_backup = sys.argv[:]
    sys.argv = [sys.argv[0]]
    try:
        config = pufferlib.pufferl.load_config("default")
    finally:
        sys.argv = argv_backup
    config["wandb"] = bool(args.wandb)
    config["neptune"] = bool(args.neptune)
    config["wandb_project"] = args.wandb_project
    config["wandb_group"] = args.wandb_group
    config["neptune_name"] = args.neptune_name
    config["neptune_project"] = args.neptune_project

    train_cfg = config["train"]
    train_cfg["name"] = "settlex-puffer"
    train_cfg["project"] = "settlex"
    train_cfg["seed"] = args.seed
    train_cfg["device"] = args.device
    train_cfg["optimizer"] = "adam"
    train_cfg["total_timesteps"] = args.total_timesteps
    train_cfg["learning_rate"] = args.learning_rate
    train_cfg["checkpoint_interval"] = args.checkpoint_interval
    train_cfg["batch_size"] = args.batch_size
    train_cfg["minibatch_size"] = args.minibatch_size
    train_cfg["bptt_horizon"] = args.bptt_horizon
    train_cfg["compile"] = False
    train_cfg["cpu_offload"] = False
    train_cfg["data_dir"] = str(Path(args.output_dir).resolve())

    # Keep minibatch <= inferred batch when user leaves batch_size=auto.
    if args.batch_size == "auto":
        inferred_batch = max(64, args.num_envs * 64)
        train_cfg["minibatch_size"] = min(args.minibatch_size, inferred_batch)

    if isinstance(train_cfg["batch_size"], int) and train_cfg["batch_size"] < train_cfg["minibatch_size"]:
        raise ValueError(
            f"batch_size ({train_cfg['batch_size']}) must be >= minibatch_size ({train_cfg['minibatch_size']})."
        )

    logs = pufferlib.pufferl.train(
        env_name="settlex",
        args=config,
        vecenv=vecenv,
        policy=policy,
    )

    print(f"Completed training. Logged {len(logs)} metric snapshots.")


if __name__ == "__main__":
    main()
