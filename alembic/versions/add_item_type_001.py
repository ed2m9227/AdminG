"""Add item_type to inventory_items

Revision ID: add_item_type_001
Revises: s3_service_packages_001
Create Date: 2026-03-09 15:37:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_item_type_001'
down_revision = 's3_service_packages_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna item_type con valor por defecto 'product'
    op.add_column('inventory_items', 
        sa.Column('item_type', sa.String(20), nullable=False, server_default='product')
    )


def downgrade() -> None:
    # Remover columna en rollback
    op.drop_column('inventory_items', 'item_type')