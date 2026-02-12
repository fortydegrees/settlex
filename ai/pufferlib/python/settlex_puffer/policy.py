from __future__ import annotations

import numpy as np
import torch
from torch import nn
import pufferlib
import pufferlib.pytorch as puffer_torch


class SettlexMaskedPolicy(nn.Module):
    """Discrete policy with hard action masking.

    Observation layout is expected to be:
    - first `base_obs_size` floats: game features
    - last `action_count` floats: legal action mask (0/1)
    """

    def __init__(self, env, hidden_size: int = 256):
        super().__init__()
        obs_space = getattr(env, "single_observation_space", env.observation_space)
        action_space = getattr(env, "single_action_space", env.action_space)

        obs_size = int(np.prod(obs_space.shape))
        self.action_count = int(action_space.n)
        self.base_obs_size = obs_size - self.action_count

        if self.base_obs_size <= 0:
            raise ValueError(
                "Observation must include base features plus action mask. "
                f"obs_size={obs_size}, action_count={self.action_count}"
            )

        self.encoder = nn.Sequential(
            nn.Linear(self.base_obs_size, hidden_size),
            nn.GELU(),
            nn.Linear(hidden_size, hidden_size),
            nn.GELU(),
        )

        self.decoder = puffer_torch.layer_init(
            nn.Linear(hidden_size, self.action_count), std=0.01
        )
        self.value = puffer_torch.layer_init(nn.Linear(hidden_size, 1), std=1.0)

    def forward_eval(self, observations, state=None):
        del state
        obs = observations.view(observations.shape[0], -1).float()
        base = obs[:, : self.base_obs_size]
        mask = obs[:, self.base_obs_size : self.base_obs_size + self.action_count]

        hidden = self.encoder(base)
        logits = self.decoder(hidden)

        legal_mask = mask > 0.5
        masked_logits = logits.masked_fill(~legal_mask, torch.finfo(logits.dtype).min)

        # Safety: if mask is all-zero, fall back to unmasked logits so distribution is valid.
        no_legal = legal_mask.sum(dim=1) == 0
        if torch.any(no_legal):
            masked_logits[no_legal] = logits[no_legal]

        values = self.value(hidden)
        return masked_logits, values

    def forward(self, observations, state=None):
        return self.forward_eval(observations, state)

    def encode_observations(self, observations, state=None):
        del state
        obs = observations.view(observations.shape[0], -1).float()
        return self.encoder(obs[:, : self.base_obs_size])

    def decode_actions(self, hidden):
        logits = self.decoder(hidden)
        values = self.value(hidden)
        return logits, values
