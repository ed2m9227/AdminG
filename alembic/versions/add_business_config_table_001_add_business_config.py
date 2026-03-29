"""Add BusinessConfiguration table

Revision ID: add_business_config_table_001
Revises: add_pet_table_001
Create Date: 2026-02-20 12:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_business_config_table_001'
down_revision = 'add_pet_table_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create BusinessConfiguration table
    op.create_table(
        'business_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('business_type', sa.String(length=50), nullable=False),
        sa.Column('business_name', sa.String(length=255), nullable=True),
        sa.Column('business_description', sa.Text(), nullable=True),
        sa.Column('customer_label', sa.String(length=50), nullable=False),
        sa.Column('pet_label', sa.String(length=50), nullable=True),
        sa.Column('appointment_label', sa.String(length=50), nullable=False),
        sa.Column('pet_fields_enabled', sa.JSON(), nullable=True),
        sa.Column('customer_fields_enabled', sa.JSON(), nullable=True),
        sa.Column('custom_fields', sa.JSON(), nullable=True),
        sa.Column('has_pet_relationship', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_business_configurations_user_id'), 'business_configurations', ['user_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_business_configurations_user_id'), table_name='business_configurations')
    op.drop_table('business_configurations')
