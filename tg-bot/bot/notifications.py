"""Listen to Redis alerts channel and forward to Telegram users."""

from __future__ import annotations

import asyncio
import json
import logging

import redis.asyncio as aioredis
from aiogram import Bot

from bot.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

ALERTS_CHANNEL = "alerts"


async def start_notification_listener(bot: Bot) -> None:
    """Subscribe to Redis alerts and send Telegram notifications."""
    r = aioredis.from_url(settings.REDIS_URL)
    pubsub = r.pubsub()
    await pubsub.subscribe(ALERTS_CHANNEL)

    log.info("Notification listener started on channel: %s", ALERTS_CHANNEL)

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            try:
                alert = json.loads(message["data"])
                if alert.get("send_telegram"):
                    await _dispatch_alert(bot, alert)
            except Exception:
                log.exception("Error processing alert")
    finally:
        await pubsub.unsubscribe(ALERTS_CHANNEL)
        await r.aclose()


async def _dispatch_alert(bot: Bot, alert: dict) -> None:
    """Send alert to admin Telegram IDs."""
    level = alert.get("level", "info").upper()
    channel = alert.get("channel", "system")
    message = alert.get("message", "")
    grid_id = alert.get("grid_id")

    text = f"[{level}] {channel}\n{message}"
    if grid_id:
        text += f"\nGrid: {grid_id}"

    for admin_id in settings.admin_ids:
        try:
            await bot.send_message(admin_id, text)
        except Exception:
            log.warning("Failed to send notification to %s", admin_id)
