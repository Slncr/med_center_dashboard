"""add prescription completed_at

Revision ID: a1b2c3d4e5f6
Revises: 8ebb3cfa0b15
Create Date: 2026-05-25 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "a1b2c3d4e5f6"
down_revision = "8ebb3cfa0b15"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("prescriptions", sa.Column("completed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("prescriptions", "completed_at")
