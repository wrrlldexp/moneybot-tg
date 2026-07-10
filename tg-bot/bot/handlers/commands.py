"""Bot command handlers — /status, /pnl, callback queries."""

from __future__ import annotations

import aiohttp
from aiogram import Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, Message

from bot.config import get_settings

router = Router()
settings = get_settings()


async def _api_get(path: str) -> dict | None:
    """Call backend API (internal, no auth — bot-to-backend)."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{settings.BACKEND_URL}{path}", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    return await resp.json()
    except Exception:
        pass
    return None


def _format_status(data: dict) -> str:
    status = data.get("status", "unknown")
    grids_active = data.get("active_grids", 0)
    grids_total = data.get("total_grids", 0)
    return (
        f"Bot: {status}\n"
        f"Grids: {grids_active}/{grids_total} active"
    )


def _format_pnl(data: dict) -> str:
    total = data.get("total_pnl", 0)
    trades = data.get("total_trades", 0)
    active = data.get("active_grids", 0)
    return (
        f"Total PnL: {total:.4f}\n"
        f"Trades: {trades}\n"
        f"Active grids: {active}"
    )


@router.message(Command("status"))
async def cmd_status(message: Message) -> None:
    data = await _api_get("/api/dashboard/")
    if data is None:
        await message.answer("Backend unavailable")
        return
    await message.answer(_format_status(data))


@router.message(Command("pnl"))
async def cmd_pnl(message: Message) -> None:
    data = await _api_get("/api/dashboard/")
    if data is None:
        await message.answer("Backend unavailable")
        return
    await message.answer(_format_pnl(data))


@router.callback_query(lambda c: c.data == "cmd_status")
async def cb_status(callback: CallbackQuery) -> None:
    data = await _api_get("/api/dashboard/")
    text = _format_status(data) if data else "Backend unavailable"
    await callback.message.answer(text)  # type: ignore[union-attr]
    await callback.answer()


@router.callback_query(lambda c: c.data == "cmd_pnl")
async def cb_pnl(callback: CallbackQuery) -> None:
    data = await _api_get("/api/dashboard/")
    text = _format_pnl(data) if data else "Backend unavailable"
    await callback.message.answer(text)  # type: ignore[union-attr]
    await callback.answer()


@router.callback_query(lambda c: c.data == "cmd_stop_all")
async def cb_stop_all(callback: CallbackQuery) -> None:
    """Emergency stop all grids via bot API."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{settings.BACKEND_URL}/api/bot/stop-all",
                timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 200:
                    await callback.message.answer("All grids stopped")  # type: ignore[union-attr]
                else:
                    await callback.message.answer(f"Error: {resp.status}")  # type: ignore[union-attr]
    except Exception as exc:
        await callback.message.answer(f"Error: {exc}")  # type: ignore[union-attr]
    await callback.answer()
