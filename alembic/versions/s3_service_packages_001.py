"""S3: Add service package tables

Revision ID: s3_service_packages_001
Revises: s2_invoices_001
Create Date: 2026-03-05 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "s3_service_packages_001"
down_revision = "s2_invoices_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "service_packages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("discount_percentage", sa.Numeric(5, 2), server_default="0", nullable=False),
        sa.Column("base_price", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("final_price", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("1"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_service_packages_id", "service_packages", ["id"])
    op.create_index("ix_service_packages_user_id", "service_packages", ["user_id"])

    op.create_table(
        "service_package_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("package_id", sa.Integer(), nullable=False),
        sa.Column("service_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["package_id"], ["service_packages.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("package_id", "service_id", name="uq_package_service"),
    )
    op.create_index("ix_service_package_items_id", "service_package_items", ["id"])


def downgrade() -> None:
    op.drop_index("ix_service_package_items_id", table_name="service_package_items")
    op.drop_table("service_package_items")
    op.drop_index("ix_service_packages_user_id", table_name="service_packages")
    op.drop_index("ix_service_packages_id", table_name="service_packages")
    op.drop_table("service_packages")
