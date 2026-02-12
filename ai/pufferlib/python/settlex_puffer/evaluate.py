from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from .env import SettlexGymEnv
from .policy import SettlexMaskedPolicy


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate a Settlex checkpoint against random opponents"
    )
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--episodes", type=int, default=50)
    parser.add_argument("--player-id", type=str, default="0")
    parser.add_argument("--seed", type=int, default=123)
    parser.add_argument("--hidden-size", type=int, default=256)
    parser.add_argument("--num-players", type=int, default=4)
    parser.add_argument("--max-steps", type=int, default=1200)
    parser.add_argument("--board-config-id", type=str, default="standard-official")
    parser.add_argument("--stochastic", action="store_true")
    return parser.parse_args()


def resolve_checkpoint(path_value: str) -> Path:
    path = Path(path_value).expanduser().resolve()
    if path.is_file():
        return path

    if not path.exists():
        raise FileNotFoundError(f"Checkpoint path does not exist: {path}")

    if path.is_dir():
        model_candidates = sorted(path.rglob("model_*.pt"))
        if model_candidates:
            return model_candidates[-1]

        any_pt = sorted(p for p in path.rglob("*.pt") if p.name != "trainer_state.pt")
        if any_pt:
            return any_pt[-1]

    raise FileNotFoundError(f"No .pt checkpoint found under: {path}")


def random_legal_action(mask: np.ndarray, rng: np.random.Generator) -> int:
    legal = np.flatnonzero(mask > 0)
    if legal.size == 0:
        return 0
    return int(rng.choice(legal))


def policy_action(
    policy: SettlexMaskedPolicy,
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
            probs = probs / probs.sum()
            return int(rng.choice(np.arange(probs.shape[0]), p=probs))

        return int(torch.argmax(logits, dim=0).item())


def main() -> None:
    args = parse_args()
    checkpoint = resolve_checkpoint(args.checkpoint)

    host_options = {
        "numPlayers": args.num_players,
        "maxSteps": args.max_steps,
        "boardConfigId": args.board_config_id,
        "includeActionMaskInObservation": True,
        "friendlyRobber": True,
    }

    env = SettlexGymEnv(host_options=host_options)
    policy = SettlexMaskedPolicy(env, hidden_size=args.hidden_size)

    state_dict = torch.load(checkpoint, map_location="cpu")
    policy.load_state_dict(state_dict)
    policy.eval()

    rng = np.random.default_rng(args.seed)

    wins = 0
    truncated = 0
    no_winner = 0
    steps = []

    for episode in range(args.episodes):
        observation, info = env.reset(seed=args.seed + episode)
        done = False
        is_truncated = False
        transitions = 0

        while not done and not is_truncated:
            actor_id = str(info.get("actor_id", "0"))
            mask = info["action_mask"]

            if actor_id == args.player_id:
                action = policy_action(policy, observation, args.stochastic, rng)
            else:
                action = random_legal_action(mask, rng)

            observation, _, done, is_truncated, info = env.step(action)
            transitions += 1

        steps.append(transitions)
        winner_id = info.get("winnerId") or info.get("winner_id")
        if winner_id is None:
            no_winner += 1
        elif str(winner_id) == args.player_id:
            wins += 1

        if is_truncated:
            truncated += 1

    env.close()

    summary = {
        "checkpoint": str(checkpoint),
        "episodes": args.episodes,
        "targetPlayerId": args.player_id,
        "wins": wins,
        "winRate": wins / max(args.episodes, 1),
        "truncatedEpisodes": truncated,
        "noWinnerEpisodes": no_winner,
        "meanEpisodeSteps": float(np.mean(steps)) if steps else 0.0,
        "medianEpisodeSteps": float(np.median(steps)) if steps else 0.0,
        "stochasticPolicy": args.stochastic,
    }

    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
