from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .env import SettlexGymEnv

__all__ = ["SettlexGymEnv"]


def __getattr__(name: str) -> Any:
    if name == "SettlexGymEnv":
        from .env import SettlexGymEnv as _SettlexGymEnv

        return _SettlexGymEnv
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
