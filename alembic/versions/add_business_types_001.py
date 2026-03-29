"""add business_types table

Revision ID: add_business_types_001
Revises: 
Create Date: 2026-02-21 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_business_types_001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'business_types',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('code', sa.String(50), nullable=False, unique=True, index=True),
        sa.Column('label', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('default_label_customers', sa.String(50), nullable=False, server_default='Cliente'),
        sa.Column('default_label_appointments', sa.String(50), nullable=False, server_default='Cita'),
        sa.Column('default_label_pets', sa.String(50), nullable=False, server_default='Mascota'),
        sa.Column('supports_pets', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Seed default business types
    op.execute("""
        INSERT INTO business_types (code, label, description, icon, is_active, default_label_customers, default_label_appointments, default_label_pets, supports_pets, "order")
        VALUES 
            ('veterinaria', 'Veterinaria', 'Clínicas veterinarias y hospitales para animales', '🏥', 1, 'Cliente', 'Consulta', 'Mascota', 1, 1),
            ('barberia', 'Barbería', 'Barberías y peluquerías para hombres', '💈', 1, 'Cliente', 'Cita', 'N/A', 0, 2),
            ('spa', 'Spa / Estética', 'Centros de estética, spas y salones de belleza', '💆', 1, 'Cliente', 'Reserva', 'N/A', 0, 3),
            ('clinica', 'Clínica Médica', 'Clínicas médicas y consultorios', '⚕️', 1, 'Paciente', 'Consulta', 'N/A', 0, 4),
            ('peluqueria', 'Peluquería', 'Peluquerías y salones de belleza', '✂️', 1, 'Cliente', 'Turno', 'N/A', 0, 5),
            ('dental', 'Odontología', 'Consultorios dentales y clínicas odontológicas', '🦷', 1, 'Paciente', 'Consulta', 'N/A', 0, 6),
            ('otro', 'Otro', 'Otro tipo de negocio', '📋', 1, 'Cliente', 'Cita', 'N/A', 0, 99)
    """)


def downgrade() -> None:
    op.drop_table('business_types')
