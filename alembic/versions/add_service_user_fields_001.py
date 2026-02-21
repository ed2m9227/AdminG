"""Add user ownership to services

Revision ID: add_service_user_fields_001
Revises: add_business_config_table_001
Create Date: 2026-02-20 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "add_service_user_fields_001"
down_revision = "add_business_config_table_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.add_column(sa.Column("user_id", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("description", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")))
        batch_op.create_index("ix_services_user_id", ["user_id"], unique=False)
        batch_op.create_foreign_key("fk_services_user_id", "users", ["user_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("services") as batch_op:
        batch_op.drop_constraint("fk_services_user_id", type_="foreignkey")
        batch_op.drop_index("ix_services_user_id")
        batch_op.drop_column("is_active")
        batch_op.drop_column("description")
        batch_op.drop_column("user_id")
