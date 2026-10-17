"""Сервис запуска и тиков торговой сетки."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import bot_logger
from app.core.redis_client import publish
from app.models import (
    ExchangeAccount,
    Grid,
    GridMode,
    GridOrder,
    GridStatus,
    OrderStatus,
    StrategyType,
    TradeEvent,
    TradeEventType,
)
from app.strategy.engine import GridEngine
from app.strategy.executor import Executor
from app.strategy.paper_executor import PaperExecutor
from app.strategy.types import GridParams, GridState, LiveOrder


class GridRuntimeRegistry:
    def __init__(self) -> None:
        self.engines: dict[uuid.UUID, GridEngine] = {}
        self.executors: dict[uuid.UUID, Executor] = {}
        self.states: dict[uuid.UUID, GridState] = {}
        self._locks: dict[uuid.UUID, asyncio.Lock] = {}

    def get_lock(self, grid_id: uuid.UUID) -> asyncio.Lock:
        if grid_id not in self._locks:
            self._locks[grid_id] = asyncio.Lock()
        return self._locks[grid_id]


registry = GridRuntimeRegistry()


def _params_from_grid(grid: Grid) -> GridParams:
    return GridParams(
        strategy=grid.strategy,
        lot_size=grid.lot_size,
        lot_quote=grid.lot_quote,
        profit_step=grid.profit_step,
        grid_step=grid.grid_step,
        levels_above=grid.levels_above,
        levels_below=grid.levels_below,
        rebuild_timeout_sec=grid.rebuild_timeout_sec,
        adaptive_timer_sec=grid.adaptive_timer_sec,
        capitalization_enabled=grid.capitalization_enabled,
        capitalization_percent=grid.capitalization_percent,
        capitalization_max_order_quote=grid.capitalization_max_order_quote,
    )


async def _load_grid(db: AsyncSession, grid_id: uuid.UUID) -> Grid:
    result = await db.execute(
        select(Grid)
        .where(Grid.id == grid_id)
        .options(selectinload(Grid.orders), selectinload(Grid.account))
    )
    return result.scalar_one()


async def _persist_state(db: AsyncSession, grid: Grid, state: GridState) -> None:
    grid.last_boundary_hit_at = state.last_boundary_hit_at
    grid.realized_pnl = state.realized_pnl
    grid.realized_base_pnl = state.realized_base_pnl
    grid.total_trades = state.total_trades
    grid.adaptive_top_order_idx = state.adaptive_top_idx
    grid.adaptive_bottom_order_idx = state.adaptive_bottom_idx
    grid.prepay_base_tail = state.prepay_base_tail
    grid.prepay_quote_tail = state.prepay_quote_tail
    grid.last_adaptive_at = state.last_adaptive_at

    existing_by_exchange_id = {
        order.exchange_order_id: order
        for order in grid.orders
        if order.exchange_order_id
    }

    # Собираем exchange_order_id из текущего state
    state_exchange_ids = {o.exchange_order_id for o in state.orders if o.exchange_order_id}

    # Помечаем ордера в БД, которых нет в state, как cancelled (после rebuild)
    for ex_id, model in existing_by_exchange_id.items():
        if ex_id not in state_exchange_ids and model.status in (OrderStatus.PLACED, OrderStatus.WAIT):
            model.status = OrderStatus.CANCELLED

    for live_order in state.orders:
        model = existing_by_exchange_id.get(live_order.exchange_order_id)
        if model is None:
            model = GridOrder(
                grid_id=grid.id,
                grid_index=live_order.grid_index,
                side=live_order.side,
                status=live_order.status,
                price=live_order.price,
                price_sell=live_order.price_sell,
                amount=live_order.amount,
                exchange_order_id=live_order.exchange_order_id,
                prepay=live_order.prepay,
                re_buy=live_order.re_buy,
                re_sell=live_order.re_sell,
                profit=live_order.profit,
                count_complete=live_order.count_complete,
                filled_at=live_order.filled_at,
            )
            db.add(model)
            grid.orders.append(model)
        else:
            model.status = live_order.status
            model.side = live_order.side
            model.amount = live_order.amount
            model.prepay = live_order.prepay
            model.re_buy = live_order.re_buy
            model.re_sell = live_order.re_sell
            model.profit = live_order.profit
            model.count_complete = live_order.count_complete
            model.filled_at = live_order.filled_at
            model.exchange_order_id = live_order.exchange_order_id

    await db.flush()


async def _create_executor(account: ExchangeAccount, grid: Grid) -> Executor:
    return account.to_executor(paper_mode=grid.mode == GridMode.PAPER, symbol=grid.symbol)


def _state_from_grid(grid: Grid) -> GridState:
    live_orders = [
        LiveOrder(
            id=order.id,
            side=order.side,
            price=order.price,
            price_sell=order.price_sell,
            amount=order.amount,
            status=order.status,
            exchange_order_id=order.exchange_order_id or "",
            grid_index=order.grid_index,
            prepay=order.prepay,
            re_buy=order.re_buy,
            re_sell=order.re_sell,
            profit=order.profit,
            count_complete=order.count_complete,
            created_at=order.created_at,
            filled_at=order.filled_at,
        )
        for order in grid.orders
        if order.exchange_order_id and order.status in (OrderStatus.PLACED, OrderStatus.FILLED)
    ]
    center_price = grid.grid_step * Decimal("10")
    if live_orders:
        total = sum((order.price for order in live_orders), start=Decimal("0"))
        center_price = total / Decimal(len(live_orders))
    return GridState(
        center_price=center_price,
        orders=live_orders,
        last_boundary_hit_at=grid.last_boundary_hit_at,
        realized_pnl=grid.realized_pnl,
        realized_base_pnl=grid.realized_base_pnl,
        total_trades=grid.total_trades,
        adaptive_top_idx=grid.adaptive_top_order_idx,
        adaptive_bottom_idx=grid.adaptive_bottom_order_idx,
        prepay_base_tail=grid.prepay_base_tail,
        prepay_quote_tail=grid.prepay_quote_tail,
        last_adaptive_at=grid.last_adaptive_at,
    )


async def _ensure_runtime(db: AsyncSession, grid: Grid) -> tuple[GridEngine, GridState]:
    engine = registry.engines.get(grid.id)
    state = registry.states.get(grid.id)
    if engine is not None and state is not None:
        return engine, state

    executor = await _create_executor(grid.account, grid)
    engine = GridEngine(_params_from_grid(grid), executor)
    state = _state_from_grid(grid)
    if isinstance(executor, PaperExecutor):
        executor.seed_open_orders(state.orders)

    # Только Worker вызывает _ensure_runtime и только он имеет право строить
    # сетку/размещать ордера. API лишь меняет статус и отправляет команду.
    if grid.status == GridStatus.RUNNING and not any(
        order.status == OrderStatus.PLACED for order in state.orders
    ):
        ticker = await executor.get_ticker()
        center_price = ticker.mid if ticker.mid > 0 else grid.grid_step * Decimal("10")
        new_state = await engine.build_initial_grid(center_price)
        new_state.realized_pnl = state.realized_pnl
        new_state.realized_base_pnl = state.realized_base_pnl
        new_state.total_trades = state.total_trades
        state = new_state
        await _persist_state(db, grid, state)

    registry.executors[grid.id] = executor
    registry.engines[grid.id] = engine
    registry.states[grid.id] = state
    return engine, state


async def start_grid(db: AsyncSession, grid_id: uuid.UUID) -> Grid:
    grid = await _load_grid(db, grid_id)

    # API control-plane: никаких Executor/GridEngine и биржевых вызовов.
    async with registry.get_lock(grid.id):
        # Старые ERROR записи не являются частью восстанавливаемого runtime.
        await db.execute(
            delete(GridOrder).where(
                GridOrder.grid_id == grid.id,
                GridOrder.status == OrderStatus.ERROR,
            )
        )
        grid.status = GridStatus.RUNNING
        grid.started_at = datetime.now(UTC)
        await db.flush()
        # Команда публикуется только после видимого Worker-у состояния.
        await db.commit()

    await publish("grids:commands", json.dumps({"action": "start", "grid_id": str(grid.id)}))
    await bot_logger.info(
        f"Сетка запущена: {grid.name} ({grid.symbol}), стратегия {grid.strategy.value}",
        grid_id=grid.id,
        payload={"symbol": grid.symbol, "strategy": grid.strategy.value, "mode": grid.mode.value},
    )
    return grid


async def stop_grid(db: AsyncSession, grid_id: uuid.UUID) -> Grid:
    grid = await _load_grid(db, grid_id)
    async with registry.get_lock(grid.id):
        state = registry.states.get(grid.id)
        executor = registry.executors.get(grid.id)
        owns_executor = executor is None
        if executor is None:
            executor = await _create_executor(grid.account, grid)

        known_ids = {
            order.exchange_order_id
            for order in grid.orders
            if order.status == OrderStatus.PLACED and order.exchange_order_id
        }
        if state is not None:
            known_ids.update(
                order.exchange_order_id
                for order in state.orders
                if order.status == OrderStatus.PLACED and order.exchange_order_id
            )

        # Отменяем только ордера этой сетки, не затрагивая соседние сетки пары.
        open_orders = await executor.get_open_orders()
        open_ids = {item["id"] for item in open_orders or []}
        for exchange_order_id in known_ids:
            if not open_orders or exchange_order_id in open_ids:
                await executor.cancel_order(exchange_order_id)

        for model in grid.orders:
            if model.exchange_order_id in known_ids and model.status == OrderStatus.PLACED:
                model.status = OrderStatus.CANCELLED
        if state is not None:
            for order in state.orders:
                if order.exchange_order_id in known_ids and order.status == OrderStatus.PLACED:
                    order.status = OrderStatus.CANCELLED
            await _persist_state(db, grid, state)

        grid.status = GridStatus.STOPPED
        grid.stopped_at = datetime.now(UTC)
        registry.states.pop(grid.id, None)
        registry.engines.pop(grid.id, None)
        removed_executor = registry.executors.pop(grid.id, None)
        executor_to_close = removed_executor or (executor if owns_executor else None)
        if executor_to_close is not None:
            close = getattr(executor_to_close, "close", None)
            if callable(close):
                await close()

    await bot_logger.info(f"Сетка остановлена: {grid.name}", grid_id=grid.id)
    return grid


async def request_stop_grid(db: AsyncSession, grid_id: uuid.UUID) -> Grid:
    """Control-plane stop: состояние сначала фиксируется, торгует только Worker."""
    grid = await _load_grid(db, grid_id)
    grid.status = GridStatus.STOPPING
    await db.flush()
    await db.commit()
    await publish("grids:commands", json.dumps({"action": "stop", "grid_id": str(grid.id)}))
    return grid


async def emergency_stop_all(db: AsyncSession) -> dict:
    """Аварийная остановка: отменить ВСЕ ордеры на всех биржах, остановить все сетки."""
    result = await db.execute(
        select(Grid)
        .where(Grid.status == GridStatus.RUNNING)
        .options(selectinload(Grid.orders), selectinload(Grid.account))
    )
    grids = list(result.scalars().all())

    stopped = 0
    cancelled_orders = 0
    errors: list[str] = []

    for grid in grids:
        try:
            state = registry.states.get(grid.id)
            executor = registry.executors.get(grid.id)

            # Если есть runtime — отменяем через state
            if state is not None and executor is not None:
                cancel_tasks = []
                for order in state.orders:
                    if order.status == OrderStatus.PLACED:
                        cancel_tasks.append(executor.cancel_order(order.exchange_order_id))
                        order.status = OrderStatus.CANCELLED
                        cancelled_orders += 1
                if cancel_tasks:
                    await asyncio.gather(*cancel_tasks, return_exceptions=True)
                await _persist_state(db, grid, state)
            else:
                # Fallback: создаём executor и отменяем через API биржи
                try:
                    executor = await _create_executor(grid.account, grid)
                    open_orders = await executor.get_open_orders()
                    cancel_tasks = []
                    for o in open_orders:
                        cancel_tasks.append(executor.cancel_order(o["id"]))
                        cancelled_orders += 1
                    if cancel_tasks:
                        await asyncio.gather(*cancel_tasks, return_exceptions=True)
                    close = getattr(executor, "close", None)
                    if callable(close):
                        await close()
                except Exception as exc:
                    errors.append(f"{grid.name}: fallback cancel failed: {exc}")

            grid.status = GridStatus.STOPPED
            grid.stopped_at = datetime.now(UTC)

            # Очищаем runtime
            registry.states.pop(grid.id, None)
            registry.engines.pop(grid.id, None)
            removed = registry.executors.pop(grid.id, None)
            if removed is not None:
                close = getattr(removed, "close", None)
                if callable(close):
                    await close()

            stopped += 1
        except Exception as exc:
            errors.append(f"{grid.name}: {exc}")

    await db.flush()

    await bot_logger.critical(
        f"АВАРИЙНАЯ ОСТАНОВКА: {stopped} сеток остановлено, {cancelled_orders} ордеров отменено",
        payload={"stopped": stopped, "cancelled_orders": cancelled_orders, "errors": errors},
    )

    return {
        "stopped_grids": stopped,
        "cancelled_orders": cancelled_orders,
        "errors": errors,
    }


async def _auto_convert_profit(grid: Grid, executor: Executor, amount: Decimal) -> bool:
    """Конвертирует прибыль в целевую валюту (например USDC). Возвращает True при успехе."""
    target = grid.auto_convert_to
    if not target:
        return False

    # Определяем quote-валюту из символа сетки (BTC/USDT → USDT)
    quote = grid.symbol.split("/")[1]
    if target.upper() == quote.upper():
        return False  # прибыль уже в целевой валюте

    exchange = getattr(executor, "exchange", None)
    if exchange is None:
        return False

    try:
        if not exchange.markets:
            await exchange.load_markets()

        # USDT → USDC: ищем пару USDC/USDT (buy) или USDT/USDC (sell)
        direct = f"{quote}/{target}"  # USDT/USDC — sell USDT
        reverse = f"{target}/{quote}"  # USDC/USDT — buy USDC

        if direct in exchange.markets:
            await exchange.create_market_order(direct, "sell", float(amount))
        elif reverse in exchange.markets:
            ticker = await exchange.fetch_ticker(reverse)
            price = ticker.get("last") or ticker.get("ask") or 0
            if not price:
                return False
            buy_amount = float(amount) / float(price)
            await exchange.create_market_order(reverse, "buy", buy_amount)
        else:
            await bot_logger.warning(
                f"Авто-конвертация: пара {quote}/{target} не найдена",
                grid_id=grid.id,
            )
            return False

        await bot_logger.info(
            f"Авто-конвертация: {amount} {quote} → {target}",
            grid_id=grid.id,
            payload={"amount": str(amount), "from": quote, "to": target},
        )
        return True
    except Exception as exc:
        await bot_logger.warning(
            f"Авто-конвертация не удалась: {exc}",
            grid_id=grid.id,
            payload={"amount": str(amount), "error": str(exc)[:200]},
        )
        return False


# Минимальная сумма для конвертации (ограничение биржи)
_MIN_CONVERT_AMOUNT = Decimal("1.1")


async def tick_grid(db: AsyncSession, grid_id: uuid.UUID) -> Grid:
    grid = await _load_grid(db, grid_id)
    try:
        engine, state = await _ensure_runtime(db, grid)

        # Сохраняем до тика: tick() мутирует state in-place, new_state IS state
        prev_pnl = state.realized_pnl
        prev_trades = state.total_trades

        new_state = await engine.tick(state, datetime.now(UTC))
        pnl_delta = new_state.realized_pnl - prev_pnl
        new_trades = new_state.total_trades - prev_trades
        registry.states[grid.id] = new_state
        await _persist_state(db, grid, new_state)

        if new_trades > 0:
            # Трекинг slippage: сравниваем текущую mid цену с ожидаемой
            ticker = await engine.executor.get_ticker()
            mid_price = float(ticker.mid)

            event = TradeEvent(
                grid_id=grid.id,
                event_type=TradeEventType.FILLED,
                price=ticker.mid,
                pnl_delta=pnl_delta,
                payload={
                    "total_trades": new_state.total_trades,
                    "new_trades": new_trades,
                    "mid_price_at_fill": mid_price,
                    "bid": float(ticker.bid),
                    "ask": float(ticker.ask),
                    "spread": float(ticker.ask - ticker.bid),
                },
            )
            db.add(event)
            await db.flush()
            await bot_logger.info(
                f"Новые сделки: {new_trades}, PnL дельта: {pnl_delta}",
                grid_id=grid.id,
                payload={"new_trades": new_trades, "pnl_delta": str(pnl_delta), "total_pnl": str(new_state.realized_pnl)},
            )

            # Авто-конвертация прибыли
            # Reverse накапливает base-актив; его нельзя неявно продавать через
            # quote auto-convert. Для него нужна отдельная явная политика вывода.
            if grid.strategy != StrategyType.REVERSE and grid.auto_convert_to and pnl_delta > 0:
                grid.unconverted_pnl = (grid.unconverted_pnl or Decimal("0")) + pnl_delta
                if grid.unconverted_pnl >= _MIN_CONVERT_AMOUNT:
                    executor = registry.executors.get(grid.id)
                    if executor:
                        converted = await _auto_convert_profit(grid, executor, grid.unconverted_pnl)
                        if converted:
                            grid.unconverted_pnl = Decimal("0")

        await publish(
            f"grid:{grid.id}:events",
            json.dumps(
                {
                    "type": "grid.tick",
                    "grid_id": str(grid.id),
                    "realized_pnl": str(new_state.realized_pnl),
                    "total_trades": new_state.total_trades,
                }
            ),
        )
        return grid
    except Exception as exc:
        await bot_logger.error(
            f"Ошибка при тике сетки {grid.name}: {exc}",
            grid_id=grid.id,
            exc=exc,
        )
        raise
