"""Изолированные политики стратегии и размера ордера.

Стратегия выбирает поведение границы и валюту накопления. Политика размера
единожды применяет опцию капитализации и не влияет на цены/направление.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_DOWN, Decimal

from app.models.enums import StrategyType

_PREC = Decimal("0.00000001")


def trunc8(value: Decimal) -> Decimal:
    return value.quantize(_PREC, rounding=ROUND_DOWN)


@dataclass(frozen=True, slots=True)
class SizingResult:
    amount: Decimal
    reinvested_profit: Decimal
    retained_profit: Decimal


class OrderSizingPolicy:
    """Рассчитать следующий BUY без изменения решения стратегии."""

    @staticmethod
    def next_buy_amount(
        *,
        strategy: StrategyType,
        base_amount: Decimal,
        completed_amount: Decimal,
        net_quote_profit: Decimal,
        net_base_profit: Decimal,
        buy_price: Decimal,
        capitalization_enabled: bool,
        capitalization_percent: Decimal,
        max_order_quote: Decimal | None,
    ) -> SizingResult:
        profit = net_base_profit if strategy == StrategyType.REVERSE else net_quote_profit
        if not capitalization_enabled or profit <= 0:
            return SizingResult(base_amount, Decimal("0"), profit)

        ratio = capitalization_percent / Decimal("100")
        reinvested = trunc8(profit * ratio)
        retained = trunc8(profit - reinvested)

        if strategy == StrategyType.REVERSE:
            amount = trunc8(completed_amount + reinvested)
        else:
            amount = trunc8(completed_amount + (reinvested / buy_price))

        if max_order_quote is not None:
            maximum_amount = trunc8(max_order_quote / buy_price)
            if amount > maximum_amount:
                amount = maximum_amount
                # Отражаем реально использованную, а не запрошенную капитализацию.
                used = max(Decimal("0"), trunc8((amount - completed_amount) * buy_price))
                reinvested = used
                retained = trunc8(profit - used)

        # Защитный минимум: капитализация никогда не уменьшает базовый лот.
        amount = max(base_amount, amount)
        return SizingResult(amount, reinvested, retained)
