"""Add telegram_id and telegram_username to users, create tg_notification_settings.

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-10
"""

from alembic import op
import sqlalchemy as sa

revision = "20260710_0009"
down_revision = "20260603_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add Telegram fields to users
    op.add_column("users", sa.Column("telegram_id", sa.BigInteger(), nullable=True))
    op.add_column("users", sa.Column("telegram_username", sa.String(255), nullable=True))
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=True)

    # Notification settings per user
    op.create_table(
        "tg_notification_settings",
        sa.Column("id", sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("notify_trades", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("notify_errors", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("notify_grid_status", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("notify_daily_summary", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("tg_notification_settings")
    op.drop_index("ix_users_telegram_id", table_name="users")
    op.drop_column("users", "telegram_username")
    op.drop_column("users", "telegram_id")
