"""Add Pet table

Revision ID: add_pet_table_001
Revises: 0ceb8e4c9f5f
Create Date: 2026-02-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_pet_table_001'
down_revision = '0ceb8e4c9f5f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create Pet table
    op.create_table(
        'pets',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('animal_type', sa.String(length=50), nullable=False),
        sa.Column('breed', sa.String(length=120), nullable=True),
        sa.Column('color_description', sa.String(length=255), nullable=True),
        sa.Column('age_years', sa.Integer(), nullable=True),
        sa.Column('age_months', sa.Integer(), nullable=True),
        sa.Column('weight_kg', sa.Float(), nullable=True),
        sa.Column('gender', sa.String(length=10), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('microchip', sa.String(length=50), nullable=True),
        sa.Column('neutered_spayed', sa.Boolean(), nullable=True),
        sa.Column('allergies', sa.Text(), nullable=True),
        sa.Column('current_medications', sa.Text(), nullable=True),
        sa.Column('last_checkup_date', sa.DateTime(), nullable=True),
        sa.Column('vaccination_status', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pets_customer_id'), 'pets', ['customer_id'], unique=False)
    op.create_index(op.f('ix_pets_microchip'), 'pets', ['microchip'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_pets_microchip'), table_name='pets')
    op.drop_index(op.f('ix_pets_customer_id'), table_name='pets')
    op.drop_table('pets')
