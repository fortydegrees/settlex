from __future__ import annotations

import argparse
import csv
import json
import math
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import numpy as np
import torch

from .env import SettlexGymEnv
from .policy import SettlexMaskedPolicy
from .policy_factorized import SettlexFactorizedPolicy


MODEL_RE = re.compile(r"model_(\d+)\.pt$")
ATTN_LAYER_RE = re.compile(r"^blocks\.(\d+)\.attn\.in_proj_weight$")

CSV_FIELDS = [
    "timestamp_utc",
    "run_dir",
    "run_id",
    "checkpoint_path",
    "checkpoint_name",
    "checkpoint_update",
    "approx_global_step",
    "policy_arch",
    "num_players",
    "episodes_per_seed",
    "num_seeds",
    "total_episodes",
    "win_rate_mean",
    "win_rate_std",
    "wins_mean",
    "wins_std",
    "truncated_rate_mean",
    "no_winner_rate_mean",
    "mean_episode_steps",
    "eval_seconds",
    "seeds",
]


@dataclass
class CheckpointMeta:
    path: Path
    update: int


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Evaluate every checkpoint in a run directory and append an eval curve CSV."
        )
    )
    parser.add_argument("--run-dir", required=True, type=str)
    parser.add_argument("--out-csv", type=str, default="")
    parser.add_argument("--episodes", type=int, default=32, help="Episodes per seed.")
    parser.add_argument(
        "--seeds",
        type=str,
        default="123,456,789",
        help="Comma-separated seeds; one evaluation pass per seed.",
    )
    parser.add_argument("--player-id", type=str, default="0")
    parser.add_argument("--num-players", type=int, default=2)
    parser.add_argument("--max-steps", type=int, default=1200)
    parser.add_argument("--board-config-id", type=str, default="standard-official")
    parser.add_argument("--stochastic", action="store_true")
    parser.add_argument(
        "--every",
        type=int,
        default=1,
        help="Evaluate every Nth checkpoint in sorted order.",
    )
    parser.add_argument("--min-update", type=int, default=0)
    parser.add_argument("--max-update", type=int, default=0)
    parser.add_argument(
        "--include-last",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Always include the latest checkpoint even when --every skips it.",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="Keep polling run-dir and evaluate new checkpoints as they appear.",
    )
    parser.add_argument(
        "--poll-seconds",
        type=float,
        default=10.0,
        help="Polling interval for --watch mode.",
    )
    parser.add_argument(
        "--friendly-robber",
        action=argparse.BooleanOptionalAction,
        default=True,
    )
    return parser.parse_args()


def parse_seeds(raw: str) -> list[int]:
    seeds = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        seeds.append(int(part))
    if not seeds:
        raise ValueError("At least one seed is required.")
    return seeds


def checkpoint_update(path: Path) -> int:
    match = MODEL_RE.match(path.name)
    if not match:
        return -1
    return int(match.group(1))


def discover_checkpoints(run_dir: Path) -> list[CheckpointMeta]:
    metas: list[CheckpointMeta] = []
    for path in run_dir.glob("model_*.pt"):
        update = checkpoint_update(path)
        if update < 0:
            continue
        metas.append(CheckpointMeta(path=path.resolve(), update=update))
    return sorted(metas, key=lambda item: item.update)


def filter_checkpoints(
    checkpoints: list[CheckpointMeta],
    every: int,
    min_update: int,
    max_update: int,
    include_last: bool,
) -> list[CheckpointMeta]:
    filtered = [
        item
        for item in checkpoints
        if item.update >= min_update and (max_update <= 0 or item.update <= max_update)
    ]
    if every > 1:
        sampled = [item for idx, item in enumerate(filtered) if idx % every == 0]
    else:
        sampled = filtered

    if include_last and filtered:
        last = filtered[-1]
        if not sampled or sampled[-1].path != last.path:
            sampled.append(last)
    return sampled


def load_done_checkpoints(csv_path: Path) -> set[str]:
    if not csv_path.exists():
        return set()
    with csv_path.open("r", newline="") as handle:
        reader = csv.DictReader(handle)
        return {
            str(Path(row["checkpoint_path"]).resolve())
            for row in reader
            if row.get("checkpoint_path")
        }


