"""add monitoring fields ble_mac monitor_zone

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-25 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("ble_mac", sa.String(), nullable=True))
    op.create_index(op.f("ix_patients_ble_mac"), "patients", ["ble_mac"], unique=False)
    op.add_column("rooms", sa.Column("monitor_zone", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("rooms", "monitor_zone")
    op.drop_index(op.f("ix_patients_ble_mac"), table_name="patients")
    op.drop_column("patients", "ble_mac")
