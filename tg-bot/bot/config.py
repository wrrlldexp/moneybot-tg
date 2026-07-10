"""Bot configuration from environment variables."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class BotSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    TELEGRAM_BOT_TOKEN: str
    TELEGRAM_WEBAPP_URL: str = "http://localhost:5174"
    BACKEND_URL: str = "http://backend:8000"
    REDIS_URL: str = "redis://redis:6379/0"

    # Allowed Telegram user IDs (admins)
    ADMIN_TELEGRAM_IDS: str = ""

    @property
    def admin_ids(self) -> set[int]:
        if not self.ADMIN_TELEGRAM_IDS:
            return set()
        return {int(x.strip()) for x in self.ADMIN_TELEGRAM_IDS.split(",") if x.strip()}


def get_settings() -> BotSettings:
    return BotSettings()  # type: ignore[call-arg]
