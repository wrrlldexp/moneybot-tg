"""Тесты фабрики исполнителей."""

import asyncio

from app.strategy.executors import CcxtExecutor, PaperExecutor, create_executor
from app.strategy.executors.ccxt_executor import create_ccxt_exchange


def test_create_executor_returns_paper_executor_in_paper_mode() -> None:
    executor = create_executor("binance", "key", "secret", paper_mode=True)

    assert isinstance(executor, PaperExecutor)


def test_create_executor_supports_bybit() -> None:
    executor = create_executor("bybit", "key", "secret", testnet=True, symbol="ETH/USDT")

    assert isinstance(executor, CcxtExecutor)
    assert executor.exchange_id == "bybit"
    assert executor.symbol == "ETH/USDT"


def test_create_executor_rejects_unknown_exchange() -> None:
    try:
        create_executor("kraken", "key", "secret")
    except ValueError:
        pass
    else:
        raise AssertionError("Expected ValueError for unsupported exchange")


def test_binance_uses_official_gcp_spot_endpoint() -> None:
    exchange = create_ccxt_exchange("binance")
    try:
        assert exchange.urls["api"]["public"].startswith("https://api-gcp.binance.com/")
        assert exchange.options["fetchMarkets"]["types"] == ["spot"]
        assert exchange.options["fetchCurrencies"] is False
    finally:
        asyncio.run(exchange.close())


def test_bybit_uses_official_alternative_hostname() -> None:
    exchange = create_ccxt_exchange("bybit")
    try:
        assert exchange.hostname == "bytick.com"
        assert exchange.options["fetchMarkets"]["types"] == ["spot"]
        assert exchange.timeout == 20_000
    finally:
        asyncio.run(exchange.close())
