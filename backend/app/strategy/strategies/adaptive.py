from app.models.enums import StrategyType
from app.strategy.strategies.base import StrategyDefinition


class AdaptiveStrategy(StrategyDefinition):
    kind = StrategyType.ADAPTIVE
    boundary_action = "shift"
    accumulation_currency = "quote"
