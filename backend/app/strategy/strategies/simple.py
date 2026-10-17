from app.models.enums import StrategyType
from app.strategy.strategies.base import StrategyDefinition


class SimpleStrategy(StrategyDefinition):
    kind = StrategyType.SIMPLE
    boundary_action = "rebuild"
    accumulation_currency = "quote"
