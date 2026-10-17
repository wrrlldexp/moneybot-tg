"""Normalize six legacy modes to three strategies plus capitalization.

Revision ID: 20261007_0010
Revises: 20260710_0009
"""

from alembic import op
import sqlalchemy as sa


revision = "20261007_0010"
down_revision = "20260710_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE grid_status ADD VALUE IF NOT EXISTS 'stopping'")
    op.add_column(
        "grids",
        sa.Column("capitalization_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column(
        "grids",
        sa.Column("capitalization_percent", sa.Numeric(5, 2), server_default="100", nullable=False),
    )
    op.add_column(
        "grids",
        sa.Column("capitalization_max_order_quote", sa.Numeric(20, 8), nullable=True),
    )
    op.add_column(
        "grids",
        sa.Column("realized_base_pnl", sa.Numeric(20, 8), server_default="0", nullable=False),
    )
    op.add_column("grids", sa.Column("last_adaptive_at", sa.DateTime(timezone=True), nullable=True))

    # Preserve the exact meaning of every legacy selection.
    op.execute(
        "UPDATE grids SET capitalization_enabled = true "
        "WHERE strategy::text IN ('capitalization', 'reverse_cap', 'adaptive_cap')"
    )
    op.execute("UPDATE grids SET strategy = 'simple' WHERE strategy::text = 'capitalization'")
    op.execute("UPDATE grids SET strategy = 'reverse' WHERE strategy::text = 'reverse_cap'")
    op.execute("UPDATE grids SET strategy = 'adaptive' WHERE strategy::text = 'adaptive_cap'")


def downgrade() -> None:
    # Restore legacy enum values using the capitalization flag.
    op.execute(
        "UPDATE grids SET strategy = 'capitalization' "
        "WHERE strategy::text = 'simple' AND capitalization_enabled = true"
    )
    op.execute(
        "UPDATE grids SET strategy = 'reverse_cap' "
        "WHERE strategy::text = 'reverse' AND capitalization_enabled = true"
    )
    op.execute(
        "UPDATE grids SET strategy = 'adaptive_cap' "
        "WHERE strategy::text = 'adaptive' AND capitalization_enabled = true"
    )
    op.drop_column("grids", "last_adaptive_at")
    op.drop_column("grids", "realized_base_pnl")
    op.drop_column("grids", "capitalization_max_order_quote")
    op.drop_column("grids", "capitalization_percent")
    op.drop_column("grids", "capitalization_enabled")
