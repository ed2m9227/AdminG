"""Add service columns to payments and appointments

Revision ID: add_services_001
Revises: s3_service_packages_001
Create Date: 2026-03-17 15:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_services_001'
down_revision = 's3_service_packages_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add columns to payments table
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('service_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('service_package_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('concept', sa.String(length=200), nullable=True))
        batch_op.create_foreign_key('fk_payments_service_id', 'inventory_items', ['service_id'], ['id'])
        batch_op.create_foreign_key('fk_payments_service_package_id', 'service_packages', ['service_package_id'], ['id'])

    # Add columns to appointments table
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.add_column(sa.Column('service_package_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_appointments_service_package_id', 'service_packages', ['service_package_id'], ['id'])


def downgrade() -> None:
    # Remove columns from appointments table
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_appointments_service_package_id', type_='foreignkey')
        batch_op.drop_column('service_package_id')

    # Remove columns from payments table
    with op.batch_alter_table('payments', schema=None) as batch_op:
        batch_op.drop_constraint('fk_payments_service_package_id', type_='foreignkey')
        batch_op.drop_constraint('fk_payments_service_id', type_='foreignkey')
        batch_op.drop_column('concept')
        batch_op.drop_column('service_package_id')
        batch_op.drop_column('service_id')
