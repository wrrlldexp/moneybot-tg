"""Чистый контракт взаимоисключающей стратегии."""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.models.enums import StrategyType


class StrategyDefinition(ABC):
    @property
    @abstractmethod
    def kind(self) -> StrategyType: ...

    @property
    @abstractmethod
    def boundary_action(self) -> str: ...

    @property
    @abstractmethod
    def accumulation_currency(self) -> str: ...
