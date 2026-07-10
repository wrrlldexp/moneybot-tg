"""Telegram Bot entry point — aiogram 3 polling mode."""

from __future__ import annotations

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode

from bot.config import get_settings
from bot.handlers import commands, start
from bot.notifications import start_notification_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
log = logging.getLogger(__name__)


async def main() -> None:
    settings = get_settings()

    bot = Bot(
        token=settings.TELEGRAM_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    dp = Dispatcher()
    dp.include_router(start.router)
    dp.include_router(commands.router)

    # Start notification listener in background
    notification_task = asyncio.create_task(start_notification_listener(bot))

    log.info("Bot starting in polling mode...")
    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        notification_task.cancel()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
