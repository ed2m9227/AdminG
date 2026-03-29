"""Update plans to free, starter, pro, max

Revision ID: update_plans_001
Revises: add_service_user_fields_001
Create Date: 2026-02-11 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'update_plans_001'
down_revision: Union[str, None] = 'add_service_user_fields_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Migración para actualizar los planes del sistema:
    - Mapear planes antiguos a nuevos
    - Actualizar registros de usuarios
    - Limpiar registros obsoletos
    """
    
    # 1. Actualizar planes en tabla users
    # Mapeo: AdminG_Basic -> starter
    op.execute("""
        UPDATE users 
        SET plan = 'starter' 
        WHERE plan IN ('AdminG_Basic', 'basic')
    """)
    
    # Mapeo: AdminG_Plus -> starter (también)
    op.execute("""
        UPDATE users 
        SET plan = 'starter' 
        WHERE plan = 'AdminG_Plus'
    """)
    
    # Mapeo: AdminPro_Start -> pro
    op.execute("""
        UPDATE users 
        SET plan = 'pro' 
        WHERE plan IN ('AdminPro_Start', 'start')
    """)
    
    # Mapeo: AdminPro_Max -> max
    op.execute("""
        UPDATE users 
        SET plan = 'max' 
        WHERE plan IN ('AdminPro_Max', 'plus')
    """)
    
    # Mapeo: admin -> max (usuarios administrativos)
    op.execute("""
        UPDATE users 
        SET plan = 'max' 
        WHERE plan = 'admin'
    """)
    
    # Usuarios sin plan -> free
    op.execute("""
        UPDATE users 
        SET plan = 'free' 
        WHERE plan IS NULL OR plan = '' OR plan NOT IN ('free', 'starter', 'pro', 'max')
    """)
    
    # 2. Actualizar tabla plans (si existe)
    # Verificar primero si la tabla existe
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'plans' in inspector.get_table_names():
        # Eliminar planes antiguos
        op.execute("""
            DELETE FROM plans 
            WHERE code IN ('AdminG_Basic', 'AdminG_Plus', 'AdminPro_Start', 'AdminPro_Max', 'basic', 'plus', 'start')
        """)
        
        # Insertar nuevos planes si no existen
        op.execute("""
            INSERT OR IGNORE INTO plans (code, name, price, duration_days, is_active, created_at, updated_at)
            VALUES 
                ('free', 'Plan Gratuito', 0.00, 365, 1, datetime('now'), datetime('now')),
                ('starter', 'Plan Starter', 39900.00, 30, 1, datetime('now'), datetime('now')),
                ('pro', 'Plan Pro', 99900.00, 30, 1, datetime('now'), datetime('now')),
                ('max', 'Plan Max', 249900.00, 30, 1, datetime('now'), datetime('now'))
        """)
    
    # 3. Actualizar plan_limits (si existe)
    if 'plan_limits' in inspector.get_table_names():
        # Eliminar límites de planes antiguos
        op.execute("""
            DELETE FROM plan_limits 
            WHERE plan_id IN (
                SELECT id FROM plans 
                WHERE code IN ('AdminG_Basic', 'AdminG_Plus', 'AdminPro_Start', 'AdminPro_Max', 'basic', 'plus', 'start')
            )
        """)


def downgrade() -> None:
    """
    Revertir cambios (mapear de vuelta a planes antiguos)
    """
    
    # Revertir mapeo de usuarios
    op.execute("""
        UPDATE users 
        SET plan = 'AdminG_Basic' 
        WHERE plan = 'starter'
    """)
    
    op.execute("""
        UPDATE users 
        SET plan = 'AdminPro_Start' 
        WHERE plan = 'pro'
    """)
    
    op.execute("""
        UPDATE users 
        SET plan = 'AdminPro_Max' 
        WHERE plan = 'max'
    """)
    
    op.execute("""
        UPDATE users 
        SET plan = 'AdminG_Basic' 
        WHERE plan = 'free'
    """)
    
    # Revertir tabla plans
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'plans' in inspector.get_table_names():
        op.execute("""
            DELETE FROM plans 
            WHERE code IN ('free', 'starter', 'pro', 'max')
        """)
        
        # Restaurar planes antiguos
        op.execute("""
            INSERT OR IGNORE INTO plans (code, name, price, duration_days, is_active, created_at, updated_at)
            VALUES 
                ('AdminG_Basic', 'AdminG Básico', 5000.00, 30, 1, datetime('now'), datetime('now')),
                ('AdminG_Plus', 'AdminG Plus', 30000.00, 30, 1, datetime('now'), datetime('now')),
                ('AdminPro_Start', 'AdminPro Start', 50000.00, 30, 1, datetime('now'), datetime('now')),
                ('AdminPro_Max', 'AdminPro Max', 100000.00, 30, 1, datetime('now'), datetime('now'))
        """)
