"""
Reset Database and Create Admin User
Run this script to cleanly reset the database with proper schema and seed data
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.db.session import engine
from app.db.base import Base
from app.models.user import User
from app.models.business_type import BusinessType
from app.core.security import hash_password
from sqlalchemy.orm import Session

def reset_database():
    print("🗑️  Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    
    print("📋 Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database reset complete!")

def seed_business_types(db: Session):
    print("\n🌱 Seeding business types...")
    
    types = [
        {
            'code': 'veterinaria',
            'label': 'Veterinaria',
            'description': 'Clínicas veterinarias y hospitales para animales',
            'icon': '🏥',
            'default_label_customers': 'Cliente',
            'default_label_appointments': 'Consulta',
            'default_label_pets': 'Mascota',
            'supports_pets': True,
            'order': 1
        },
        {
            'code': 'barberia',
            'label': 'Barbería',
            'description': 'Barberías y peluquerías para hombres',
            'icon': '💈',
            'default_label_customers': 'Cliente',
            'default_label_appointments': 'Cita',
            'default_label_pets': 'N/A',
            'supports_pets': False,
            'order': 2
        },
        {
            'code': 'spa',
            'label': 'Spa / Estética',
            'description': 'Centros de estética, spas y salones de belleza',
            'icon': '💆',
            'default_label_customers': 'Cliente',
            'default_label_appointments': 'Reserva',
            'default_label_pets': 'N/A',
            'supports_pets': False,
            'order': 3
        },
        {
            'code': 'clinica',
            'label': 'Clínica Médica',
            'description': 'Clínicas médicas y consultorios',
            'icon': '⚕️',
            'default_label_customers': 'Paciente',
            'default_label_appointments': 'Consulta',
            'default_label_pets': 'N/A',
            'supports_pets': False,
            'order': 4
        },
        {
            'code': 'peluqueria',
            'label': 'Peluquería',
            'description': 'Peluquerías y salones de belleza',
            'icon': '✂️',
            'default_label_customers': 'Cliente',
            'default_label_appointments': 'Turno',
            'default_label_pets': 'N/A',
            'supports_pets': False,
            'order': 5
        },
        {
            'code': 'dental',
            'label': 'Odontología',
            'description': 'Consultorios dentales y clínicas odontológicas',
            'icon': '🦷',
            'default_label_customers': 'Paciente',
            'default_label_appointments': 'Consulta',
            'default_label_pets': 'N/A',
            'supports_pets': False,
            'order': 6
        },
        {
            'code': 'otro',
            'label': 'Otro',
            'description': 'Otro tipo de negocio',
            'icon': '📋',
            'default_label_customers': 'Cliente',
            'default_label_appointments': 'Cita',
            'default_label_pets': 'N/A',
            'supports_pets': False,
            'order': 99
        }
    ]
    
    for type_data in types:
        business_type = BusinessType(**type_data)
        db.add(business_type)
    
    db.commit()
    print(f"✅ Created {len(types)} business types")

def create_admin_user(db: Session):
    print("\n👤 Creating admin user...")
    
    admin = User(
        email="admin@adminsystems.com",
        hashed_password=hash_password("admin123"),
        role="admin",
        plan="admin",
        business_type="otro"
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    print(f"✅ Admin user created!")
    print(f"   Email: admin@adminsystems.com")
    print(f"   Password: admin123")
    print(f"   Role: admin")
    print(f"   Plan: admin")
    
    return admin

def create_test_user(db: Session):
    print("\n👤 Creating test user (caniche2)...")
    
    test_user = User(
        email="caniche2@example.com",
        hashed_password=hash_password("caniche2"),
        role="manager",
        plan="AdminG_Basic",
        business_type="veterinaria"
    )
    
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    print(f"✅ Test user created!")
    print(f"   Email: caniche2@example.com")
    print(f"   Password: caniche2")
    print(f"   Role: manager")
    print(f"   Plan: AdminG_Basic")
    
    return test_user

if __name__ == "__main__":
    print("="*60)
    print("AdminG Database Reset & Seed Script")
    print("="*60)
    
    confirm = input("\n⚠️  This will DELETE all data. Continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("❌ Aborted.")
        sys.exit(0)
    
    # Reset database
    reset_database()
    
    # Create session
    from app.db.session import SessionLocal
    db = SessionLocal()
    
    try:
        # Seed data
        seed_business_types(db)
        create_admin_user(db)
        create_test_user(db)
        
        print("\n" + "="*60)
        print("✅ Database reset and seeded successfully!")
        print("="*60)
        print("\nYou can now login with:")
        print("  - admin@adminsystems.com / admin123 (Full admin access)")
        print("  - caniche2@example.com / caniche2 (Basic plan test user)")
        print("\n🚀 Start the server with: uvicorn app.main:app --reload")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()
