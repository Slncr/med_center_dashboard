"""add patient feature flags

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-28 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("flag_white", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("patients", sa.Column("flag_yellow", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("patients", sa.Column("flag_red", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("patients", sa.Column("flag_orange", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("patients", sa.Column("flag_green", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("patients", "flag_green")
    op.drop_column("patients", "flag_orange")
    op.drop_column("patients", "flag_red")
    op.drop_column("patients", "flag_yellow")
    op.drop_column("patients", "flag_white")
