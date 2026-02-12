from __future__ import annotations

import argparse
import random

from .env import SettlexGymEnv


def choose_legal_action(mask):
    legal = [i for i, value in enumerate(mask) if int(value) == 1]
    if not legal:
        return 0
    return random.choice(legal)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a random-policy smoke test")
    parser.add_argument("--steps", type=int, default=500)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--num-players", type=int, default=4)
    parser.add_argument("--max-steps", type=int, default=1200)
    args = parser.parse_args()

    env = SettlexGymEnv(
        host_options={
            "numPlayers": args.num_players,
            "maxSteps": args.max_steps,
            "includeActionMaskInObservation": True,
        }
    )

    obs, info = env.reset(seed=args.seed)
    done = False
    truncated = False
    transitions = 0

    while not done and not truncated and transitions < args.steps:
        action = choose_legal_action(info["action_mask"])
        obs, reward, done, truncated, info = env.step(action)
        transitions += 1

    print(
        {
            "transitions": transitions,
            "done": done,
            "truncated": truncated,
            "winnerId": info.get("winnerId") or info.get("winner_id"),
            "lastMode": info.get("mode"),
        }
    )

    env.close()


if __name__ == "__main__":
    main()
