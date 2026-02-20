"""
Script para crear usuario administrador con privilegios completos
"""
import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal, engine
from app.db.base import Base
from app.models.user import User
from app.core.security import hash_password

def create_admin():
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    
    try:
        # Verificar si ya existe el admin
        existing_admin = db.query(User).filter(User.email == "admin@admingpro.com").first()
        
        if existing_admin:
            print("⚠️  Usuario admin ya existe. Actualizando...")
            # Actualizar el usuario existente
            existing_admin.role = "admin"
            existing_admin.plan = "max"
            existing_admin.is_active = True
            existing_admin.hashed_password = hash_password("Admin123")
            db.commit()
            print("✅ Usuario admin actualizado exitosamente")
        else:
            # Crear nuevo admin
            admin_user = User(
                email="admin@admingpro.com",
                hashed_password=hash_password("Admin123"),
                role="admin",
                plan="max",
                is_active=True,
                business_type="master",
                parent_user_id=None
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print("✅ Usuario admin creado exitosamente")
        
        print("\n" + "="*50)
        print("📋 CREDENCIALES DEL ADMINISTRADOR:")
        print("="*50)
        print("Email:    admin@admingpro.com")
        print("Password: Admin123")
        print("Role:     admin")
        print("Plan:     max (AdminPro 100k)")
        print("="*50)
        print("\n⚡ El administrador tiene acceso completo:")
        print("  ✓ Eliminar registros")
        print("  ✓ Crear categorías")
        print("  ✓ Gestionar usuarios")
        print("  ✓ Todas las funciones premium")
        print("\n")
        
    except Exception as e:
        print(f"❌ Error al crear admin: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creando usuario administrador...\n")
    create_admin()
