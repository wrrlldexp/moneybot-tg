"""Реестр трёх взаимоисключающих стратегий."""

from app.models.enums import StrategyType
from app.strategy.strategies.adaptive import AdaptiveStrategy
from app.strategy.strategies.base import StrategyDefinition
from app.strategy.strategies.reverse import ReverseStrategy
from app.strategy.strategies.simple import SimpleStrategy

_STRATEGIES: dict[StrategyType, StrategyDefinition] = {
    StrategyType.SIMPLE: SimpleStrategy(),
    StrategyType.ADAPTIVE: AdaptiveStrategy(),
    StrategyType.REVERSE: ReverseStrategy(),
}


def get_strategy(strategy: StrategyType) -> StrategyDefinition:
    return _STRATEGIES[strategy]


__all__ = ["StrategyDefinition", "get_strategy"]
