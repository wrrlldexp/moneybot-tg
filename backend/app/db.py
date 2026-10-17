"""SQLAlchemy: движок, сессии, базовый класс моделей."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import get_settings

settings = get_settings()


def _create_engine():
    kwargs: dict = {
        "echo": settings.is_development,
        "pool_pre_ping": True,
    }
    if settings.DATABASE_URL.startswith("sqlite"):
        kwargs["poolclass"] = NullPool
    else:
        kwargs["pool_size"] = settings.DB_POOL_SIZE
        kwargs["max_overflow"] = settings.DB_MAX_OVERFLOW
        kwargs["pool_timeout"] = settings.DB_POOL_TIMEOUT_SEC
        kwargs["pool_recycle"] = settings.DB_POOL_RECYCLE_SEC
    return create_async_engine(settings.DATABASE_URL, **kwargs)


# Async движок
engine = _create_engine()

# Фабрика сессий
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Базовый класс для всех ORM моделей."""

    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency для получения сессии БД."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_models() -> None:
    """Создать таблицы для локального dev/test окружения."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
