from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

import numpy as np
import torch
from torch import nn
import pufferlib.pytorch as puffer_torch


ACTION_TYPE_NAMES = [
    "roll",
    "endTurn",
    "buyDevCard",
    "buildRoad",
    "placeSettlement",
    "buildCity",
    "trade",
    "playDevKnight",
    "playDevRoadBuilding",
    "playDevMonopoly",
    "playDevYearOfPlenty",
    "moveRobber",
]
ACTION_TYPE_INDEX = {name: idx for idx, name in enumerate(ACTION_TYPE_NAMES)}
RESOURCE_TYPES = ["Wood", "Brick", "Sheep", "Wheat", "Ore"]


def _ordered_unique(values: Iterable[str]) -> list[str]:
    seen = set()
    ordered: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        ordered.append(value)
    return ordered


class AttentionBlock(nn.Module):
    def __init__(self, hidden_size: int, num_heads: int):
        super().__init__()
        self.norm1 = nn.LayerNorm(hidden_size)
        self.attn = nn.MultiheadAttention(
            embed_dim=hidden_size,
            num_heads=num_heads,
            batch_first=True,
        )
        self.norm2 = nn.LayerNorm(hidden_size)
        self.ff = nn.Sequential(
            nn.Linear(hidden_size, hidden_size * 4),
            nn.GELU(),
            nn.Linear(hidden_size * 4, hidden_size),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h = self.norm1(x)
        attn_out, _ = self.attn(h, h, h, need_weights=False)
        x = x + attn_out
        x = x + self.ff(self.norm2(x))
        return x


@dataclass
class ActionFactorMap:
    action_type_index: list[int]
    edge_index: list[int]
    node_index: list[int]
    tile_index: list[int]
    trade_index: list[int]
    resource_index: list[int]
    year_pair_index: list[int]
    edge_count: int
    node_count: int
    tile_count: int
    trade_count: int
    resource_count: int
    year_pair_count: int


def _parse_action_factors(action_labels: list[str]) -> ActionFactorMap:
    edge_labels = _ordered_unique(
        [label.split(":", 1)[1] for label in action_labels if label.startswith("buildRoad:")]
    )
    node_labels = _ordered_unique(
        [
            label.split(":", 1)[1]
            for label in action_labels
            if label.startswith("placeSettlement:") or label.startswith("buildCity:")
        ]
    )
    tile_labels = _ordered_unique(
        [label.split(":", 1)[1] for label in action_labels if label.startswith("moveRobber:")]
    )
    trade_labels = _ordered_unique(
        [label.split(":", 1)[1] for label in action_labels if label.startswith("trade:")]
    )
    year_pair_labels = _ordered_unique(
        label.split(":", 2)[2]
        for label in action_labels
        if label.startswith("playDev:yearOfPlenty:")
    )

    edge_to_index = {label: idx for idx, label in enumerate(edge_labels)}
    node_to_index = {label: idx for idx, label in enumerate(node_labels)}
    tile_to_index = {label: idx for idx, label in enumerate(tile_labels)}
    trade_to_index = {label: idx for idx, label in enumerate(trade_labels)}
    year_pair_to_index = {label: idx for idx, label in enumerate(year_pair_labels)}
    resource_to_index = {resource: idx for idx, resource in enumerate(RESOURCE_TYPES)}

    action_type_index: list[int] = []
    edge_index: list[int] = []
    node_index: list[int] = []
    tile_index: list[int] = []
    trade_index: list[int] = []
    resource_index: list[int] = []
    year_pair_index: list[int] = []

    for label in action_labels:
        atype = None
        e_idx = -1
        n_idx = -1
        t_idx = -1
        tr_idx = -1
        r_idx = -1
        y_idx = -1

        if label == "roll":
            atype = "roll"
        elif label == "endTurn":
            atype = "endTurn"
        elif label == "buyDevCard":
            atype = "buyDevCard"
        elif label.startswith("buildRoad:"):
            atype = "buildRoad"
            e_idx = edge_to_index[label.split(":", 1)[1]]
        elif label.startswith("placeSettlement:"):
            atype = "placeSettlement"
            n_idx = node_to_index[label.split(":", 1)[1]]
        elif label.startswith("buildCity:"):
            atype = "buildCity"
            n_idx = node_to_index[label.split(":", 1)[1]]
        elif label.startswith("trade:"):
            atype = "trade"
            tr_idx = trade_to_index[label.split(":", 1)[1]]
        elif label == "playDev:knight":
            atype = "playDevKnight"
        elif label == "playDev:roadBuilding":
            atype = "playDevRoadBuilding"
        elif label.startswith("playDev:monopoly:"):
            atype = "playDevMonopoly"
            resource = label.split(":", 2)[2]
            if resource not in resource_to_index:
                raise ValueError(f"Unsupported monopoly resource label: {label}")
            r_idx = resource_to_index[resource]
        elif label.startswith("playDev:yearOfPlenty:"):
            atype = "playDevYearOfPlenty"
            pair = label.split(":", 2)[2]
            y_idx = year_pair_to_index[pair]
        elif label.startswith("moveRobber:"):
            atype = "moveRobber"
            t_idx = tile_to_index[label.split(":", 1)[1]]
        else:
            raise ValueError(f"Unsupported action label for factorized policy: {label}")

        action_type_index.append(ACTION_TYPE_INDEX[atype])
        edge_index.append(e_idx)
        node_index.append(n_idx)
        tile_index.append(t_idx)
        trade_index.append(tr_idx)
        resource_index.append(r_idx)
        year_pair_index.append(y_idx)

    return ActionFactorMap(
        action_type_index=action_type_index,
        edge_index=edge_index,
        node_index=node_index,
        tile_index=tile_index,
        trade_index=trade_index,
        resource_index=resource_index,
        year_pair_index=year_pair_index,
        edge_count=len(edge_labels),
        node_count=len(node_labels),
        tile_count=len(tile_labels),
        trade_count=len(trade_labels),
        resource_count=len(RESOURCE_TYPES),
        year_pair_count=len(year_pair_labels),
    )


def _ensure_1d_obs(spec: dict[str, Any], action_count: int, obs_size: int) -> int:
    base_obs_size = obs_size - action_count
    layout = spec.get("observationLayout") or {}
    expected_base = int(layout.get("baseObservationSize", 0))
    if expected_base and expected_base != base_obs_size:
        raise ValueError(
            f"Observation layout mismatch: base={base_obs_size}, layout.base={expected_base}"
        )
    return base_obs_size


class SettlexFactorizedPolicy(nn.Module):
    def __init__(
        self,
        env,
        hidden_size: int = 256,
        attention_heads: int = 4,
        attention_layers: int = 2,
        spec_info: dict[str, Any] | None = None,
    ):
        super().__init__()
        obs_space = getattr(env, "single_observation_space", env.observation_space)
        action_space = getattr(env, "single_action_space", env.action_space)
        spec = spec_info or getattr(env, "spec_info", None)
        if spec is None:
            raise ValueError("SettlexFactorizedPolicy requires spec_info with actionLabels and observationLayout.")

        self.action_count = int(action_space.n)
        self.obs_size = int(np.prod(obs_space.shape))
        self.base_obs_size = _ensure_1d_obs(spec, self.action_count, self.obs_size)
        self.layout = spec["observationLayout"]
        self.action_labels = list(spec["actionLabels"])
        self.factor_map = _parse_action_factors(self.action_labels)

        self.global_size = int(self.layout["global"]["size"])
        self.tile_count = int(self.layout["tiles"]["count"])
        self.tile_feature_size = int(self.layout["tiles"]["featureSize"])
        self.node_count = int(self.layout["nodes"]["count"])
        self.node_feature_size = int(self.layout["nodes"]["featureSize"])
        self.edge_count = int(self.layout["edges"]["count"])
        self.edge_feature_size = int(self.layout["edges"]["featureSize"])

        self.global_offset = int(self.layout["global"]["offset"])
        self.tile_offset = int(self.layout["tiles"]["offset"])
        self.node_offset = int(self.layout["nodes"]["offset"])
        self.edge_offset = int(self.layout["edges"]["offset"])

        if self.factor_map.edge_count > self.edge_count:
            raise ValueError(
                f"Action-factor edge count exceeds layout: factors={self.factor_map.edge_count}, layout={self.edge_count}"
            )
        if self.factor_map.node_count > self.node_count:
            raise ValueError(
                f"Action-factor node count exceeds layout: factors={self.factor_map.node_count}, layout={self.node_count}"
            )
        if self.factor_map.tile_count > self.tile_count:
            raise ValueError(
                f"Action-factor tile count exceeds layout: factors={self.factor_map.tile_count}, layout={self.tile_count}"
            )

        self.global_proj = nn.Linear(self.global_size, hidden_size)
        self.tile_proj = nn.Linear(self.tile_feature_size, hidden_size)
        self.node_proj = nn.Linear(self.node_feature_size, hidden_size)
        self.edge_proj = nn.Linear(self.edge_feature_size, hidden_size)
        self.token_type_embed = nn.Parameter(torch.zeros(4, hidden_size))

        self.blocks = nn.ModuleList(
            [AttentionBlock(hidden_size=hidden_size, num_heads=attention_heads) for _ in range(attention_layers)]
        )
        self.final_norm = nn.LayerNorm(hidden_size)

        self.action_type_head = puffer_torch.layer_init(
            nn.Linear(hidden_size, len(ACTION_TYPE_NAMES)),
            std=0.01,
        )
        self.node_score = puffer_torch.layer_init(nn.Linear(hidden_size, 1), std=0.01)
        self.edge_score = puffer_torch.layer_init(nn.Linear(hidden_size, 1), std=0.01)
        self.tile_score = puffer_torch.layer_init(nn.Linear(hidden_size, 1), std=0.01)
        self.trade_head = puffer_torch.layer_init(
            nn.Linear(hidden_size, max(1, self.factor_map.trade_count)),
            std=0.01,
        )
        self.resource_head = puffer_torch.layer_init(
            nn.Linear(hidden_size, self.factor_map.resource_count),
            std=0.01,
        )
        self.year_pair_head = puffer_torch.layer_init(
            nn.Linear(hidden_size, max(1, self.factor_map.year_pair_count)),
            std=0.01,
        )
        self.value_head = puffer_torch.layer_init(nn.Linear(hidden_size, 1), std=1.0)

        self.register_buffer(
            "action_type_index",
            torch.as_tensor(self.factor_map.action_type_index, dtype=torch.long),
        )
        self.register_buffer("edge_index", torch.as_tensor(self.factor_map.edge_index, dtype=torch.long))
        self.register_buffer("node_index", torch.as_tensor(self.factor_map.node_index, dtype=torch.long))
        self.register_buffer("tile_index", torch.as_tensor(self.factor_map.tile_index, dtype=torch.long))
        self.register_buffer("trade_index", torch.as_tensor(self.factor_map.trade_index, dtype=torch.long))
        self.register_buffer("resource_index", torch.as_tensor(self.factor_map.resource_index, dtype=torch.long))
        self.register_buffer(
            "year_pair_index",
            torch.as_tensor(self.factor_map.year_pair_index, dtype=torch.long),
        )

        self.register_buffer("edge_valid", (self.edge_index >= 0).float().unsqueeze(0))
        self.register_buffer("node_valid", (self.node_index >= 0).float().unsqueeze(0))
        self.register_buffer("tile_valid", (self.tile_index >= 0).float().unsqueeze(0))
        self.register_buffer("trade_valid", (self.trade_index >= 0).float().unsqueeze(0))
        self.register_buffer("resource_valid", (self.resource_index >= 0).float().unsqueeze(0))
        self.register_buffer("year_pair_valid", (self.year_pair_index >= 0).float().unsqueeze(0))

    def _slice_base(self, base: torch.Tensor, offset: int, size: int) -> torch.Tensor:
        return base[:, offset : offset + size]

    def _gather_component(
        self,
        component_logits: torch.Tensor,
        action_index: torch.Tensor,
        valid_mask: torch.Tensor,
    ) -> torch.Tensor:
        if component_logits.shape[1] <= 0:
            return torch.zeros(
                (component_logits.shape[0], self.action_count),
                dtype=component_logits.dtype,
                device=component_logits.device,
            )
        selected = component_logits[:, torch.clamp(action_index, min=0, max=component_logits.shape[1] - 1)]
        return selected * valid_mask

    def _encode_tokens(self, base: torch.Tensor):
        batch_size = base.shape[0]

        global_feats = self._slice_base(base, self.global_offset, self.global_size)
        global_token = self.global_proj(global_feats).unsqueeze(1) + self.token_type_embed[0]

        tokens = [global_token]
        tile_tokens = None
        node_tokens = None
        edge_tokens = None

        if self.tile_count > 0:
            tile_flat = self._slice_base(base, self.tile_offset, self.tile_count * self.tile_feature_size)
            tile_feats = tile_flat.view(batch_size, self.tile_count, self.tile_feature_size)
            tile_tokens = self.tile_proj(tile_feats) + self.token_type_embed[1]
            tokens.append(tile_tokens)

        if self.node_count > 0:
            node_flat = self._slice_base(base, self.node_offset, self.node_count * self.node_feature_size)
            node_feats = node_flat.view(batch_size, self.node_count, self.node_feature_size)
            node_tokens = self.node_proj(node_feats) + self.token_type_embed[2]
            tokens.append(node_tokens)

        if self.edge_count > 0:
            edge_flat = self._slice_base(base, self.edge_offset, self.edge_count * self.edge_feature_size)
            edge_feats = edge_flat.view(batch_size, self.edge_count, self.edge_feature_size)
            edge_tokens = self.edge_proj(edge_feats) + self.token_type_embed[3]
            tokens.append(edge_tokens)

        x = torch.cat(tokens, dim=1)
        for block in self.blocks:
            x = block(x)
        x = self.final_norm(x)

        cursor = 1
        if self.tile_count > 0:
            tile_tokens = x[:, cursor : cursor + self.tile_count]
            cursor += self.tile_count
        if self.node_count > 0:
            node_tokens = x[:, cursor : cursor + self.node_count]
            cursor += self.node_count
        if self.edge_count > 0:
            edge_tokens = x[:, cursor : cursor + self.edge_count]

        global_context = x[:, 0, :]
        return global_context, tile_tokens, node_tokens, edge_tokens

    def _compose_logits(
        self,
        global_context: torch.Tensor,
        tile_tokens: torch.Tensor | None,
        node_tokens: torch.Tensor | None,
        edge_tokens: torch.Tensor | None,
    ) -> torch.Tensor:
        type_logits = self.action_type_head(global_context)
        logits = type_logits[:, self.action_type_index]

        if edge_tokens is not None:
            edge_logits = self.edge_score(edge_tokens).squeeze(-1)
            logits = logits + self._gather_component(edge_logits, self.edge_index, self.edge_valid)
        if node_tokens is not None:
            node_logits = self.node_score(node_tokens).squeeze(-1)
            logits = logits + self._gather_component(node_logits, self.node_index, self.node_valid)
        if tile_tokens is not None:
            tile_logits = self.tile_score(tile_tokens).squeeze(-1)
            logits = logits + self._gather_component(tile_logits, self.tile_index, self.tile_valid)

        trade_logits = self.trade_head(global_context)
        logits = logits + self._gather_component(trade_logits, self.trade_index, self.trade_valid)

        resource_logits = self.resource_head(global_context)
        logits = logits + self._gather_component(resource_logits, self.resource_index, self.resource_valid)

        year_pair_logits = self.year_pair_head(global_context)
        logits = logits + self._gather_component(
            year_pair_logits, self.year_pair_index, self.year_pair_valid
        )

        return logits

    def forward_eval(self, observations: torch.Tensor, state=None):
        del state
        obs = observations.view(observations.shape[0], -1).float()
        base = obs[:, : self.base_obs_size]
        mask = obs[:, self.base_obs_size : self.base_obs_size + self.action_count]

        global_context, tile_tokens, node_tokens, edge_tokens = self._encode_tokens(base)
        logits = self._compose_logits(global_context, tile_tokens, node_tokens, edge_tokens)
        values = self.value_head(global_context)

        legal_mask = mask > 0.5
        masked_logits = logits.masked_fill(~legal_mask, torch.finfo(logits.dtype).min)

        no_legal = legal_mask.sum(dim=1) == 0
        if torch.any(no_legal):
            masked_logits[no_legal] = logits[no_legal]

        return masked_logits, values

    def forward(self, observations, state=None):
        return self.forward_eval(observations, state)
