"""set default monitor_zone: room 3->1, 5->2, 7->3

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-26

"""
from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None

# Палата (number) -> зона ATM
ROOM_ZONE_MAP = (
    ("3", 1),
    ("5", 2),
    ("7", 3),
)


def upgrade() -> None:
    for room_number, zone in ROOM_ZONE_MAP:
        op.execute(
            f"UPDATE rooms SET monitor_zone = {zone} "
            f"WHERE trim(number) = '{room_number}'"
        )


def downgrade() -> None:
    for room_number, _ in ROOM_ZONE_MAP:
        op.execute(
            f"UPDATE rooms SET monitor_zone = NULL "
            f"WHERE trim(number) = '{room_number}'"
        )
