from app.models.enums import StrategyType
from app.strategy.strategies.base import StrategyDefinition


class ReverseStrategy(StrategyDefinition):
    kind = StrategyType.REVERSE
    boundary_action = "rebuild"
    accumulation_currency = "base"
