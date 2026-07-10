"""Telegram keyboards."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo


def webapp_keyboard(webapp_url: str) -> InlineKeyboardMarkup:
    """Main keyboard with Mini App button."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(
            text="Open MoneyBot",
            web_app=WebAppInfo(url=webapp_url),
        )],
    ])


def main_menu_keyboard() -> InlineKeyboardMarkup:
    """Quick action buttons."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="Status", callback_data="cmd_status"),
            InlineKeyboardButton(text="PnL", callback_data="cmd_pnl"),
        ],
        [
            InlineKeyboardButton(text="Stop All", callback_data="cmd_stop_all"),
        ],
    ])
