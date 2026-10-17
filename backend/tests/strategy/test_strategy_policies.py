from decimal import Decimal

from app.models.enums import StrategyType
from app.strategy.policies import OrderSizingPolicy
from app.strategy.strategies import get_strategy


def test_exactly_three_exclusive_strategies() -> None:
    assert {item.value for item in StrategyType} == {"simple", "adaptive", "reverse"}
    assert get_strategy(StrategyType.SIMPLE).boundary_action == "rebuild"
    assert get_strategy(StrategyType.ADAPTIVE).boundary_action == "shift"
    assert get_strategy(StrategyType.REVERSE).accumulation_currency == "base"


def test_capitalization_off_keeps_base_amount() -> None:
    result = OrderSizingPolicy.next_buy_amount(
        strategy=StrategyType.SIMPLE,
        base_amount=Decimal("0.1"),
        completed_amount=Decimal("0.1"),
        net_quote_profit=Decimal("5"),
        net_base_profit=Decimal("0.005"),
        buy_price=Decimal("1000"),
        capitalization_enabled=False,
        capitalization_percent=Decimal("100"),
        max_order_quote=None,
    )
    assert result.amount == Decimal("0.1")
    assert result.reinvested_profit == 0


def test_capitalization_respects_percent_and_order_cap() -> None:
    result = OrderSizingPolicy.next_buy_amount(
        strategy=StrategyType.SIMPLE,
        base_amount=Decimal("0.1"),
        completed_amount=Decimal("0.1"),
        net_quote_profit=Decimal("100"),
        net_base_profit=Decimal("0.1"),
        buy_price=Decimal("1000"),
        capitalization_enabled=True,
        capitalization_percent=Decimal("50"),
        max_order_quote=Decimal("120"),
    )
    assert result.amount == Decimal("0.12")
    assert result.reinvested_profit == Decimal("20")
    assert result.retained_profit == Decimal("80")


def test_reverse_capitalizes_in_base() -> None:
    result = OrderSizingPolicy.next_buy_amount(
        strategy=StrategyType.REVERSE,
        base_amount=Decimal("0.1"),
        completed_amount=Decimal("0.1"),
        net_quote_profit=Decimal("10"),
        net_base_profit=Decimal("0.01"),
        buy_price=Decimal("1000"),
        capitalization_enabled=True,
        capitalization_percent=Decimal("50"),
        max_order_quote=None,
    )
    assert result.amount == Decimal("0.105")
    assert result.reinvested_profit == Decimal("0.005")
