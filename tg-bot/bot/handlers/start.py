"""Start command handler."""

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from bot.config import get_settings
from bot.keyboards import webapp_keyboard

router = Router()
settings = get_settings()


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    """Handle /start — open Mini App."""
    await message.answer(
        "MoneyBot v2\n\n"
        "Manage your trading grids from this app.",
        reply_markup=webapp_keyboard(settings.TELEGRAM_WEBAPP_URL),
    )
