"""Настройки приложения. Читаются из переменных окружения."""

import base64
import binascii
from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Главные настройки приложения."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Окружение
    ENVIRONMENT: str = Field(default="development")

    # БД
    DATABASE_URL: str = "sqlite+aiosqlite:///./moneybot.db"
    DB_POOL_SIZE: int = Field(default=10, ge=1, le=50)
    DB_MAX_OVERFLOW: int = Field(default=20, ge=0, le=100)
    DB_POOL_TIMEOUT_SEC: int = Field(default=30, ge=1, le=120)
    DB_POOL_RECYCLE_SEC: int = Field(default=1800, ge=60)

    # Redis
    REDIS_URL: str = Field(default="redis://localhost:6379/0")

    # JWT
    JWT_SECRET: str  # Обязательно задать в .env — нет дефолта
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TTL_MINUTES: int = 15
    JWT_REFRESH_TTL_DAYS: int = 7

    # Шифрование API-ключей биржи
    ENCRYPTION_KEY: str  # Обязательно задать в .env — нет дефолта

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # Telegram
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_WEBAPP_URL: str = ""

    # SOCKS proxy для обхода блокировок бирж (Cloudflare WARP)
    SOCKS_PROXY: str = ""

    # Rate limiting
    LOGIN_RATE_LIMIT_ATTEMPTS: int = 5
    LOGIN_RATE_LIMIT_WINDOW_SEC: int = 900  # 15 минут
    ACCESS_TOKEN_2FA_TTL_MINUTES: int = 5

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.ENVIRONMENT.lower() != "production":
            return self
        errors: list[str] = []
        if self.DATABASE_URL.startswith("sqlite") or "CHANGE_ME" in self.DATABASE_URL:
            errors.append("DATABASE_URL must use PostgreSQL")
        if len(self.JWT_SECRET) < 32 or "CHANGE_ME" in self.JWT_SECRET:
            errors.append("JWT_SECRET must be a generated secret of at least 32 characters")
        try:
            decoded_key = base64.urlsafe_b64decode(self.ENCRYPTION_KEY.encode())
            if len(decoded_key) != 32:
                raise ValueError
        except (ValueError, TypeError, binascii.Error):
            errors.append("ENCRYPTION_KEY must be a valid Fernet key")
        if "*" in self.cors_origins_list or any("localhost" in origin for origin in self.cors_origins_list):
            errors.append("CORS_ORIGINS must contain only production origins")
        if errors:
            raise ValueError("Invalid production configuration: " + "; ".join(errors))
        return self

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_development(self) -> bool:
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    """Singleton настроек. Кешируется."""
    return Settings()  # type: ignore[call-arg]
