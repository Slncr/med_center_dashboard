"""add prescription packages

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-28 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None

PACKAGE_STATUS = sa.Enum(
    "ACTIVE",
    "COMPLETED",
    name="prescriptionpackagestatus",
    create_type=False,
)


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE prescriptionpackagestatus AS ENUM ('ACTIVE', 'COMPLETED');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = inspector.get_table_names()

    if "prescription_packages" not in tables:
        op.create_table(
            "prescription_packages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("patient_id", sa.Integer(), nullable=False),
            sa.Column("created_by", sa.Integer(), nullable=False),
            sa.Column("general_notes", sa.Text(), nullable=True),
            sa.Column(
                "status",
                PACKAGE_STATUS,
                nullable=False,
                server_default="ACTIVE",
            ),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
            sa.ForeignKeyConstraint(["patient_id"], ["patients.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            op.f("ix_prescription_packages_id"),
            "prescription_packages",
            ["id"],
            unique=False,
        )

    presc_cols = {c["name"] for c in inspector.get_columns("prescriptions")}

    if "package_id" not in presc_cols:
        op.add_column(
            "prescriptions",
            sa.Column("package_id", sa.Integer(), nullable=True),
        )
    if "executions_required" not in presc_cols:
        op.add_column(
            "prescriptions",
            sa.Column("executions_required", sa.Integer(), nullable=False, server_default="1"),
        )
    if "executions_done" not in presc_cols:
        op.add_column(
            "prescriptions",
            sa.Column("executions_done", sa.Integer(), nullable=False, server_default="0"),
        )

    fk_names = {fk["name"] for fk in inspector.get_foreign_keys("prescriptions")}
    if "fk_prescriptions_package_id" not in fk_names:
        op.create_foreign_key(
            "fk_prescriptions_package_id",
            "prescriptions",
            "prescription_packages",
            ["package_id"],
            ["id"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    fk_names = {fk["name"] for fk in inspector.get_foreign_keys("prescriptions")}
    if "fk_prescriptions_package_id" in fk_names:
        op.drop_constraint("fk_prescriptions_package_id", "prescriptions", type_="foreignkey")

    presc_cols = {c["name"] for c in inspector.get_columns("prescriptions")}
    if "executions_done" in presc_cols:
        op.drop_column("prescriptions", "executions_done")
    if "executions_required" in presc_cols:
        op.drop_column("prescriptions", "executions_required")
    if "package_id" in presc_cols:
        op.drop_column("prescriptions", "package_id")

    if "prescription_packages" in inspector.get_table_names():
        op.drop_index(op.f("ix_prescription_packages_id"), table_name="prescription_packages")
        op.drop_table("prescription_packages")

    op.execute("DROP TYPE IF EXISTS prescriptionpackagestatus")
