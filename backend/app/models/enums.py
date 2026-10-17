"""Перечисления, используемые в моделях БД."""

import enum


class UserRole(str, enum.Enum):
    ULTRAADMIN = "ultraadmin"
    SUPERADMIN = "superadmin"
    ADMIN = "admin"
    VIEWER = "viewer"


class GridMode(str, enum.Enum):
    """Режим торговли сетки."""

    PAPER = "paper"
    LIVE = "live"


class GridStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"


class StrategyType(str, enum.Enum):
    """Взаимоисключающие алгоритмы поведения сетки.

    Капитализация намеренно не является стратегией: это настройка размера
    следующего ордера и может быть включена для любого алгоритма.
    """

    SIMPLE = "simple"
    ADAPTIVE = "adaptive"
    REVERSE = "reverse"


class OrderSide(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class OrderStatus(str, enum.Enum):
    PENDING = "pending"     # ещё не отправлен на биржу
    PLACED = "placed"       # размещён, ждёт исполнения
    FILLED = "filled"       # исполнен
    CANCELLED = "cancelled"
    WAIT = "wait"           # ожидает (вне адаптивной подсетки)
    ERROR = "error"


class TradeEventType(str, enum.Enum):
    PLACED = "placed"
    FILLED = "filled"
    CANCELLED = "cancelled"
    FLIPPED = "flipped"     # ордер перевернулся (buy → sell или наоборот)
    GRID_REBUILT = "grid_rebuilt"
    ADAPTIVE_SHIFT = "adaptive_shift"  # подсетка сдвинулась


class LogLevel(str, enum.Enum):
    """Уровень логирования бота."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"