def ensure_csv(csv_path: Path) -> None:
    if csv_path.exists():
        return
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with csv_path.open("w", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()


def append_row(csv_path: Path, row: dict[str, object]) -> None:
    with csv_path.open("a", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writerow(row)


def infer_attention_layers(state_dict: dict[str, torch.Tensor]) -> int:
    layers: list[int] = []
    for key in state_dict.keys():
        match = ATTN_LAYER_RE.match(key)
        if match:
            layers.append(int(match.group(1)))
    return max(layers) + 1 if layers else 1


def infer_arch(state_dict: dict[str, torch.Tensor]) -> str:
    return "factorized-relational" if "global_proj.weight" in state_dict else "masked-mlp"


def random_legal_action(mask: np.ndarray, rng: np.random.Generator) -> int:
    legal = np.flatnonzero(mask > 0)
    if legal.size == 0:
        return 0
    return int(rng.choice(legal))


def choose_policy_action(
    policy,
    observation: np.ndarray,
    stochastic: bool,
    rng: np.random.Generator,
) -> int:
    with torch.no_grad():
        obs_t = torch.as_tensor(observation, dtype=torch.float32).unsqueeze(0)
        logits, _ = policy.forward_eval(obs_t)
        logits = logits.squeeze(0)

    if stochastic:
        probs = torch.softmax(logits, dim=0).cpu().numpy()
        probs = probs / max(float(probs.sum()), 1e-12)
        return int(rng.choice(np.arange(probs.shape[0]), p=probs))

    return int(torch.argmax(logits, dim=0).item())


def evaluate_checkpoint(
    checkpoint: Path,
    *,
    episodes: int,
    seeds: Iterable[int],
    player_id: str,
    num_players: int,
    max_steps: int,
    board_config_id: str,
    stochastic: bool,
    friendly_robber: bool,
) -> dict[str, object]:
    host_options = {
        "numPlayers": num_players,
        "maxSteps": max_steps,
        "boardConfigId": board_config_id,
        "includeActionMaskInObservation": True,
        "friendlyRobber": bool(friendly_robber),
    }

    env = SettlexGymEnv(host_options=host_options)
    state_dict = torch.load(checkpoint, map_location="cpu")
    arch = infer_arch(state_dict)

    if arch == "masked-mlp":
        hidden_size = int(state_dict["encoder.0.weight"].shape[0])
        policy = SettlexMaskedPolicy(env, hidden_size=hidden_size)
    else:
        hidden_size = int(state_dict["global_proj.weight"].shape[0])
        attention_layers = infer_attention_layers(state_dict)
        policy = SettlexFactorizedPolicy(
            env,
            hidden_size=hidden_size,
            attention_heads=4,
            attention_layers=attention_layers,
            spec_info=env.spec_info,
        )

    policy.load_state_dict(state_dict)
    policy.eval()

    wins_by_seed: list[float] = []
    truncated_by_seed: list[float] = []
    no_winner_by_seed: list[float] = []
    mean_steps_by_seed: list[float] = []

    start = time.perf_counter()
    for seed in seeds:
        rng = np.random.default_rng(seed)
        wins = 0
        truncated = 0
        no_winner = 0
        episode_steps: list[int] = []

        for episode in range(episodes):
            observation, info = env.reset(seed=seed + episode)
            done = False
            is_truncated = False
            transitions = 0

            while not done and not is_truncated:
                actor_id = str(info.get("actor_id", "0"))
                mask = info["action_mask"]

                if actor_id == player_id:
                    action = choose_policy_action(policy, observation, stochastic, rng)
                else:
                    action = random_legal_action(mask, rng)

                observation, _, done, is_truncated, info = env.step(action)
                transitions += 1

            episode_steps.append(transitions)

            winner_id = info.get("winnerId") or info.get("winner_id")
            if winner_id is None:
                no_winner += 1
            elif str(winner_id) == player_id:
                wins += 1

            if is_truncated:
                truncated += 1

        wins_by_seed.append(wins / max(episodes, 1))
        truncated_by_seed.append(truncated / max(episodes, 1))
        no_winner_by_seed.append(no_winner / max(episodes, 1))
        mean_steps_by_seed.append(float(np.mean(episode_steps)) if episode_steps else 0.0)

    elapsed = time.perf_counter() - start
    env.close()

    return {
        "policy_arch": arch,
        "win_rate_mean": float(np.mean(wins_by_seed)),
        "win_rate_std": float(np.std(wins_by_seed)),
        "wins_mean": float(np.mean(wins_by_seed) * episodes),
        "wins_std": float(np.std(wins_by_seed) * episodes),
        "truncated_rate_mean": float(np.mean(truncated_by_seed)),
        "no_winner_rate_mean": float(np.mean(no_winner_by_seed)),
        "mean_episode_steps": float(np.mean(mean_steps_by_seed)),
        "eval_seconds": elapsed,
    }


def load_run_stats(run_dir: Path) -> tuple[str, float]:
    trainer_state_path = run_dir / "trainer_state.pt"
    if not trainer_state_path.exists():
        return run_dir.name, 0.0

    state = torch.load(trainer_state_path, map_location="cpu")
    run_id = str(state.get("run_id", run_dir.name))
    update = float(state.get("update", 0) or 0)
    global_step = float(state.get("global_step", 0) or 0)
    steps_per_update = (global_step / update) if update > 0 else 0.0
    return run_id, steps_per_update


def main() -> None:
    args = parse_args()
    run_dir = Path(args.run_dir).expanduser().resolve()
    if not run_dir.exists():
        raise FileNotFoundError(f"Run directory not found: {run_dir}")

    seeds = parse_seeds(args.seeds)
    out_csv = (
        Path(args.out_csv).expanduser().resolve()
        if args.out_csv
        else (run_dir / "eval_curve.csv").resolve()
    )

    ensure_csv(out_csv)
    done = load_done_checkpoints(out_csv)
    run_id, steps_per_update = load_run_stats(run_dir)

    while True:
        checkpoints = filter_checkpoints(
            discover_checkpoints(run_dir),
            every=max(1, args.every),
            min_update=max(0, args.min_update),
            max_update=max(0, args.max_update),
            include_last=bool(args.include_last),
        )

        pending = [item for item in checkpoints if str(item.path) not in done]
        if not pending and not args.watch:
            print(
                json.dumps(
                    {
                        "runDir": str(run_dir),
                        "outCsv": str(out_csv),
                        "message": "No pending checkpoints to evaluate.",
                    }
                )
            )
            break

        for item in pending:
            result = evaluate_checkpoint(
                item.path,
                episodes=args.episodes,
                seeds=seeds,
                player_id=args.player_id,
                num_players=args.num_players,
                max_steps=args.max_steps,
                board_config_id=args.board_config_id,
                stochastic=bool(args.stochastic),
                friendly_robber=bool(args.friendly_robber),
            )

            approx_global_step = (
                int(math.floor(item.update * steps_per_update))
                if steps_per_update > 0
                else 0
            )
            row = {
                "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                "run_dir": str(run_dir),
                "run_id": run_id,
                "checkpoint_path": str(item.path),
                "checkpoint_name": item.path.name,
                "checkpoint_update": item.update,
                "approx_global_step": approx_global_step,
                "policy_arch": result["policy_arch"],
                "num_players": args.num_players,
                "episodes_per_seed": args.episodes,
                "num_seeds": len(seeds),
                "total_episodes": args.episodes * len(seeds),
                "win_rate_mean": result["win_rate_mean"],
                "win_rate_std": result["win_rate_std"],
                "wins_mean": result["wins_mean"],
                "wins_std": result["wins_std"],
                "truncated_rate_mean": result["truncated_rate_mean"],
                "no_winner_rate_mean": result["no_winner_rate_mean"],
                "mean_episode_steps": result["mean_episode_steps"],
                "eval_seconds": result["eval_seconds"],
                "seeds": ",".join(str(seed) for seed in seeds),
            }
            append_row(out_csv, row)
            done.add(str(item.path))
            print(json.dumps(row))

        if not args.watch:
            break

        time.sleep(max(0.5, args.poll_seconds))


if __name__ == "__main__":
    main()
