"""add onboarding_completed field to users

Revision ID: add_onboarding_completed_001
Revises: add_business_config_table_001
Create Date: 2026-02-27 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_onboarding_completed_001'
down_revision = 'add_business_config_table_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add onboarding_completed column to users table
    op.add_column('users', sa.Column('onboarding_completed', sa.Boolean(), nullable=False, server_default='0'))
    
    # Update existing users: mark admins as onboarding_completed=True
    op.execute("UPDATE users SET onboarding_completed = 1 WHERE role = 'admin'")
    
    # Update existing users: mark sub-users (with parent_user_id) as onboarding_completed=True
    op.execute("UPDATE users SET onboarding_completed = 1 WHERE parent_user_id IS NOT NULL")


def downgrade():
    op.drop_column('users', 'onboarding_completed')
