from __future__ import annotations

import unittest

import gymnasium as gym
import numpy as np
import torch

from settlex_puffer.policy_factorized import SettlexFactorizedPolicy


class _DummyEnv:
    def __init__(self):
        self.action_space = gym.spaces.Discrete(8)
        self.observation_space = gym.spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(43,),
            dtype=np.float32,
        )
        self.spec_info = {
            "actionLabels": [
                "roll",
                "endTurn",
                "buyDevCard",
                "buildRoad:0,1",
                "placeSettlement:0",
                "buildCity:0",
                "playDev:monopoly:Wood",
                "moveRobber:10",
            ],
            "observationLayout": {
                "global": {"offset": 0, "size": 8},
                "tiles": {"offset": 8, "count": 2, "featureSize": 5},
                "nodes": {"offset": 18, "count": 3, "featureSize": 5},
                "edges": {"offset": 33, "count": 2, "featureSize": 1},
                "baseObservationSize": 35,
            },
            "observationSchemaVersion": "v2",
        }


class _NodeDupEnv:
    def __init__(self):
        self.action_space = gym.spaces.Discrete(6)
        self.observation_space = gym.spaces.Box(
            low=-np.inf,
            high=np.inf,
            shape=(16,),
            dtype=np.float32,
        )
        self.spec_info = {
            "actionLabels": [
                "roll",
                "placeSettlement:0",
                "placeSettlement:1",
                "buildCity:0",
                "buildCity:1",
                "endTurn",
            ],
            "observationLayout": {
                "global": {"offset": 0, "size": 4},
                "tiles": {"offset": 4, "count": 0, "featureSize": 1},
                "nodes": {"offset": 4, "count": 2, "featureSize": 3},
                "edges": {"offset": 10, "count": 0, "featureSize": 1},
                "baseObservationSize": 10,
            },
            "observationSchemaVersion": "v2",
        }


class FactorizedPolicyTests(unittest.TestCase):
    def test_forward_eval_masks_illegal_actions(self):
        env = _DummyEnv()
        policy = SettlexFactorizedPolicy(env, hidden_size=32, attention_heads=2, attention_layers=1)
        obs = torch.zeros((1, 43), dtype=torch.float32)
        # Legal actions: roll and placeSettlement
        obs[0, 35 + 0] = 1.0
        obs[0, 35 + 4] = 1.0

        logits, values = policy.forward_eval(obs)

        self.assertEqual(tuple(logits.shape), (1, 8))
        self.assertEqual(tuple(values.shape), (1, 1))
        self.assertTrue(torch.isfinite(logits[0, 0]))
        self.assertTrue(torch.isfinite(logits[0, 4]))
        self.assertLess(float(logits[0, 1].detach()), -1e20)
        self.assertLess(float(logits[0, 7].detach()), -1e20)

    def test_all_zero_mask_falls_back_to_unmasked_logits(self):
        env = _DummyEnv()
        policy = SettlexFactorizedPolicy(env, hidden_size=32, attention_heads=2, attention_layers=1)
        obs = torch.zeros((1, 43), dtype=torch.float32)
        logits, _ = policy.forward_eval(obs)
        self.assertTrue(torch.all(torch.isfinite(logits)))

    def test_duplicate_node_actions_share_node_factor_space(self):
        env = _NodeDupEnv()
        policy = SettlexFactorizedPolicy(env, hidden_size=16, attention_heads=1, attention_layers=1)
        obs = torch.zeros((1, 16), dtype=torch.float32)
        # Legal actions: roll and buildCity:1
        obs[0, 10 + 0] = 1.0
        obs[0, 10 + 4] = 1.0

        logits, _ = policy.forward_eval(obs)

        self.assertEqual(tuple(logits.shape), (1, 6))
        self.assertTrue(torch.isfinite(logits[0, 4]))


if __name__ == "__main__":
    unittest.main()
