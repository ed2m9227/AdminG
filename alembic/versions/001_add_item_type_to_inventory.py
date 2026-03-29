"""Add item_type to inventory_items table

Revision ID: 001_add_item_type
Revises: None
Create Date: 2026-03-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_add_item_type'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Agregar columna item_type con valor por defecto 'product'
    op.add_column('inventory_items', 
        sa.Column('item_type', sa.String(20), nullable=False, server_default='product')
    )
    print("✅ Column 'item_type' added to inventory_items with default value 'product'")


def downgrade() -> None:
    # Remover columna en rollback
    op.drop_column('inventory_items', 'item_type')
    print("⬅️ Column 'item_type' removed from inventory_items")
